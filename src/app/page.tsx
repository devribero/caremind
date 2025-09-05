'use client'; 

import { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Header } from '@/components/headers/HeaderHome';
import styles from './page.module.css';    
import Link from 'next/link';

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
      
      <Header />

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
            <Link href="/login">
              <Button size="lg" className={styles.primaryButton}>
                Experimente Grátis
              </Button>
            </Link>
            <Button size="lg" variant="outline" className={styles.outlineButton}>
              Agendar Demonstração
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}