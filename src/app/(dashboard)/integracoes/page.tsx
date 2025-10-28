"use client";

import { Button } from "@/components/ui/button";
import { Radio, Home } from "lucide-react";
import styles from "./page.module.css";
import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';

export default function IntegracoesPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [isLoading, setIsLoading] = useState(false);
  const handleConnectAlexa = async () => {
    setIsLoading(true);
    try {
      // Chama a Edge Function que acabamos de criar
      const { data, error } = await supabase.functions.invoke('get-amazon-auth-url');
      
      if (error) throw error;
      
      // Se der certo, 'data.url' conterá a URL da Amazon
      // Redireciona o navegador do usuário para o login da Amazon
      window.location.href = data.url;
    
    } catch (error) {
      console.error('Erro ao conectar com a Alexa:', error.message);
      alert('Não foi possível iniciar a conexão com a Amazon. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleConnectGoogleHome = () => {
    console.log("Iniciando fluxo de conexão com o Google Home...");
    alert('Função "Conectar Google Home" a ser implementada.');
  };

  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <h1 className={styles.content_title}>Integrações</h1>
        <p className={styles.subtitle}>
          Conecte o Caremind a outros aplicativos e dispositivos para automatizar sua rotina de cuidado.
        </p>

        <section className={styles.content_info}>
          <div className={styles.grid}>
            {/* Card da Alexa */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Amazon Alexa</h2>
                <Radio className="h-6 w-6" color="#0400BA" />
              </div>
              <div className={styles.cardContent}>
                <p className={styles.cardDescription}>
                  Receba lembretes de voz e confirme medicamentos, rotinas e compromissos diretamente no seu dispositivo Echo.
                </p>
                <Button size="lg" onClick={handleConnectAlexa} disabled={isLoading} className={`${styles.primaryButton} w-full`}>
                  {isLoading ? 'Conectando...' : 'Conectar'}
                </Button>
              </div>
            </div>

            {/* Card do Google Home */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Google Home</h2>
                <Home className="h-6 w-6" color="#10b981" />
              </div>
              <div className={styles.cardContent}>
                <p className={styles.cardDescription}>
                  Use comandos de voz com o Google Assistente para acompanhar medicamentos, rotinas e compromissos.
                </p>
                <Button size="lg" onClick={handleConnectGoogleHome} className={`${styles.primaryButton} w-full`}>Conectar</Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
