"use client";
import Link from "next/link";
import styles from "./ClientSidebar.module.css";
import { IoMenu, IoHomeOutline, IoClipboardOutline, IoMedkitOutline, IoPersonOutline, IoSettingsOutline } from "react-icons/io5";

interface ClientSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function ClientSidebar({ collapsed, onToggle }: ClientSidebarProps) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.top}>
        <button className={styles.toggleBtn} onClick={onToggle} aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}>
          <IoMenu size={18} />
        </button>
      </div>
      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.navItem}>
          <span className={styles.icon}><IoHomeOutline /></span>
          <span className={styles.label}>Dashboard</span>
        </Link>
        <Link href="/relatorios" className={styles.navItem}>
          <span className={styles.icon}><IoClipboardOutline /></span>
          <span className={styles.label}>Relatórios</span>
        </Link>
        <Link href="/rotinas" className={styles.navItem}>
          <span className={styles.icon}><IoClipboardOutline /></span>
          <span className={styles.label}>Rotinas</span>
        </Link>
        <Link href="/remedios" className={styles.navItem}>
          <span className={styles.icon}><IoMedkitOutline /></span>
          <span className={styles.label}>Remédios</span>
        </Link>
        <Link href="/perfil" className={styles.navItem}>
          <span className={styles.icon}><IoPersonOutline /></span>
          <span className={styles.label}>Perfil</span>
        </Link>
        <Link href="/configuracoes" className={styles.navItem}>
          <span className={styles.icon}><IoSettingsOutline /></span>
          <span className={styles.label}>Configurações</span>
        </Link>
      </nav>
    </aside>
  );
}
