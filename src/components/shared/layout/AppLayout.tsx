"use client";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useCallback, useEffect, useState } from "react";
import SidebarDashboard from "./SidebarDashboard";
import { Header } from "../headers/HeaderDashboard";
import styles from "./AppLayout.module.css";
import { ToastContainer } from "@/components/features/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = usePersistentState<boolean>("ui.sidebar.collapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fechar sidebar mobile quando mudar de página
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const handleMenuToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  }, [isMobile, setCollapsed]);

  const handleOverlayClick = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className={styles.shell}>
      {/* Overlay para fechar sidebar no mobile */}
      {isMobile && (
        <div
          className={`${styles.overlay} ${mobileOpen ? styles.overlayVisible : ''}`}
          onClick={handleOverlayClick}
        />
      )}

      <SidebarDashboard
        collapsed={isMobile ? false : collapsed}
        mobileOpen={mobileOpen}
      />

      <div
        className={styles.mainArea}
        style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 280) }}
      >
        <Header
          isMenuOpen={isMobile ? mobileOpen : !collapsed}
          onMenuToggle={handleMenuToggle}
        />
        <div className={styles.contentArea}>{children}</div>
      </div>

      <ToastContainer />
    </div>
  );
}
