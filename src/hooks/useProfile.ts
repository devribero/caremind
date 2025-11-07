import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { PerfisService } from '@/lib/supabase/services';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userProfile = await PerfisService.buscarPerfilPorUserId(user.id);
        setProfile(userProfile);
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const refreshProfile = async () => {
    if (!user) return null;
    
    try {
      setLoading(true);
      const userProfile = await PerfisService.buscarPerfilPorUserId(user.id);
      setProfile(userProfile);
      return userProfile;
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    if (!profile) return null;
    
    try {
      setLoading(true);
      const updatedProfile = await PerfisService.atualizarPerfil(profile.id, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
  };
}
