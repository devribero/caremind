"use client";
import { usePathname } from "next/navigation";
import { IoNotificationsOutline } from "react-icons/io5";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import styles from "./HeaderDashboard.module.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileContext } from "@/contexts/ProfileContext";
import { useIdoso, TODOS_IDOSOS_ID } from "@/contexts/IdosoContext";
import { useRouter } from "next/navigation";

function prettify(segment: string) {
  if (!segment) return "";
  return segment
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function HeaderDashboard({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { signOut, user } = useAuth();
  const { profile } = useProfileContext();
  const { listaIdososVinculados, idosoSelecionadoId, setIdosoSelecionado, mostrarTodos } = useIdoso();
  const router = useRouter();
  const pathname = usePathname();
  const last = pathname?.split("/").filter(Boolean).slice(-1)[0] || "Dashboard";
  const title = last === "dashboard" ? "Dashboard" : prettify(last);

  const isFamiliar = profile?.tipo === 'familiar' || user?.user_metadata?.account_type === 'familiar';

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleIdosoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setIdosoSelecionado(value || null);
  };

  return (
    <header className={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className={`${styles.iconBtn} ${styles.menuBtn}`} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} onClick={onToggle}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <h1 className={styles.title}>{title}</h1>
      </div>
      <div className={styles.actions}>
        {/* Seletor de idoso para contas familiares */}
        {isFamiliar && listaIdososVinculados.length > 0 && (
          <select
            className={styles.idosoSelect}
            value={mostrarTodos ? TODOS_IDOSOS_ID : (idosoSelecionadoId || '')}
            onChange={handleIdosoChange}
          >
            <option value={TODOS_IDOSOS_ID}>👥 Todos os idosos</option>
            {listaIdososVinculados.map((idoso) => (
              <option key={idoso.id} value={idoso.id}>
                👤 {idoso.nome}
              </option>
            ))}
          </select>
        )}
        <button className={styles.iconBtn} aria-label="Notificações">
          <IoNotificationsOutline size={20} />
        </button>
        <div className={styles.separator} />
        <div className={styles.userBadge} ref={ref}>
          <button className={styles.iconBtn} aria-label="Perfil" onClick={() => setOpen((v) => !v)}>
            <span className={styles.avatarCircle}>CM</span>
          </button>
          {open && (
            <div className={styles.dropdownMenu} role="menu" style={{ position: 'absolute', right: 16, top: 52, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', minWidth: 160, zIndex: 50 }}>
              <Link href="/perfil" className={styles.dropdownItem} style={{ display: 'block', padding: '10px 12px', color: '#0f172a' }} onClick={() => setOpen(false)}>
                Perfil
              </Link>
              <button className={styles.dropdownItem} style={{ display: 'block', padding: '10px 12px', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }} onClick={async () => { await signOut(); router.push('/'); }}>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
