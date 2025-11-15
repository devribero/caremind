import React from 'react';
import Image from 'next/image';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <Image
          src="/logo_coracao.png"
          alt="CareMind Logo"
          width={150}
          height={40}
          priority
        />
      </div>
    </header>
  );
}
