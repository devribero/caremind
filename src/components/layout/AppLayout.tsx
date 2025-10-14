"use client";
import { usePersistentState } from "@/hooks/usePersistentState";
import SidebarDashboard from "./SidebarDashboard";
import HeaderDashboard from "./HeaderDashboard";
import styles from "./AppLayout.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = usePersistentState<boolean>("ui.sidebar.collapsed", false);
  return (
    <div className={styles.shell}>
      <SidebarDashboard collapsed={collapsed} />
      <div
        className={styles.mainArea}
        style={{ marginLeft: collapsed ? 80 : 280, width: `calc(100% - ${collapsed ? 80 : 280}px)` }}
      >
        <HeaderDashboard collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <div className={styles.contentArea}>{children}</div>
      </div>
    </div>
  );
}
