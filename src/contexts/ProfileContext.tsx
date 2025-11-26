'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { ProfileService, ProfilePreview, ProfileUpsertData } from '@/lib/supabase/profileService';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileContextType {
  profile: ProfilePreview | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileUpsertData> & { nome?: string }) => Promise<ProfilePreview | undefined>;
  updateProfilePhoto: (photoUrl: string) => Promise<boolean>;
  getMyElderly: () => Promise<ProfilePreview[]>;
  getFamilyMembersOfElderly: (elderlyProfileId: string) => Promise<ProfilePreview[]>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<ProfilePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Controle para evitar múltiplas requisições simultâneas
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 5000; // 5 segundos entre fetches

  const targetUserId = authUser?.id;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Evita múltiplas requisições simultâneas
    if (fetchingRef.current) {
      return;
    }

    // Evita requisições muito frequentes
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_FETCH_INTERVAL && profile) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      const userProfile = await ProfileService.getProfile(targetUserId);
      setProfile(userProfile);
      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      setError(err instanceof Error ? err : new Error('Falha ao carregar perfil'));
      setProfile(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [targetUserId, profile]);

  const updateProfile = useCallback(async (updates: Partial<ProfileUpsertData> & { nome?: string }) => {
    if (!targetUserId) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);

      const updateData: ProfileUpsertData = {
        user_id: targetUserId,
        nome: updates.nome ?? '',
        tipo: updates.tipo,
        data_nascimento: updates.data_nascimento ?? null,
        telefone: updates.telefone ?? null,
        foto_usuario: updates.foto_usuario ?? null,
        timezone: updates.timezone ?? null,
      };

      // Remove campos undefined para não sobrescrever com null no banco
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof ProfileUpsertData] === undefined) {
          delete updateData[key as keyof ProfileUpsertData];
        }
      });

      const updatedProfile = await ProfileService.upsertProfile(updateData);
      setProfile(updatedProfile);
      lastFetchRef.current = Date.now();
      return updatedProfile;
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  const updateProfilePhoto = useCallback(async (photoUrl: string): Promise<boolean> => {
    if (!targetUserId) return false;

    const success = await ProfileService.updateProfilePhoto(targetUserId, photoUrl);
    if (success) {
      // Força refresh após atualização de foto
      lastFetchRef.current = 0;
      await fetchProfile();
    }
    return success;
  }, [targetUserId, fetchProfile]);

  const getMyElderly = useCallback(async (): Promise<ProfilePreview[]> => {
    if (!targetUserId) return [];

    try {
      return await ProfileService.getMyElderly(targetUserId);
    } catch (err) {
      console.error('Erro ao carregar idosos vinculados:', err);
      return [];
    }
  }, [targetUserId]);

  const getFamilyMembersOfElderly = useCallback(async (elderlyProfileId: string): Promise<ProfilePreview[]> => {
    try {
      return await ProfileService.getFamilyMembersOfElderly(elderlyProfileId);
    } catch (err) {
      console.error('Erro ao carregar familiares do idoso:', err);
      return [];
    }
  }, []);

  // Fetch inicial quando o usuário muda
  useEffect(() => {
    if (targetUserId) {
      // Reset o controle de tempo para permitir fetch inicial
      lastFetchRef.current = 0;
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [targetUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<ProfileContextType>(() => ({
    profile,
    loading,
    error,
    refresh: fetchProfile,
    updateProfile,
    updateProfilePhoto,
    getMyElderly,
    getFamilyMembersOfElderly,
  }), [profile, loading, error, fetchProfile, updateProfile, updateProfilePhoto, getMyElderly, getFamilyMembersOfElderly]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext deve ser usado dentro de um ProfileProvider');
  }
  return context;
}

