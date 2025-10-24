"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { usePathname } from "next/navigation";
import { IoHomeOutline, IoBarChartOutline, IoClipboardOutline, IoMedkitOutline, IoPersonOutline, IoSettingsOutline, IoLogOutOutline, IoPeopleOutline, IoCalendarOutline } from "react-icons/io5";
import styles from "./SidebarDashboard.module.css";

export default function SidebarDashboard({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useAuth();
  const { photoUrl } = useProfile();
  const pathname = usePathname();

  const displayName = user?.user_metadata?.full_name || "";
  const displayEmail = user?.email || "";
  const isFamiliar = (user?.user_metadata?.account_type || '').toLowerCase() === 'familiar';

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const active = pathname === href;
    return (
      <Link 
        href={href} 
        className={`${styles.navItem} ${active ? styles.active : ""}`} 
        aria-label={label}
        prefetch={true}
      >
        <span className={styles.icon}><Icon size={22} /></span>
        {!collapsed && <span className={styles.label}>{label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.topArea}>
        <div className={styles.logoRow}>
          {!collapsed && <span className={styles.logoText}>Caremind</span>}
        </div>
      </div>
      <nav className={styles.nav}>
        <NavItem href={isFamiliar ? "/familiar-dashboard" : "/dashboard"} label="Dashboard" icon={IoHomeOutline} />
        <NavItem href="/relatorios" label="Relatórios" icon={IoBarChartOutline} />
        <NavItem href="/rotinas" label="Rotinas" icon={IoClipboardOutline} />
        <NavItem href="/compromissos" label="Compromissos" icon={IoCalendarOutline} />
        <NavItem href="/medicamentos" label="Medicamentos" icon={IoMedkitOutline} />
        {user?.user_metadata?.account_type === 'familiar' && (
          <NavItem href="/familia" label="Família" icon={IoPeopleOutline} />
        )}
        <NavItem href="/perfil" label="Perfil" icon={IoPersonOutline} />
        <NavItem href="/configuracoes" label="Configurações" icon={IoSettingsOutline} />
      </nav>
      <div className={styles.bottomArea}>
        <div className={styles.userBox}>
          <div className={styles.avatar}>
            {photoUrl ? (
              <Image 
                src={photoUrl} 
                alt="Foto de perfil" 
                width={36} 
                height={36} 
                className={styles.avatarImg}
                priority
                loading="eager" 
              />
            ) : (
              <div className={styles.avatarFallback}>
                <Image 
                src="/foto_padrao.png"
                alt="Foto de perfil" 
                width={36} 
                height={36} 
                className={styles.avatarImg}
                priority
                loading="eager" 
              />
              </div>
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
    </aside>
  );
}
