'use client';

import Link from 'next/link';
import styles from './HeaderLogin.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.profileContainer}>
        <Link href="/" className={styles.actions}>
          <span className={styles.welcomeText}>
            Voltar ao Início
          </span>
        </Link>
      </div>
    </header>
  );
}