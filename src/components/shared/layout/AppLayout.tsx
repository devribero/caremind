"use client";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useCallback } from "react";
import SidebarDashboard from "./SidebarDashboard";
import { Header } from "../headers/HeaderDashboard";
import styles from "./AppLayout.module.css";
import { ToastContainer } from "@/components/features/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = usePersistentState<boolean>("ui.sidebar.collapsed", false);
  const handleMenuToggle = useCallback(() => setCollapsed((v) => !v), [setCollapsed]);
  return (
    <div className={styles.shell}>
      <SidebarDashboard collapsed={collapsed} />
      <div
        className={styles.mainArea}
        style={{ marginLeft: collapsed ? 80 : 280, width: `calc(100% - ${collapsed ? 80 : 280}px)` }}
      >
        <Header isMenuOpen={!collapsed} onMenuToggle={handleMenuToggle} />
        <div className={styles.contentArea}>{children}</div>
      </div>
      <ToastContainer />
    </div>
  );
}
