"use client";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-6">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Você está offline</h1>
          <p className="text-muted-foreground max-w-md">
            Parece que você perdeu a conexão com a internet. 
            Verifique sua conexão e tente novamente.
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              Voltar ao início
            </Link>
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Algumas funcionalidades podem estar disponíveis offline</p>
        </div>
      </div>
    </div>
  );
}