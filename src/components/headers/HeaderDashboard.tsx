'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useIdoso } from '@/contexts/IdosoContext';
import Link from 'next/link';
import Image from 'next/image';
import styles from './HeaderDashboard.module.css';
import { IoPersonCircleOutline } from "react-icons/io5";

interface HeaderProps {
    isMenuOpen: boolean;
    onMenuToggle: () => void;
}

export function Header({ isMenuOpen, onMenuToggle }: HeaderProps) {
    const { user, signOut } = useAuth();
    const { photoUrl, refresh } = useProfile();
    const { listaIdososVinculados, idosoSelecionadoId, setIdosoSelecionado } = useIdoso();
    const router = useRouter();

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const lastErrorUrlRef = useRef<string | null>(null);

    // Atualiza a foto quando o usuário muda ou quando volta para a página
    useEffect(() => {
        const handleVisibilityChange = () => {
            // Só atualiza se a aba ficou oculta por mais de 5 segundos
            if (!document.hidden && Date.now() - (window as any).lastVisibilityChange > 5000) {
                refresh();
            }
            (window as any).lastVisibilityChange = Date.now();
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'profileUpdated') {
                refresh();
                localStorage.removeItem('profileUpdated');
            }
        };

        const handleProfilePhotoUpdate = () => {
            refresh();
        };

        // Só força refresh inicial se não houver foto em cache
        if (!photoUrl) {
            refresh();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('profilePhotoUpdated', handleProfilePhotoUpdate);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('profilePhotoUpdated', handleProfilePhotoUpdate);
        };
    }, [refresh, user?.id]);

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
                {(user?.user_metadata?.account_type === 'familiar' && listaIdososVinculados.length > 0) && (
                  <div style={{ marginLeft: 12 }}>
                    <select
                      value={idosoSelecionadoId ?? ''}
                      onChange={(e) => setIdosoSelecionado(e.target.value || null)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #ddd',
                        background: 'white',
                        minWidth: 200,
                      }}
                    >
                      {listaIdososVinculados.map((i) => (
                        <option key={i.id} value={i.id}>{i.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
            </div>

            <div className={styles.profileContainer} ref={profileMenuRef}>
                <div className={styles.actions} onClick={() => setIsProfileOpen(!isProfileOpen)}>
                    {photoUrl ? (
                        <Image
                            src={photoUrl}
                            alt="Foto de perfil"
                            width={40}
                            height={40}
                            className={styles.profilePicture}
                            key={photoUrl}
                            priority
                            loading="eager"
                            onError={() => {
                                if (lastErrorUrlRef.current !== photoUrl) {
                                    lastErrorUrlRef.current = photoUrl;
                                    refresh();
                                }
                            }}
                        />
                    ) : (
                        <IoPersonCircleOutline className={styles.person} size={35} />
                    )}
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