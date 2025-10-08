'use client'

import { Header } from '@/components/headers/HeaderChoose'
import styles from '@/app/choose_profile/page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ChooseProfile() { 
    const { user } = useAuth();
    const router = useRouter();

    const handleProfileSelect = (type: 'individual' | 'family') => {
        if (type === 'individual') {
            router.push('/login');
        } else {
            router.push('/login_family');
        }
    }

    return (
        <div className={styles.container}>
            <Header />
            <main className={styles.main}>
                <h1 className={styles.title}>Escolha o tipo de uso</h1>
                <div className={styles.profileOptions}>
                    <div className={styles.profileCard} onClick={() => handleProfileSelect('individual')}>
                        <Image
                            src="/icons/user.webp"
                            alt="Uso Individual"
                            width={80}
                            height={80}
                        />
                        <h2>Uso Individual</h2>
                        <p>Gerencie seus próprios medicamentos e rotinas</p>
                        <Button>Selecionar</Button>
                    </div>
                    <div className={styles.profileCard} onClick={() => handleProfileSelect('family')}>
                        <Image
                            src="/icons/teamwork.webp"
                            alt="Plano Família"
                            width={80}
                            height={80}
                        />
                        <h2>Plano Família</h2>
                        <p>Gerencie medicamentos para você e seus familiares</p>
                        <Button>Selecionar</Button>
                    </div>
                </div>
            </main>
        </div>
    );
}