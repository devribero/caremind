'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
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

  const computePublicUrl = (path: string | null | undefined) => {
    if (!path) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  const fetchOrCreateProfile = async () => {
    if (!user) {
      setProfile(null);
      setPhotoUrl(null);
      return;
    }
    setLoading(true);
    try {
      // tenta buscar
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, tipo, foto_usuario')
        .eq('id', user.id)
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
      }
    } catch (e) {
      console.error('ProfileProvider: erro ao obter perfil', e);
      setProfile(null);
      setPhotoUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // sempre que trocar o usuário, refaz
    fetchOrCreateProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value: ProfileContextValue = {
    profile,
    photoUrl,
    loading,
    refresh: fetchOrCreateProfile,
  };

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
