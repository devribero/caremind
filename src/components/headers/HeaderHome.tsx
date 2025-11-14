import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import styles from './HeaderHome.module.css'; // Supondo que o CSS está em um module

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    // A tag <header> é mais semântica para o cabeçalho
    <header className={styles.header}>
      <div className={styles.header__container}>
        {/* Logo */}
        <Link href="/" className={styles.header__logo}>
          <Image 
            src="/logo_coracao.png" 
            alt="CareMind Logo" 
            width={180} 
            height={57} 
            priority 
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </Link>

        {/* Navegação Desktop */}
        <nav className={styles.header__nav_desktop}>
          <a className={styles.header__nav_desktop_item} href="#">Funcionalidades</a>
          <a className={styles.header__nav_desktop_item} href="#">Como Funciona</a>
          <a className={styles.header__nav_desktop_item} href="#">Para Famílias</a>
          <Link href="/auth" className={`${styles.btn} ${styles.btn_primary}`}>
            Área do cliente
          </Link>
        </nav>

        {/* Botão Hambúrguer */}
        <button
          className={`${styles.hamburger} ${isMenuOpen ? styles.active : ''}`}
          onClick={toggleMenu}
          aria-label="Abrir menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Overlay */}
      <div
        className={`${styles.menu_overlay} ${isMenuOpen ? styles.active : ''}`}
        onClick={closeMenu}
      ></div>

      {/* Menu Mobile */}
      <div className={`${styles.mobile_menu} ${isMenuOpen ? styles.active : ''}`}>
        {/* Botão de fechar */}
        <button 
          className={styles.close_button}
          onClick={closeMenu}
          aria-label="Fechar menu"
        >
          ×
        </button>
        
        <nav className={styles.mobile_menu__nav}>
          <a href="#" onClick={closeMenu}>Funcionalidades</a>
          <a href="#" onClick={closeMenu}>Como Funciona</a>
          <a href="#" onClick={closeMenu}>Para Famílias</a>
          <Link href="/auth" className={`${styles.btn} ${styles.btn_primary}`} onClick={closeMenu}>
            Área do cliente
          </Link>
        </nav>
      </div>
    </header>
  );
}