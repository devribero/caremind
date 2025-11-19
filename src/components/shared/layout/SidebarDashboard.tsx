"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { usePathname } from "next/navigation";
import { IoHomeOutline, IoBarChartOutline, IoClipboardOutline, IoMedkitOutline, IoPersonOutline, IoSettingsOutline, IoLogOutOutline, IoPeopleOutline, IoCalendarOutline } from "react-icons/io5";
import { Plug } from "lucide-react";
import styles from "./SidebarDashboard.module.css";

export default function SidebarDashboard({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
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
        <NavItem href="/remedios" label="Medicamentos" icon={IoMedkitOutline} />
        <NavItem href="/compromissos" label="Compromissos" icon={IoCalendarOutline} />
        <NavItem href="/rotinas" label="Rotina" icon={IoClipboardOutline} />
        <NavItem href="/relatorios" label="Relatórios" icon={IoBarChartOutline} />
        <NavItem href="/integracoes" label="Integrações" icon={Plug} />
        {user?.user_metadata?.account_type === 'familiar' && (
          <NavItem href="/familia" label="Família" icon={IoPeopleOutline} />
        )}
        <NavItem href="/perfil" label="Perfil" icon={IoPersonOutline} />
        <NavItem href="/configuracoes" label="Configurações" icon={IoSettingsOutline} />
      </nav>
      <div className={styles.bottomArea}>
        <div className={styles.userBox}>
          <div className={styles.avatar}>
            {profile?.foto_usuario ? (
              <Image
                src={profile.foto_usuario}
                alt="Foto de perfil"
                width={36}
                height={36}
                className={styles.avatarImg}
                key={profile.foto_usuario}
                priority
                loading="eager"
                onError={() => {
                  // Força um re-render em caso de cache quebrado
                  const bust = `${profile.foto_usuario}${profile.foto_usuario.includes('?') ? '&' : '?'}v=${Date.now()}`;
                  (window as any).requestAnimationFrame?.(() => {
                    // Fallback simples: recarrega a imagem ajustando a querystring
                  });
                }}
              />
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
    </aside>
  );
}
