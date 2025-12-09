"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileContext } from "@/contexts/ProfileContext";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { IoHomeOutline, IoBarChartOutline, IoClipboardOutline, IoMedkitOutline, IoPersonOutline, IoSettingsOutline, IoLogOutOutline, IoPeopleOutline, IoCalendarOutline } from "react-icons/io5";
import { Plug } from "lucide-react";
import styles from "./SidebarDashboard.module.css";

export default function SidebarDashboard({ collapsed, mobileOpen = false }: { collapsed: boolean; mobileOpen?: boolean }) {
  const { user, signOut } = useAuth();
  const { profile } = useProfileContext();
  const pathname = usePathname();

  const displayName = user?.user_metadata?.full_name || "";
  const displayEmail = user?.email || "";
  const isFamiliar = (user?.user_metadata?.account_type || '').toLowerCase() === 'familiar';

  // Constrói a URL do avatar
  const avatarUrl = useMemo(() => {
    if (!profile?.foto_usuario) return null;

    const path = profile.foto_usuario;

    // Se já é uma URL completa, retorna como está
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Se é um caminho absoluto local, retorna como está
    if (path.startsWith('/')) {
      return path;
    }

    // Se é um caminho relativo do storage, constrói manualmente a URL pública
    // Formato: https://[PROJECT_URL]/storage/v1/object/public/[BUCKET]/[PATH]
    const supabaseUrl = 'https://njxsuqvqaeesxmoajzyb.supabase.co';
    const bucketName = 'avatars';
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;

    return publicUrl;
  }, [profile?.foto_usuario]);

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
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${mobileOpen ? styles.mobileOpen : ""}`}>
      <div className={styles.topArea}>
        <div className={styles.logoRow}>
          {!collapsed && <a href="/" className={styles.logoText}>Caremind</a>}
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
            {avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('/')) ? (
              <Image
                src={avatarUrl}
                alt="Foto de perfil"
                width={36}
                height={36}
                className={styles.avatarImg}
                key={avatarUrl}
                priority
                loading="eager"
                onError={(e) => {
                  // Em caso de erro, mostra o fallback
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
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
