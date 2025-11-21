// src/hooks/useProfile.ts

import { useState, useEffect, useCallback } from 'react';
import { ProfileService, ProfilePreview, ProfileUpsertData } from '@/lib/supabase/profileService';
import { useAuth } from '@/contexts/AuthContext';

export const useProfile = (userId?: string) => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<ProfilePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserId = userId || authUser?.id;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userProfile = await ProfileService.getProfile(targetUserId);
      setProfile(userProfile);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      setError(err instanceof Error ? err : new Error('Falha ao carregar perfil'));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  const updateProfile = async (updates: Partial<ProfileUpsertData> & { nome?: string }) => {
    if (!targetUserId) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);

      const updateData: ProfileUpsertData = {
        user_id: targetUserId!,
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
      return updatedProfile;
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfilePhoto = async (photoUrl: string): Promise<boolean> => {
    if (!targetUserId) return false;

    const success = await ProfileService.updateProfilePhoto(targetUserId, photoUrl);
    if (success) {
      await fetchProfile(); // Recarrega com a nova foto
    }
    return success;
  };

  // Agora usamos o método correto: getMyElderly (só familiares logam)
  const getMyElderly = useCallback(async (): Promise<ProfilePreview[]> => {
    if (!targetUserId) return [];

    try {
      return await ProfileService.getMyElderly(targetUserId);
    } catch (err) {
      console.error('Erro ao carregar idosos vinculados:', err);
      return [];
    }
  }, [targetUserId]);

  // Se precisar buscar familiares de um idoso específico (ex: tela de detalhes)
  const getFamilyMembersOfElderly = async (elderlyProfileId: string): Promise<ProfilePreview[]> => {
    try {
      return await ProfileService.getFamilyMembersOfElderly(elderlyProfileId);
    } catch (err) {
      console.error('Erro ao carregar familiares do idoso:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile,
    updateProfile,
    updateProfilePhoto,
    getMyElderly,                    // ← Novo nome (mais claro)
    getFamilyMembersOfElderly,       // ← Para tela de detalhes do idoso
  };
};

export type UseProfileReturn = ReturnType<typeof useProfile>;