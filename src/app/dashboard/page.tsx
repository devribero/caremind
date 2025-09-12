'use client';

import { useState } from 'react';
import { Header } from '@/components/headers/HeaderDashboard';
import { DashboardClient } from '@/components/DashboardClient'
import { Sidebar } from '@/components/Sidebar';
import styles from './page.module.css';

export default function Dashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar
        isOpen={isMenuOpen}
        onClose={closeMenu}
      />
      <div
        className={`
          ${styles.headerContainer} 
          ${isMenuOpen ? styles.headerPushed : ''}
        `}
      >
        <Header
          isMenuOpen={isMenuOpen}
          onMenuToggle={toggleMenu}
        />
      </div>
      <main
        className={`
          ${styles.mainContent} 
          ${isMenuOpen ? styles.contentPushed : ''}
        `}
      >
        <div className={styles.content}>
          <h1 className={styles.content_title}>Dashboard</h1>
          <section className={styles.content_info}>
            <DashboardClient />
          </section>
        </div>
      </main>
    </div>
  );
}