"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { usePathname } from "next/navigation";
import { IoHomeOutline, IoBarChartOutline, IoClipboardOutline, IoMedkitOutline, IoPersonOutline, IoSettingsOutline, IoLogOutOutline } from "react-icons/io5";
import styles from "./SidebarDashboard.module.css";

export default function SidebarDashboard({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useAuth();
  const { photoUrl } = useProfile();
  const pathname = usePathname();

  const displayName = user?.user_metadata?.full_name || "";
  const displayEmail = user?.email || "";

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const active = pathname === href;
    return (
      <Link href={href} className={`${styles.navItem} ${active ? styles.active : ""}`} aria-label={label}>
        <span className={styles.icon}><Icon size={18} /></span>
        {!collapsed && <span className={styles.label}>{label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.topArea}>
        <div className={styles.logoRow}>
          <span className={styles.logoText}>Caremind</span>
        </div>
        <div className={styles.userBox}>
          <div className={styles.avatar}>
            {photoUrl ? (
              <Image src={photoUrl} alt="Foto de perfil" width={36} height={36} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>👤</div>
            )}
          </div>
          {!collapsed && (
            <div className={styles.userText}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userEmail}>{displayEmail}</span>
            </div>
          )}
        </div>
      </div>
      <nav className={styles.nav}>
        <NavItem href="/dashboard" label="Dashboard" icon={IoHomeOutline} />
        <NavItem href="/relatorios" label="Relatórios" icon={IoBarChartOutline} />
        <NavItem href="/rotinas" label="Rotinas" icon={IoClipboardOutline} />
        <NavItem href="/remedios" label="Remédios" icon={IoMedkitOutline} />
        <NavItem href="/perfil" label="Perfil" icon={IoPersonOutline} />
        <NavItem href="/configuracoes" label="Configurações" icon={IoSettingsOutline} />
      </nav>
      {/* logout removido daqui; agora no menu do header */}
    </aside>
  );
}
