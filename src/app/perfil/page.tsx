'use client'

import { Header } from '@/components/headers/HeaderDashboard';
import styles from '@/app/perfil/page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
}

// --- COMPONENTE MODAL DE ALTERAR SENHA ---

const ChangePasswordModal = ({ show, onClose, onSave }: ChangePasswordModalProps) => {
    const [passwordData, setPasswordData] = useState<PasswordData>({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    if (!show) {
        return null;
    }

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handleSavePassword = () => {
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            alert("As novas senhas não coincidem!");
            return;
        }
        onSave(passwordData);
        onClose();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>Alterar Senha</h2>
                <span className={styles.modalClose} onClick={onClose}>&times;</span>
                <div className={styles.formGroup}>
                    <label htmlFor="currentPassword" className={styles.modalLabel}>Senha Atual</label>
                    <input type="password" id="currentPassword" name="currentPassword" className={styles.modalInput} onChange={handlePasswordChange} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="newPassword" className={styles.modalLabel}>Nova Senha</label>
                    <input type="password" id="newPassword" name="newPassword" className={styles.modalInput} onChange={handlePasswordChange} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="confirmNewPassword" className={styles.modalLabel}>Repetir Nova Senha</label>
                    <input type="password" id="confirmNewPassword" name="confirmNewPassword" className={styles.modalInput} onChange={handlePasswordChange} />
                </div>
                <div className={styles.modalActions}>
                    <button className={styles.cancelButton} onClick={onClose}>Cancelar</button>
                    <button className={styles.saveButton} onClick={handleSavePassword}>Salvar</button>
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
        photoUrl: '/foto_padrao.png' // Inicia com a foto padrão
    });
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (user) {
                try {
                    const { data, error } = await supabase
                        .from('perfis')
                        .select('nome, foto_usuario') // Seleciona as colunas necessárias
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
                    setProfileData(prev => ({
                        ...prev,
                        fullName: user.user_metadata?.full_name || '',
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
        router.push('/');
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileData(prevData => ({
            ...prevData,
            [name]: value,
        }));
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
                        // ALERTA: Para salvar telefone e data de nasc., adicione as colunas na tabela
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

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    return (
        <main className={styles.main}>
            <Header isMenuOpen={isMenuOpen} onMenuToggle={toggleMenu} />
            <Sidebar isOpen={isMenuOpen} onClose={closeMenu} />
            <div className={`${isMenuOpen ? styles.contentPushed : ''} ${styles.mainContent}`}>
                <div className={styles.content}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.content_title}>Perfil</h1>
                    </div>

                    <section className={styles.content_info}>
                        <div className={styles.profileSection}>
                            <div className={styles.profileHeader}>
                                <div className={styles.profileInfo}>
                                    <div className={styles.profilePhotoContainer}>
                                        <Image
                                            src={profileData.photoUrl}
                                            alt="Foto de Perfil"
                                            className={styles.profilePhoto}
                                            width={80}
                                            height={80}
                                            onError={() => {
                                                setProfileData(prev => ({ ...prev, photoUrl: '/foto_padrao.png' }));
                                            }}
                                        />
                                        <button className={styles.uploadPhotoButton}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 9V3H9V9H3V12H9V18H12V12H18V9H12Z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className={styles.profileText}>
                                        <h1 className={styles.profileName}>{profileData.fullName}</h1>
                                        <span className={styles.profileEmail}>{profileData.email}</span>
                                    </div>
                                </div>
                                <div className={styles.profileActions}>
                                    <button className={styles.actionButton} onClick={() => setShowPasswordModal(true)}>Alterar Senha</button>
                                    <button className={styles.actionButton}>Contatos</button>
                                    <button className={styles.logoutButton} onClick={handleLogout}>Logout</button>
                                </div>
                            </div>

                            <div className={styles.infoCard}>
                                <h2 className={styles.cardTitle}>Informações do Perfil</h2>
                                <div className={styles.infoGrid}>
                                    <div className={styles.infoField}>
                                        <label htmlFor="fullName" className={styles.fieldLabel}>Nome Completo</label>
                                        <input
                                            type="text"
                                            id="fullName"
                                            name="fullName"
                                            value={profileData.fullName}
                                            onChange={handleInputChange}
                                            className={styles.fieldInput}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    <div className={styles.infoField}>
                                        <label htmlFor="email" className={styles.fieldLabel}>Email</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={profileData.email}
                                            onChange={handleInputChange}
                                            className={styles.fieldInput}
                                            disabled
                                        />
                                    </div>
                                    <div className={styles.infoField}>
                                        <label htmlFor="phone" className={styles.fieldLabel}>Telefone</label>
                                        <input
                                            type="text"
                                            id="phone"
                                            name="phone"
                                            value={profileData.phone}
                                            onChange={handleInputChange}
                                            className={styles.fieldInput}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    <div className={styles.infoField}>
                                        <label htmlFor="dob" className={styles.fieldLabel}>Data de Nascimento</label>
                                        <input
                                            type="date"
                                            id="dob"
                                            name="dob"
                                            value={profileData.dob}
                                            onChange={handleInputChange}
                                            className={styles.fieldInput}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>
                                <div className={styles.editButtonContainer}>
                                    <button
                                        className={styles.editProfileButton}
                                        onClick={handleEditProfile}
                                    >
                                        {isEditing ? 'Salvar Perfil' : 'Editar Perfil'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <ChangePasswordModal show={showPasswordModal} onClose={() => setShowPasswordModal(false)} onSave={handleSavePassword} />
                    </section>
                </div>
            </div>
        </main>
    );
}