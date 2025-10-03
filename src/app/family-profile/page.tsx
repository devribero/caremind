'use client'

import { Header } from '@/components/headers/HeaderDashboard';
import styles from './page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function FamilyProfile() {
    const { user } = useAuth();
    const router = useRouter();

    const handleProfileSelect = (type: 'elderly' | 'caregiver') => {
        // Add logic here to store the profile type in context or state management
        router.push('/login');
    }

    return (
        <div className={styles.container}>
            <Header isMenuOpen={false} onMenuToggle={() => {}} />
            <main className={styles.main}>
                <h1 className={styles.title}>Selecione seu perfil</h1>
                <div className={styles.profileOptions}>
                    <div className={styles.profileCard} onClick={() => handleProfileSelect('elderly')}>
                        <Image
                            src="/elderly.svg"
                            alt="Perfil Idoso"
                            width={64}
                            height={64}
                        />
                        <h2>Idoso</h2>
                        <p>Acesse seus medicamentos e rotinas</p>
                        <Button>Selecionar</Button>
                    </div>
                    <div className={styles.profileCard} onClick={() => handleProfileSelect('caregiver')}>
                        <Image
                            src="/caregiver.svg"
                            alt="Familiar/Cuidador"
                            width={64}
                            height={64}
                        />
                        <h2>Familiar/Cuidador</h2>
                        <p>Gerencie medicamentos e rotinas para seus familiares</p>
                        <Button>Selecionar</Button>
                    </div>
                </div>
            </main>
        </div>
    );
}