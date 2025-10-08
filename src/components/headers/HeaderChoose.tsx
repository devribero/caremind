'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './HeaderChoose.module.css';

export function Header() {
    return (
        <header className={styles.header}>
            <div className={styles.headerLeft}>
                <Link href="/" className={styles.header__logo}>
                    <Image src="/logo.png" alt="CareMind Logo" width={200} height={63} priority/>
                </Link>
            </div>

            <div className={styles.profileContainer}>
                <div className={styles.actions}>
                    <Image
                        src="./icons/back.svg"
                        width={20}
                        height={20}
                        alt=""
                    />
                    <Link href="/" className={styles.welcomeText}>
                        Voltar
                    </Link>
                </div>
            </div>
        </header>
    );
}