"use client";
import SidebarDashboard from "./SidebarDashboard";
import HeaderDashboard from "./HeaderDashboard";
import styles from "./AppLayout.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <SidebarDashboard />
      <div className={styles.mainArea}>
        <HeaderDashboard />
        <div className={styles.contentArea}>{children}</div>
      </div>
    </div>
  );
}
