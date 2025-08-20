'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import TaskList from '../../components/TaskList'; 
import styles from './page.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import Image from 'next/image';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <ProtectedRoute>
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Dashboard</h1>
              <p className={styles.welcomeText}>
                Bem-vindo, {user?.email}
              </p>
            </div>
            <div className={styles.headerRight}>
              <button onClick={handleLogout} className={styles.logoutButton}>
                Sair
              </button>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <TaskList initialTarefas={[]} />
        </div>
      </main>
    </ProtectedRoute>
  );
}