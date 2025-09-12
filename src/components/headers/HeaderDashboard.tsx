'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image'; 
import styles from './HeaderDashboard.module.css';
import { IoPersonCircleOutline } from "react-icons/io5";

// ===================================================================
// IMPORTANTE: Defina a interface para as props do menu principal
// ===================================================================
interface HeaderProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

// ===================================================================
// IMPORTANTE: Use a interface para receber as props
// ===================================================================
export function Header({ isMenuOpen, onMenuToggle }: HeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  // Lógica para o dropdown do perfil (separada do menu principal)
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
        {/* Este botão agora controla o Sidebar na página Dashboard */}
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

      {/* O dropdown do perfil continua funcionando com sua própria lógica */}
      <div className={styles.profileContainer} ref={profileMenuRef}>
        <div className={styles.actions} onClick={() => setIsProfileOpen(!isProfileOpen)}>
          <IoPersonCircleOutline className={styles.person} size={35}/>
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