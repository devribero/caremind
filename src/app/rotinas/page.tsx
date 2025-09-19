'use client'

import { Header } from '@/components/headers/HeaderDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './remedios.module.css';

export default function Remedios() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    return (
        <main className={styles.main}>
            <Header isMenuOpen={isMenuOpen} onMenuToggle={toggleMenu} />
            <Sidebar
                isOpen={isMenuOpen}
                onClose={closeMenu}
            />
            
            <div className={`${isMenuOpen ? styles.contentPushed : ''} ${styles.mainContent}`}>
                <div className={styles.content}>
                    <h1 className={styles.content_title}>Rotinas</h1>
                    <section className={styles.content_info}>
                        {/* Conteúdo dos remédios será adicionado aqui */}
                    </section>
                </div>
            </div>
        </main>
    );
}