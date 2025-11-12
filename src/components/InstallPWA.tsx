"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { usePWA } from "@/hooks/use-pwa";

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
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Instalar Lune Admin</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Instale o app para acesso rápido e funcionalidades offline
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex gap-2 mt-3">
        <Button
          onClick={handleInstallClick}
          size="sm"
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Instalar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDismiss}
        >
          Agora não
        </Button>
      </div>
    </div>
  );
}