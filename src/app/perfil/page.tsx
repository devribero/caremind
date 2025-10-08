'use client'

import { Header } from '@/components/headers/HeaderDashboard';
import pageStyles from '@/app/perfil/page.module.css';
import modalStyles from '@/app/perfil/modal.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PasswordService, ChangePasswordData } from '@/lib/services/passwordService';

// --- DEFINIÇÃO DE TIPOS ---
interface PasswordData {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

interface ChangePasswordModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (data: PasswordData) => void;
    loading?: boolean;
}

// --- COMPONENTE MODAL DE ALTERAR SENHA ---

const ChangePasswordModal = ({ show, onClose, onSave }: ChangePasswordModalProps) => {
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
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        phone: '',
        dob: '',
        photoUrl: '/foto_padrao.png'
    });
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (user) {
                try {
                    const { data: profile, error: profileError } = await supabase
                        .from('perfis')
                        .select('nome, foto_usuario')
                        .eq('id', user.id)
                        .single();

                    if (error) throw error;

                    if (data) {
                        setProfileData({
                            fullName: data.nome || user.user_metadata?.full_name || '',
                            email: user.email || '',
                            phone: '', // Preencher se/quando buscar da tabela
                            dob: '',   // Preencher se/quando buscar da tabela
                            photoUrl: data.foto_usuario || '/foto_padrao.png',
                        });
                    }
                } catch (error) {
                    console.error("Erro ao buscar dados do perfil:", error);
                    // Define dados básicos em caso de erro para não quebrar a UI
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
        router.push('/login');
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoSelected = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
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
            // Gera um caminho único por usuário
            const fileExt = file.name.split('.').pop();
            const filePath = `profiles/${user.id}/${Date.now()}.${fileExt}`;

            // Faz upload para o bucket público
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
            // limpa o input para permitir re-seleção do mesmo arquivo
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
                const { error } = await supabase
                    .from("perfis")
                    .update({
                        nome: profileData.fullName,
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

    const handleSavePassword = async (data: PasswordData) => {
        console.log('Dados de senha para salvar:', data);
    };

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    // NOVO: Função para disparar o clique no input de arquivo
    const handleUploadButtonClick = () => {
        fileInputRef.current?.click();
    };

    // NOVO: Função para lidar com a seleção e upload do arquivo
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        const file = event.target.files[0];
        if (!user) {
            alert("Você precisa estar logado para enviar uma foto.");
            return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `profiles/${user.id}/${fileName}`;

        try {
            // 1. Faz o upload para o Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars') // Nome do seu bucket
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Atualiza a coluna 'foto_usuario' na tabela 'perfis'
            const { error: updateError } = await supabase
                .from('perfis')
                .update({ foto_usuario: filePath })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 3. Atualiza a URL da foto no estado local para refletir a mudança na tela
            const { data: publicUrlData } = supabase
                .storage
                .from('avatars')
                .getPublicUrl(filePath);

            if (publicUrlData) {
                setProfileData(prev => ({ ...prev, photoUrl: publicUrlData.publicUrl }));
            }

            alert("Foto de perfil atualizada com sucesso!");

        } catch (error) {
            console.error("Erro ao enviar a foto:", error);
            if (error instanceof Error) {
                alert(`Não foi possível enviar a foto: ${error.message}`);
            }
        }
    };

    return (
        <main className={pageStyles.main}>
            <Header isMenuOpen={isMenuOpen} onMenuToggle={toggleMenu} />
            <Sidebar isOpen={isMenuOpen} onClose={closeMenu} />
            <div className={`${isMenuOpen ? pageStyles.contentPushed : ''} ${pageStyles.mainContent}`}>
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
                                        <button className={styles.uploadPhotoButton}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 9V3H9V9H3V12H9V18H12V12H18V9H12Z" />
                                            </svg>
                                        </button>
                                        {/* NOVO: Input de arquivo escondido */}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            accept="image/png, image/jpeg"
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
                                        disabled={passwordLoading}
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
