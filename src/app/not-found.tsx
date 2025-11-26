'use client';

import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.errorCode}>404</div>
        <h1 className={styles.title}>Página não encontrada</h1>
        <p className={styles.description}>
          Ops! Parece que você se perdeu. A página que você está procurando não existe ou foi movida.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primaryButton}>
            Voltar ao início
          </Link>
          <Link href="/dashboard" className={styles.secondaryButton}>
            Ir para o Dashboard
          </Link>
        </div>
        <div className={styles.illustration}>
          <svg viewBox="0 0 200 200" className={styles.svg}>
            <circle cx="100" cy="100" r="80" fill="#f0f4ff" />
            <path
              d="M60 90 Q100 60 140 90"
              stroke="#0400BA"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="70" cy="80" r="8" fill="#0400BA" />
            <circle cx="130" cy="80" r="8" fill="#0400BA" />
            <path
              d="M70 130 Q100 110 130 130"
              stroke="#0400BA"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

