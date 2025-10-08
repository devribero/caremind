'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import styles from './HeaderDashboard.module.css';
import { IoPersonCircleOutline } from "react-icons/io5";
import { createClient } from '@/lib/supabase/client'; // NOVO: Importar o createClient

interface HeaderProps {
    isMenuOpen: boolean;
    onMenuToggle: () => void;
}

export function Header({ isMenuOpen, onMenuToggle }: HeaderProps) {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const supabase = createClient(); // NOVO: Instanciar o Supabase client

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    // NOVO: Estado para armazenar a URL da foto do perfil
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // NOVO: useEffect para buscar a foto do perfil do usuário
    useEffect(() => {
        const fetchProfilePhoto = async () => {
            if (user) {
                try {
                    // 1. Busca o caminho da foto na sua tabela 'perfis'
                    const { data: profile, error } = await supabase
                        .from('perfis')
                        .select('foto_usuario')
                        .eq('id', user.id)
                        .single();

                    if (error) throw error;

                    // 2. Se houver um caminho, busca a URL pública no Storage
                    if (profile && profile.foto_usuario) {
                        const { data: publicUrlData } = supabase
                            .storage
                            .from('avatars') // Nome do seu bucket
                            .getPublicUrl(profile.foto_usuario);

                        if (publicUrlData) {
                            setPhotoUrl(publicUrlData.publicUrl);
                        }
                    }
                } catch (error) {
                    console.error("Erro ao buscar foto do perfil:", error);
                    setPhotoUrl(null); // Garante que o ícone seja mostrado em caso de erro
                }
            }
        };

        fetchProfilePhoto();
    }, [user, supabase]); // Executa sempre que o usuário mudar

    const handleLogout = async () => {
        await signOut();
        router.push('/');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const displayName = user?.user_metadata?.full_name || user?.email;

    return (
        <header className={styles.header}>
            <div className={styles.headerLeft}>
                <button
                    className={`${styles.hamburger} ${isMenuOpen ? styles.active : ''}`}
                    onClick={onMenuToggle}
                    aria-label="Abrir menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <Link href="/" className={styles.header__logo}>
                    <Image src="/logo.png" alt="CareMind Logo" width={200} height={63} priority />
                </Link>
            </div>

            <div className={styles.profileContainer} ref={profileMenuRef}>
                <div className={styles.actions} onClick={() => setIsProfileOpen(!isProfileOpen)}>

                    {/* LÓGICA ALTERADA: Renderização condicional da foto ou ícone */}
                    {photoUrl ? (
                        <Image
                            src={photoUrl}
                            alt="Foto de perfil"
                            width={35}
                            height={35}
                            className={styles.profilePicture} // Classe para deixar a foto redonda
                            key={photoUrl} // Ajuda a recarregar a imagem se a URL mudar
                        />
                    ) : (
                        <IoPersonCircleOutline className={styles.person} size={35} />
                    )}

                    <p className={styles.welcomeText}>
                        {displayName}
                    </p>
                </div>

                {isProfileOpen && (
                    <div className={styles.dropdownMenu}>
                        <Link href="/perfil" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>
                            Perfil
                        </Link>
                        <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.dropdownLogout}`}>
                            Sair
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}