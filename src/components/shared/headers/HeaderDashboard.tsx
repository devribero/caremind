'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
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
    const { profile, refresh } = useProfile();
    const { listaIdososVinculados, idosoSelecionadoId, setIdosoSelecionado } = useIdoso();
    const router = useRouter();
    const pathname = usePathname();

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const [elderOpen, setElderOpen] = useState(false);
    const elderRef = useRef<HTMLDivElement>(null);
    const lastErrorUrlRef = useRef<string | null>(null);

    const accountTypeRaw = (profile?.tipo || user?.user_metadata?.account_type) as string | undefined;
    const isFamiliar = (accountTypeRaw || '').toString().toLowerCase() === 'familiar';

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
        if (!profile?.foto_usuario) {
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
            if (elderRef.current && !elderRef.current.contains(event.target as Node)) {
                setElderOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const displayName = user?.user_metadata?.full_name || user?.email;

    // Constrói a URL do avatar
    const avatarUrl = useMemo(() => {
        if (!profile?.foto_usuario) return null;

        const path = profile.foto_usuario;

        // Se já é uma URL completa, retorna como está
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }

        // Se é um caminho absoluto local, retorna como está
        if (path.startsWith('/')) {
            return path;
        }

        // Se é um caminho relativo do storage, constrói manualmente a URL pública
        // Formato: https://[PROJECT_URL]/storage/v1/object/public/[BUCKET]/[PATH]
        const supabaseUrl = 'https://njxsuqvqaeesxmoajzyb.supabase.co';
        const bucketName = 'avatars';
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;

        return publicUrl;
    }, [profile?.foto_usuario]);

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
                {(isFamiliar && listaIdososVinculados.length > 0) && (
                    <div className={styles.elderWrap} ref={elderRef}>
                        <span className={styles.elderLabel}>Idoso:</span>
                        <div className={styles.elderSelectWrapper}>
                            <button
                                type="button"
                                className={styles.elderButton}
                                onClick={() => setElderOpen((v) => !v)}
                                aria-haspopup="listbox"
                                aria-expanded={elderOpen}
                                aria-label="Selecionar idoso"
                            >
                                {listaIdososVinculados.find(i => i.id === idosoSelecionadoId)?.nome || 'Selecionar'}
                            </button>
                            <span className={styles.elderCaret} />
                            {elderOpen && (
                                <div className={styles.elderMenu} role="listbox" aria-label="Lista de idosos">
                                    {listaIdososVinculados.length === 0 ? (
                                        <div className={styles.elderEmpty}>Nenhum idoso</div>
                                    ) : (
                                        listaIdososVinculados.map((i) => (
                                            <div
                                                key={i.id}
                                                role="option"
                                                aria-selected={i.id === idosoSelecionadoId}
                                                className={styles.elderOption}
                                                onClick={() => { 
                                                    setIdosoSelecionado(i.id); 
                                                    setElderOpen(false);
                                                    // Força refresh da página para atualizar os dados do novo idoso
                                                    router.refresh();
                                                }}
                                            >
                                                {i.nome}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Ações contextuais removidas do Header. As ações principais ficam acima do conteúdo da página. */}

            <div className={styles.profileContainer} ref={profileMenuRef}>
                <div className={styles.actions} onClick={() => setIsProfileOpen(!isProfileOpen)}>
                    {avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('/')) ? (
                        <Image
                            src={avatarUrl}
                            alt="Foto de perfil"
                            width={40}
                            height={40}
                            className={styles.profilePicture}
                            key={avatarUrl}
                            priority
                            loading="eager"
                            onError={(e) => {
                                // Em caso de erro, mostra o fallback
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
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