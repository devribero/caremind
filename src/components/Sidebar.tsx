// src/components/Sidebar/Sidebar.tsx
'use client';
import Link from 'next/link';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void; 
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    // O div do overlay foi removido daqui
    <nav className={`${styles.sidebar} ${isOpen ? styles.active : ''}`}>
      <ul className={styles.navList}>
        <li><Link href="/dashboard" onClick={onClose}>Dashboard</Link></li>
        <li><Link href="/relatorios" onClick={onClose}>Relatórios</Link></li>
        <li><Link href="/rotinas" onClick={onClose}>Rotina</Link></li>
        <li><Link href="/remedios" onClick={onClose}>Remedios</Link></li>
        <li><Link href="/perfil" onClick={onClose}>Perfil</Link></li>
        <li><Link href="/configuracoes" onClick={onClose}>Configurações</Link></li>
      </ul>
    </nav>
  );
}