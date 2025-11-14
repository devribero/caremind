"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { usePWA } from "@/hooks/use-pwa";
import styles from "./InstallPWA.module.css";

export default function PWAInstallPrompt() {
  const { isInstalled, isInstallable, installApp } = usePWA();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);

  useEffect(() => {
    // Mostrar prompt apenas se for instalável, não estiver instalado e não tiver mostrado antes
    if (isInstallable && !isInstalled && !hasShownPrompt) {
      // Aguardar um pouco antes de mostrar o prompt
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, hasShownPrompt]);

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      console.log("PWA instalado com sucesso");
    }
    setShowInstallPrompt(false);
    setHasShownPrompt(true);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setHasShownPrompt(true);
  };

  if (!showInstallPrompt || isInstalled) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.content}>
          <h3 className={styles.title}>Instalar CareMind</h3>
          <p className={styles.description}>
            Instale o app para acesso rápido e funcionalidades offline
          </p>
        </div>
        
        <button
          onClick={handleDismiss}
          className={styles.closeButton}
          aria-label="Fechar"
        >
          <X className={styles.closeIcon} />
        </button>
      </div>
      
      <div className={styles.actions}>
        <Button
          onClick={handleInstallClick}
          className={styles.primaryButton}
        >
          <Download className={styles.buttonIcon} />
          Instalar
        </Button>
        <Button
          variant="outline"
          onClick={handleDismiss}
          className={styles.secondaryButton}
        >
          Agora não
        </Button>
      </div>
    </div>
  );
}