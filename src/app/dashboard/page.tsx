'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Importe seu hook
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Importe seus componentes normais
import { Header } from '@/components/headers/HeaderDashboard';
import { DashboardClient } from '@/components/DashboardClient';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { Sidebar } from '@/components/Sidebar';
import styles from './page.module.css';

export default function Dashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth(); 
  const router = useRouter();

  const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
      };
    
      const closeMenu = () => {
        setIsMenuOpen(false);
      };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login'); // ou a rota da sua página de autenticação
    }
  }, [user, loading, router]); // O useEffect roda sempre que um desses valores mudar

  if (loading) {
    return (
        <div className={styles.loadingContainer}>
            <FullScreenLoader />
        </div>
    );
  }

  if (user) {
    return (
        <div className={styles.dashboardContainer}>
            <Sidebar
              isOpen={isMenuOpen}
              onClose={closeMenu}
            />
            <div className={styles.headerContainer}>
              <Header
                isMenuOpen={isMenuOpen}
                onMenuToggle={toggleMenu}
              />
            </div>
            <main className={styles.mainContent}>
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

  return null;
}