"use client";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import styles from "./offline.module.css";

export default function OfflinePage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconContainer}>
            <WifiOff className={styles.icon} />
          </div>
          
          <div className={styles.content}>
            <h1 className={styles.title}>Você está offline</h1>
            <p className={styles.description}>
              Parece que você perdeu a conexão com a internet. 
              Verifique sua conexão e tente novamente.
            </p>
          </div>

          <div className={styles.actions}>
            <Button 
              onClick={() => window.location.reload()} 
              className={styles.primaryButton}
            >
              <RefreshCw className={styles.buttonIcon} />
              Tentar novamente
            </Button>
            
            <Button variant="outline" asChild className={styles.secondaryButton}>
              <Link href="/">
                Voltar ao início
              </Link>
            </Button>
          </div>

          <div className={styles.footer}>
            <p>Algumas funcionalidades podem estar disponíveis offline</p>
          </div>
        </div>
      </div>
    </main>
  );
}