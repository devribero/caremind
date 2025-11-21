import { useState, useCallback, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/features/Toast';

export const useProfileManagement = () => {
  const { profile, updateProfile, updateProfilePhoto, loading, error, refresh } = useProfile();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push('/auth');
  }, [signOut, router]);

  const handleSaveProfile = useCallback(async (data: { fullName: string; phone: string; dob: string; timezone: string }) => {
    if (!profile) return false;

    try {
      await updateProfile({
        nome: data.fullName,
        telefone: data.phone,
        data_nascimento: data.dob,
        timezone: data.timezone,
      });
      
      // Dispara evento para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { 
          fullName: data.fullName,
          phone: data.phone,
          dob: data.dob,
          timezone: data.timezone,
        } 
      }));
      
      toast.success('Perfil atualizado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao atualizar o perfil. Tente novamente.');
      return false;
    }
  }, [profile, updateProfile]);

  const handleUploadButtonClick = useCallback((fileInputRef: React.RefObject<HTMLInputElement>) => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !profile) return;

    const file = files[0];
    const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'avatars';

    try {
      setUploadingPhoto(true);
      
      // Gera um caminho único por usuário/timestamp
      const fileExt = file.name.split('.').pop();
      const filePath = `profiles/${profile.id}/${Date.now()}.${fileExt}`;

      // Faz upload para o bucket
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obtém URL pública
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      // Atualiza a foto do perfil
      await updateProfilePhoto(publicUrl);
      
      // Atualiza a UI
      refresh();
      
      // Notifica outros componentes
      window.dispatchEvent(new CustomEvent('profilePhotoUpdated', { 
        detail: { photoUrl: publicUrl } 
      }));
      
      toast.success('Foto de perfil atualizada com sucesso!');
    } catch (err) {
      console.error('Erro ao enviar/atualizar foto:', err);
      toast.error('Erro ao atualizar a foto de perfil.');
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
    }
  }, [profile, updateProfilePhoto, refresh]);

  const handleSavePassword = useCallback(async (data: { currentPassword: string; newPassword: string }) => {
    if (!profile) return;
    
    setPasswordLoading(true);
    try {
      // Atualiza a senha usando o Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso! Por segurança, você será desconectado.');
      
      // Desconecta o usuário após a mudança de senha
      await signOut();
      router.push('/auth');
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.message || 'Erro ao alterar a senha. Tente novamente.');
      throw error;
    } finally {
      setPasswordLoading(false);
    }
  }, [profile, signOut, router]);

  return {
    profile: profile ? {
      fullName: profile.nome || '',
      email: user?.email || '',
      phone: profile.telefone || '',
      dob: profile.data_nascimento || '',
      timezone: profile.timezone || 'America/Sao_Paulo',
      photoUrl: profile.foto_usuario || '/icons/foto_padrao.png',
    } : null,
    loading,
    error,
    uploadingPhoto,
    passwordLoading,
    showPasswordModal,
    showEditModal,
    setShowPasswordModal,
    setShowEditModal,
    handleLogout,
    handleSaveProfile,
    handleUploadButtonClick,
    handleFileChange,
    handleSavePassword,
  };
};
