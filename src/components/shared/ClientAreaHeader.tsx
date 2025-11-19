"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import styles from "./ClientAreaHeader.module.css";
import { IoPersonCircleOutline } from "react-icons/io5";

export function ClientAreaHeader() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email || "";

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/dashboard" className={styles.logoLink} aria-label="Voltar para o dashboard">
          <Image src="/logo_coracao.png" alt="CareMind" width={140} height={44} priority />
        </Link>
      </div>
      <div className={styles.right}>
        <div className={styles.profileContainer} ref={profileMenuRef}>
          <button className={styles.profileButton} onClick={() => setIsProfileOpen((v) => !v)} aria-haspopup="menu" aria-expanded={isProfileOpen}>
            {profile?.foto_usuario ? (
              <Image
                src={profile.foto_usuario}
                alt="Foto de perfil"
                width={28}
                height={28}
                className={styles.profilePicture}
                key={profile.foto_usuario}
              />
            ) : (
              <IoPersonCircleOutline className={styles.person} size={28} />
            )}
            <span className={styles.profileName}>{displayName}</span>
          </button>
          {isProfileOpen && (
            <div className={styles.dropdownMenu} role="menu">
              <Link href="/perfil" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>
                Perfil
              </Link>
              <button className={`${styles.dropdownItem} ${styles.dropdownLogout}`} onClick={handleLogout}>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
