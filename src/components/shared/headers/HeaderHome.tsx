import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import styles from './HeaderHome.module.css';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // Função de Scroll Manual Lento (Cinematográfico)
  const smoothScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    closeMenu();

    const target = document.getElementById(targetId.replace('#', ''));
    if (!target) return;

    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition - 100; // -100 para compensar o header
    const duration = 1500; // 1.5 segundos (Scroll Lento)
    let start: number | null = null;

    const animation = (currentTime: number) => {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;

      // Função de Easing (easeInOutCubic) para suavidade
      const ease = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const run = ease(timeElapsed / duration);
      window.scrollTo(0, startPosition + distance * run);

      if (timeElapsed < duration) requestAnimationFrame(animation);
    };

    requestAnimationFrame(animation);
  };

  return (
    <header className={styles.header}>
      <div className={styles.header__container}>
        {/* Logo */}
        <Link href="/" className={styles.header__logo}>
          <Image
            src="/icons/logo.png"
            alt="CareMind Logo"
            width={180}
            height={57}
            priority
            style={{
              width: 'auto',
              height: 'auto',
            }}
          />
        </Link>

        {/* Navegação Desktop */}
        <nav className={styles.header__nav_desktop}>
          <Link className={styles.header__nav_desktop_item} href="#funcionalidades" onClick={(e) => smoothScrollTo(e, '#funcionalidades')}>Funcionalidades</Link>
          <Link className={styles.header__nav_desktop_item} href="#como-funciona" onClick={(e) => smoothScrollTo(e, '#como-funciona')}>Como Funciona</Link>
          <Link className={styles.header__nav_desktop_item} href="#depoimentos" onClick={(e) => smoothScrollTo(e, '#depoimentos')}>Depoimentos</Link>
          <Link href="/auth" className={`${styles.btn} ${styles.btn_primary}`}>
            Área do Cliente
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
          <Link href="#funcionalidades" onClick={(e) => smoothScrollTo(e, '#funcionalidades')}>Funcionalidades</Link>
          <Link href="#como-funciona" onClick={(e) => smoothScrollTo(e, '#como-funciona')}>Como Funciona</Link>
          <Link href="#depoimentos" onClick={(e) => smoothScrollTo(e, '#depoimentos')}>Depoimentos</Link>
          <Link href="/auth" className={`${styles.btn} ${styles.btn_primary}`} onClick={closeMenu}>
            Área do cliente
          </Link>
        </nav>
      </div>
    </header>
  );
}