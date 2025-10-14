'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import styles from './HeaderDashboard.module.css';
import { IoPersonCircleOutline } from "react-icons/io5";
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
    isMenuOpen: boolean;
    onMenuToggle: () => void;
}

export function Header({ isMenuOpen, onMenuToggle }: HeaderProps) {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // useCallback para estabilizar a função
    const fetchProfilePhoto = useCallback(async () => {
        if (!user) {
            setPhotoUrl(null);
            return;
        }

        try {
            // 1. Busca o caminho da foto na tabela 'perfis'
            const { data: profile, error } = await supabase
                .from('perfis')
                .select('foto_usuario')
                .eq('id', user.id)
                .single();

            // Se não encontrar o perfil ou não houver foto, não é um erro crítico
            if (error) {
                if (error.code !== 'PGRST116') {
                    console.error("Erro ao buscar perfil:", error.message);
                }
                setPhotoUrl(null);
                return;
            }

            // 2. Se houver um caminho, busca a URL pública no Storage
            if (profile?.foto_usuario) {
                const { data: publicUrlData } = supabase
                    .storage
                    .from('avatars')
                    .getPublicUrl(profile.foto_usuario);

                if (publicUrlData?.publicUrl) {
                    setPhotoUrl(publicUrlData.publicUrl);
                } else {
                    setPhotoUrl(null);
                }
            } else {
                setPhotoUrl(null);
            }
        } catch (error) {
            console.error("Erro inesperado ao buscar foto do perfil:", error);
            setPhotoUrl(null);
        }
    }, [user, supabase]);

    useEffect(() => {
        fetchProfilePhoto();
    }, [fetchProfilePhoto]);

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
                    {photoUrl ? (
                        <Image
                            src={photoUrl}
                            alt="Foto de perfil"
                            width={35}
                            height={35}
                            className={styles.profilePicture}
                            key={photoUrl}
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