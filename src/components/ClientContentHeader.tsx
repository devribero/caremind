"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IoMenu } from "react-icons/io5";
import styles from "./ClientContentHeader.module.css";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";

interface ClientContentHeaderProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function ClientContentHeader({ title, collapsed, onToggle }: ClientContentHeaderProps) {
  const { user, signOut } = useAuth();
  const { photoUrl } = useProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email || "";

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <button className={styles.toggleBtn} onClick={onToggle} aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}>
          <IoMenu size={18} />
        </button>
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.right}>
        <div className={styles.profileContainer} ref={ref}>
          <button className={styles.profileButton} onClick={() => setOpen((v) => !v)}>
            {photoUrl ? (
              <Image src={photoUrl} alt="Foto de perfil" width={28} height={28} className={styles.profilePicture} />
            ) : (
              <span className={styles.person}>◉</span>
            )}
            <span className={styles.profileName}>{displayName}</span>
          </button>
          {open && (
            <div className={styles.dropdownMenu} role="menu">
              <Link href="/perfil" className={styles.dropdownItem} onClick={() => setOpen(false)}>
                Perfil
              </Link>
              <button className={`${styles.dropdownItem} ${styles.dropdownLogout}`} onClick={signOut}>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
