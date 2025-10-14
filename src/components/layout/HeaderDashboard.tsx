"use client";
import { usePathname } from "next/navigation";
import { IoNotificationsOutline } from "react-icons/io5";
import styles from "./HeaderDashboard.module.css";

function prettify(segment: string) {
  if (!segment) return "";
  return segment
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function HeaderDashboard() {
  const pathname = usePathname();
  const last = pathname?.split("/").filter(Boolean).slice(-1)[0] || "Dashboard";
  const title = last === "dashboard" ? "Dashboard" : prettify(last);

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>
        <button className={styles.iconBtn} aria-label="Notificações">
          <IoNotificationsOutline size={20} />
        </button>
        <div className={styles.separator} />
        <div className={styles.userBadge}>
          <span className={styles.avatarCircle}>CM</span>
        </div>
      </div>
    </header>
  );
}
