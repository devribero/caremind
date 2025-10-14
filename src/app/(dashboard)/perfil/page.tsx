'use client'

import pageStyles from '@/app/(dashboard)/perfil/page.module.css';
import modalStyles from '@/app/(dashboard)/perfil/modal.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PasswordService, ChangePasswordData } from '@/lib/services/passwordService';

// --- DEFINIÇÃO DE TIPOS ---
interface PasswordData {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

interface ProfileDataType {
    fullName: string;
    email: string;
    phone: string;
    dob: string;
    photoUrl: string;
}

interface ChangePasswordModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (data: PasswordData) => void;
    loading: boolean; // Corrigido: Agora é obrigatório
}

// --- COMPONENTE MODAL DE ALTERAR SENHA ---

const ChangePasswordModal = ({ show, onClose, onSave, loading }: ChangePasswordModalProps) => {
    const [passwordData, setPasswordData] = useState<PasswordData>({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [error, setError] = useState<string>('');

    if (!show) {
        return null;
    }

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSaveClick = () => {
        if (!passwordData.currentPassword) {
            setError("Por favor, informe a senha atual");
            return;
        }
        if (!passwordData.newPassword) {
            setError("Por favor, informe a nova senha");
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setError("A nova senha deve ter pelo menos 6 caracteres");
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            setError("As novas senhas não coincidem!");
            return;
        }
        setError('');
        onSave(passwordData);
    };

    const handleClose = () => {
        setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: ''
        });
        setError('');
        onClose();
    };

    return (
        <div className={modalStyles.modalOverlay}>
            <div className={modalStyles.modalContent}>
                <h2 className={modalStyles.modalTitle}>Alterar Senha</h2>
                <span className={modalStyles.modalClose} onClick={handleClose}>&times;</span>
                
                {error && (
                    <div className={modalStyles.errorMessage}>
                        {error}
                    </div>
                )}

                <div className={modalStyles.formGroup}>
                    <label htmlFor="currentPassword" className={modalStyles.modalLabel}>Senha Atual</label>
                    <input 
                        type="password" 
                        id="currentPassword" 
                        name="currentPassword" 
                        className={modalStyles.modalInput} 
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        disabled={loading}
                    />
                </div>
                <div className={modalStyles.formGroup}>
                    <label htmlFor="newPassword" className={modalStyles.modalLabel}>Nova Senha</label>
                    <input 
                        type="password" 
                        id="newPassword" 
                        name="newPassword" 
                        className={modalStyles.modalInput} 
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        disabled={loading}
                    />
                </div>
                <div className={modalStyles.formGroup}>
                    <label htmlFor="confirmNewPassword" className={modalStyles.modalLabel}>Repetir Nova Senha</label>
                    <input 
                        type="password" 
                        id="confirmNewPassword" 
                        name="confirmNewPassword" 
                        className={modalStyles.modalInput} 
                        value={passwordData.confirmNewPassword}
                        onChange={handlePasswordChange}
                        disabled={loading}
                    />
                </div>
                <div className={modalStyles.modalActions}>
                    <button 
                        className={modalStyles.cancelButton} 
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button 
                        className={modalStyles.saveButton} 
                        onClick={handleSaveClick}
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DA PÁGINA DE PERFIL ---
export default function Perfil() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    
    
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false); 
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [passwordLoading, setPasswordLoading] = useState(false); 
    const [profileData, setProfileData] = useState<ProfileDataType>({
        fullName: '',
        email: '',
        phone: '',
        dob: '',
        photoUrl: '/foto_padrao.png'
    });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = usePersistentState<boolean>('ui.perfil.menuOpen', false);

    const fileInputRef = useRef<HTMLInputElement>(null); // ADICIONADO
    const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'avatars'; // ADICIONADO

    useEffect(() => {
        const fetchProfileData = async () => {
            if (user) {
                try {
                    // CORRIGIDO: Variáveis desestruturadas corretamente para evitar conflito de nome
                    const { data: profile, error: profileError } = await supabase
                        .from('perfis')
                        .select('nome, foto_usuario, telefone, data_nascimento') // Adicionei campos phone e dob
                        .eq('id', user.id)
                        .single();

                    if (profileError) throw profileError; // Corrigido: Usar profileError

                    if (profile) { 
                        setProfileData({
                            fullName: profile.nome || user.user_metadata?.full_name || '',
                            email: user.email || '',
                            phone: profile.telefone || '', 
                            dob: profile.data_nascimento || '', 
                            photoUrl: profile.foto_usuario || '/foto_padrao.png',
                        });
                    }
                } catch (error) {
                    console.error("Erro ao buscar dados do perfil:", error);
                   
                    setProfileData(prev => ({
                        ...prev,
                        fullName: user.user_metadata?.full_name || 'Nome não encontrado',
                        email: user.email || '',
                        photoUrl: '/foto_padrao.png',
                    }));
                }
            }
        };

        fetchProfileData();
    }, [user]);

    const handleLogout = async () => {
        await signOut();
        router.push('/auth');
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    // Função refatorada para centralizar o upload de foto
    const handleUploadButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        if (!user) {
            alert('Você precisa estar autenticado para enviar uma foto.');
            return;
        }

        const file = files[0];
        try {
            setUploadingPhoto(true);
            if (!BUCKET_NAME) {
                alert('Bucket do Storage não configurado. Defina NEXT_PUBLIC_SUPABASE_BUCKET no seu .env.local (ex.: avatars) e crie esse bucket no Supabase.');
                return;
            }
            // Gera um caminho único por usuário/timestamp
            const fileExt = file.name.split('.').pop();
            const filePath = `profiles/${user.id}/${Date.now()}.${fileExt}`;

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

            // Atualiza no banco a coluna foto_usuario
            const { error: updateError } = await supabase
                .from('perfis')
                .update({ foto_usuario: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Atualiza UI
            setProfileData(prev => ({ ...prev, photoUrl: publicUrl }));
            alert('Foto de perfil atualizada com sucesso!');
        } catch (err: any) {
            console.error('Erro ao enviar/atualizar foto:', err);
            if (err?.message?.toLowerCase?.().includes('bucket not found')) {
                alert(`Bucket não encontrado no Supabase. Verifique se o bucket "${BUCKET_NAME ?? ''}" existe e está público nas configurações de Storage.`);
            } else {
                alert('Não foi possível atualizar a foto de perfil.');
            }
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleEditProfile = async () => {
        if (!user) {
            alert("Erro: Usuário não encontrado.");
            return;
        }

        if (isEditing) {
            try {
                // Lógica de salvamento quando o isEditing é verdadeiro
                const { error } = await supabase
                    .from("perfis")
                    .update({
                        nome: profileData.fullName,
                        telefone: profileData.phone, // Adicionado
                        data_nascimento: profileData.dob, // Adicionado
                    })
                    .eq('id', user.id);

                if (error) throw error;
                alert('Perfil atualizado com sucesso!');
            } catch (error) {
                if (error instanceof Error) {
                    alert(`Erro ao salvar os dados: ${error.message}`);
                } else {
                    alert('Um erro inesperado ocorreu ao salvar o perfil.');
                }
            }
        }
        setIsEditing(!isEditing);
    };
    
    // CORREÇÃO: Implementação da lógica de salvar a nova senha
    const handleSavePassword = async (data: PasswordData) => {
        setPasswordLoading(true);
        try {
            const passwordService = new PasswordService(supabase);
            
            const changeData: ChangePasswordData = {
                currentPassword: data.currentPassword, 
                newPassword: data.newPassword 
            };
            
            // O serviço de senha deve lidar com a reautenticação se necessário
            const { error } = await passwordService.changePassword(changeData);

            if (error) {
                throw new Error(error.message || "Erro desconhecido ao mudar a senha.");
            }

            alert("Senha alterada com sucesso! Por segurança, você será desconectado para reautenticar.");
            
            // Desconecta o usuário após a mudança de senha, forçando um novo login com a nova senha
            await signOut();
            router.push('/auth');

        } catch (error) {
            console.error("Erro ao salvar senha:", error);
            if (error instanceof Error) {
                // Trata o erro de reautenticação (ex: senha atual incorreta)
                alert(`Erro ao alterar senha: ${error.message}`);
            } else {
                alert("Erro inesperado ao tentar alterar a senha.");
            }
        } finally {
            setPasswordLoading(false);
            // O modal só fecha se for para a tela de login ou se houver erro não-crítico
            // Se a senha foi salva, a navegação resolve o fechamento.
            if (!passwordLoading) setShowPasswordModal(false); 
        }
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <main className={pageStyles.main}>
            <div className={pageStyles.mainContent}>
                <div className={pageStyles.content}>
                    <div className={pageStyles.pageHeader}>
                        <h1 className={pageStyles.content_title}>Perfil</h1>
                    </div>
                    <section className={pageStyles.content_info}>
                        <div className={pageStyles.profileSection}>
                            <div className={pageStyles.profileHeader}>
                                <div className={pageStyles.profileInfo}>
                                        <div className={pageStyles.profilePhotoContainer}>
                                            <Image
                                                src={profileData.photoUrl}
                                                alt="Foto de Perfil"
                                                className={pageStyles.profilePhoto}
                                                width={80}
                                                height={80}
                                                key={profileData.photoUrl}
                                                onError={() => {
                                                    setProfileData(prev => ({ ...prev, photoUrl: '/foto_padrao.png' }));
                                                }}
                                            />
                                            <button 
                                                className={pageStyles.uploadPhotoButton} 
                                                onClick={handleUploadButtonClick}
                                                disabled={uploadingPhoto}
                                            >
                                                {uploadingPhoto ? (
                                                    <svg className={pageStyles.spinner} viewBox="0 0 50 50">
                                                        <circle className={pageStyles.path} cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 9V3H9V9H3V12H9V18H12V12H18V9H12Z" />
                                                    </svg>
                                                )}
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                style={{ display: 'none' }}
                                                accept="image/png, image/jpeg"
                                                disabled={uploadingPhoto}
                                            />
                                        </div>
                                        <div className={pageStyles.profileText}>
                                            <h1 className={pageStyles.profileName}>{profileData.fullName}</h1>
                                            <span className={pageStyles.profileEmail}>{profileData.email}</span>
                                        </div>
                                    </div>
                                    <div className={pageStyles.profileActions}>
                                        <button 
                                            className={pageStyles.actionButton} 
                                            onClick={() => setShowPasswordModal(true)}
                                            disabled={passwordLoading || uploadingPhoto}
                                        >
                                            Alterar Senha
                                        </button>
                                        <button className={pageStyles.actionButton}>Contatos</button>
                                        <button className={pageStyles.logoutButton} onClick={handleLogout}>Logout</button>
                                    </div>
                                </div>
                                <div className={pageStyles.infoCard}>
                                    <h2 className={pageStyles.cardTitle}>Informações do Perfil</h2>
                                    <div className={pageStyles.infoGrid}>
                                        <div className={pageStyles.infoField}>
                                            <label htmlFor="fullName" className={pageStyles.fieldLabel}>Nome Completo</label>
                                            <input
                                                type="text"
                                                id="fullName"
                                                name="fullName"
                                                value={profileData.fullName}
                                                onChange={handleInputChange}
                                                className={pageStyles.fieldInput}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                        <div className={pageStyles.infoField}>
                                            <label htmlFor="email" className={pageStyles.fieldLabel}>Email</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={profileData.email}
                                                className={pageStyles.fieldInput}
                                                disabled
                                            />
                                        </div>
                                        <div className={pageStyles.infoField}>
                                            <label htmlFor="phone" className={pageStyles.fieldLabel}>Telefone</label>
                                            <input
                                                type="text"
                                                id="phone"
                                                name="phone"
                                                value={profileData.phone}
                                                onChange={handleInputChange}
                                                className={pageStyles.fieldInput}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                        <div className={pageStyles.infoField}>
                                            <label htmlFor="dob" className={pageStyles.fieldLabel}>Data de Nascimento</label>
                                            <input
                                                type="date"
                                                id="dob"
                                                name="dob"
                                                value={profileData.dob}
                                                onChange={handleInputChange}
                                                className={pageStyles.fieldInput}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                    </div>
                                    <div className={pageStyles.editButtonContainer}>
                                        <button
                                            className={pageStyles.editProfileButton}
                                            onClick={handleEditProfile}
                                            disabled={uploadingPhoto || passwordLoading}
                                        >
                                            {isEditing ? 'Salvar Perfil' : 'Editar Perfil'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <ChangePasswordModal 
                                show={showPasswordModal} 
                                onClose={() => setShowPasswordModal(false)} 
                                onSave={handleSavePassword}
                                loading={passwordLoading}
                            />
                        </section>
                    </div>
                </div>
            </main>
        );
}