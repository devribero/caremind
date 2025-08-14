'use client'; // Adicione isso no topo se estiver usando Next.js 13+

import { useState } from 'react';
import { Button } from "@/components/ui/button"
import styles from './page.module.css';    
import Image from 'next/image'; 

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <ul className={styles.header_list}>
          <div className={styles.header_image}>
            <li>
              <a href="#">
                <Image src="/logo.png" alt="Minha logo" width={200} height={63} />
              </a>
            </li>
          </div>
          
          {/* Menu Desktop */}
          <div className={styles.header_text}>
            <li><a className={styles.header_a} href="#">Funcionalidades</a></li>
            <li><a className={styles.header_a} href="#">Como Funciona</a></li>
            <li><a className={styles.header_a} href="#">Para Famílias</a></li>
            <li><a className={styles.header_btn} href="#">Começar agora</a></li>
          </div>

          {/* Hambúrguer Button */}
          <div 
            className={`${styles.hamburger} ${isMenuOpen ? styles.active : ''}`}
            onClick={toggleMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
        </ul>
      </div>

      {/* Overlay */}
      <div 
        className={`${styles.menu_overlay} ${isMenuOpen ? styles.active : ''}`}
        onClick={closeMenu}
      ></div>

      {/* Menu Mobile */}
      <div className={`${styles.mobile_menu} ${isMenuOpen ? styles.active : ''}`}>
        <ul className={styles.mobile_menu_list}>
          <li><a className={styles.mobile_menu_item} href="#" onClick={closeMenu}>Funcionalidades</a></li>
          <li><a className={styles.mobile_menu_item} href="#" onClick={closeMenu}>Como Funciona</a></li>
          <li><a className={styles.mobile_menu_item} href="#" onClick={closeMenu}>Para Famílias</a></li>
          <li><a className={styles.mobile_menu_btn} href="#" onClick={closeMenu}>Começar agora</a></li>
        </ul>
      </div>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.logoWrapper}>
            <img src="/logo.png" alt="CareMind Logo" className={styles.logo} />
          </div>
          <h1 className={styles.title}>
            Cuidado Inteligente para Quem Você Ama
          </h1>
          <p className={styles.description}>
            Assistente virtual com integração por voz para auxiliar idosos no gerenciamento de medicações e rotinas diárias. 
            Mais autonomia para eles, mais tranquilidade para a família.
          </p>
          <div className={styles.buttonGroup}>
            <Button size="lg" className={styles.primaryButton}>
              Experimente Grátis
            </Button>
            <Button size="lg" variant="outline" className={styles.outlineButton}>
              Agendar Demonstração
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}