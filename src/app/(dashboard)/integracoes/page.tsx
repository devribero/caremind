"use client";

import { Button } from "@/components/ui/button";
import { Home, Loader2, Check } from "lucide-react";
import Image from "next/image";
import styles from "./page.module.css";
import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from '@/components/Toast';

export default function IntegracoesPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [alexaIntegration, setAlexaIntegration] = useState<any>(null);
  const [isLoadingAlexa, setIsLoadingAlexa] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const fetchIntegrationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('provider', 'amazon_alexa')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setAlexaIntegration(data);
      }
    } catch (error) {
      console.error('Erro ao verificar status da integração:', error);
      toast.error('Não foi possível verificar o status da integração com a Alexa');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchIntegrationStatus();
  }, []);

  useEffect(() => {
    if (!searchParams) return;
    
    const urlStatus = searchParams.get('status');
    const urlMessage = searchParams.get('message');

    setStatus(urlStatus);
    setMessage(urlMessage);

    if (urlStatus === 'success') {
      toast.success('Integração com Alexa realizada com sucesso!');
      fetchIntegrationStatus();
    } else if (urlStatus === 'error') {
      toast.error(`Erro na integração com Alexa: ${urlMessage || 'Erro desconhecido'}`);
    }

    // Limpa os parâmetros da URL após processá-los
    window.history.replaceState(null, '', '/integracoes');
  }, [searchParams]);

  const handleConnectAlexa = async () => {
    setIsLoadingAlexa(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-amazon-auth-url');

      if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error));

      // Se der certo, 'data.url' conterá a URL da Amazon
      // Redireciona o navegador do usuário para o login da Amazon
      window.location.href = data.url;
    
    } catch (err) {
      console.error('Erro ao conectar com a Alexa:', err);
      toast.error(`Não foi possível iniciar a conexão com a Amazon. ${err instanceof Error ? err.message : String(err)}`);
      setIsLoadingAlexa(false);
    }
  };

  const handleDisconnectAlexa = async () => {
    if (!alexaIntegration?.id) return;
    
    setIsLoadingAlexa(true);
    try {
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('id', alexaIntegration.id);

      if (error) throw error;

      toast.success('Integração removida com sucesso!');
      setAlexaIntegration(null);
    } catch (error) {
      console.error('Erro ao desconectar a Alexa:', error);
      toast.error('Não foi possível remover a integração com a Alexa');
    } finally {
      setIsLoadingAlexa(false);
    }
  };

  const handleConnectGoogleHome = () => {
    console.log("Iniciando fluxo de conexão com o Google Home...");
    toast.info('Função "Conectar Google Home" a ser implementada.');
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
                <div className={styles.headerRight}>
                  {isCheckingStatus ? (
                    <Loader2 className={`${styles.statusIcon} text-blue-500 animate-spin`} />
                  ) : alexaIntegration ? (
                    <div className={styles.alexaLogo}>
                      <Image 
                        src="/images/alexa-logo.png" 
                        alt="Alexa" 
                        width={32} 
                        height={32}
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className={styles.alexaLogo}>
                      <Image 
                        src="/images/alexa-logo.png" 
                        alt="Alexa" 
                        width={32} 
                        height={32}
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.cardContent}>
                {isCheckingStatus ? (
                  <div className={styles.loadingState}>
                    <div className={styles.loadingSpinner} />
                    <p className={styles.loadingText}>Verificando status da integração...</p>
                  </div>
                ) : alexaIntegration ? (
                  <div className={styles.connectedState}>
                    <div className={styles.connectedBadge}>
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Conectado</span>
                    </div>
                    <p className={styles.cardDescription}>
                      Sua conta está conectada. Receba lembretes de voz e confirmações no seu dispositivo Echo.
                    </p>
                    <Button 
                      size="lg" 
                      onClick={handleDisconnectAlexa} 
                      disabled={isLoadingAlexa} 
                      className={`${styles.disconnectButton} w-full mt-auto`}
                      variant="outline"
                    >
                      {isLoadingAlexa ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Desconectando...
                        </>
                      ) : 'Desconectar'}
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className={styles.cardDescription}>
                      Conecte sua conta para receber lembretes de voz e confirmações de cuidados no seu dispositivo Echo.
                    </p>
                    <Button 
                      size="lg" 
                      onClick={handleConnectAlexa} 
                      disabled={isLoadingAlexa} 
                      className={`${styles.primaryButton} w-full mt-4`}
                    >
                      {isLoadingAlexa ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Conectando...
                        </>
                      ) : 'Conectar com Alexa'}
                    </Button>
                  </>
                )}
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
