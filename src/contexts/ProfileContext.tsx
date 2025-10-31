'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: string;
  nome?: string | null;
  tipo?: string | null;
  foto_usuario?: string | null; // path in storage
}

interface ProfileContextValue {
  profile: Profile | null;
  photoUrl: string | null; // public URL
  loading: boolean;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const computePublicUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, [supabase]);

  const fetchOrCreateProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setPhotoUrl(null);
      return;
    }

    // Verifica cache primeiro
    const cacheKey = `profile_${user.id}`;
    const cachedProfile = typeof window !== 'undefined' ? 
      sessionStorage.getItem(cacheKey) : null;
    
    if (cachedProfile) {
      try {
        const parsedProfile = JSON.parse(cachedProfile);
        setProfile(parsedProfile);
        setPhotoUrl(computePublicUrl(parsedProfile?.foto_usuario ?? null));
        return;
      } catch (e) {
        // Se cache estiver corrompido, limpa e continua
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(cacheKey);
        }
      }
    }

    setLoading(true);
    try {
      // tenta buscar
      const { data, error } = await supabase
        .from('perfis')
        .select('id, user_id, nome, tipo, foto_usuario')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // PGRST116 => not found
        if ((error as any).code === 'PGRST116') {
          // não criar automaticamente; deixar perfil nulo
          setProfile(null);
          setPhotoUrl(null);
        } else {
          throw error;
        }
      } else {
        setProfile(data as Profile);
        setPhotoUrl(computePublicUrl((data as any)?.foto_usuario ?? null));
        
        // Cache do perfil
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      }
    } catch (e) {
      console.error('ProfileProvider: erro ao obter perfil', e);
      setProfile(null);
      setPhotoUrl(null);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, computePublicUrl]);

  useEffect(() => {
    fetchOrCreateProfile();
  }, [fetchOrCreateProfile]);

  // Listener para mudanças no localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      if (user?.id) {
        fetchOrCreateProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.id, fetchOrCreateProfile]);

  // Ouve eventos internos para atualização imediata da foto do perfil
  useEffect(() => {
    const handleProfilePhotoUpdated = (e: any) => {
      const newUrl: string | undefined = e?.detail?.photoUrl;
      if (!newUrl) {
        fetchOrCreateProfile();
        return;
      }
      const cacheBusted = `${newUrl}${newUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
      setPhotoUrl(cacheBusted);

      // Atualiza cache do perfil se existir
      if (user?.id && typeof window !== 'undefined') {
        const cacheKey = `profile_${user.id}`;
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.foto_usuario = newUrl;
            sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
          }
        } catch {}
      }
    };

    window.addEventListener('profilePhotoUpdated', handleProfilePhotoUpdated as any);
    return () => window.removeEventListener('profilePhotoUpdated', handleProfilePhotoUpdated as any);
  }, [user?.id, fetchOrCreateProfile]);

  const value: ProfileContextValue = useMemo(() => ({
    profile,
    photoUrl,
    loading,
    refresh: fetchOrCreateProfile,
  }), [profile, photoUrl, loading, fetchOrCreateProfile]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile deve ser usado dentro de ProfileProvider');
  return ctx;
}
