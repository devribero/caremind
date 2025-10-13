'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Header } from '@/components/headers/HeaderHome';
import { Footer } from '@/components/Footer';
import styles from './page.module.css';
import Image from 'next/image';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className={styles.main}>
        {/* Efeito de ondas animadas para manter consistência visual com a tela de login */}
        <div className={styles.waves}>
          <div className={styles.wave}></div>
          <div className={styles.wave}></div>
          <div className={styles.wave}></div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: 'white'
        }}>
          Carregando...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      {/* Efeito de ondas animadas para manter consistência visual com a tela de login */}
      <div className={styles.waves}>
        <div className={styles.wave}></div>
        <div className={styles.wave}></div>
        <div className={styles.wave}></div>
      </div>
      <Header />

      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Cuidado Inteligente para Quem Você Ama
            </h1>
            <p className={styles.heroDescription}>
              Assistente virtual com integração por voz para auxiliar idosos no gerenciamento de medicações e rotinas diárias. Mais autonomia para eles, mais tranquilidade para a família.
            </p>
            <div className={styles.heroButton}>
              <Link href="/auth">
                <Button size="lg" className={styles.ctaButton}>
                  Começar agora
                </Button>
              </Link>
            </div>
          </div>

          <div className={styles.heroImage}>
            <Image
              src="/hero-elderly.svg"
              alt="Idoso usando assistente virtual"
              width={500}
              height={400}
              className={styles.heroImg}
              style={{
                maxWidth: '100%',
                height: 'auto',
              }}
            />
          </div>
        </div>
      </section>

      <section className={styles.featuresSection}>
        <div className={styles.container}>
          <h1 className={styles.sectionTitle}>Funcionalidades principais</h1>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <img
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/camera.svg"
                alt="Camera"
                className={styles.featureIcon}
              />
              <h3>Camera Inteligente</h3>
              <p>Cadastre medicamentos facilmente fotografando a cartela. O sistema identifica automaticamente o remédio e suas informações.</p>
            </div>
            <div className={styles.featureCard}>
              <img
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/mic.svg"
                alt="Microfone"
                className={styles.featureIcon}
              />
              <h3>Comandos de Voz</h3>
              <p>Integração com Alexa e Google Home para lembretes por voz, confirmação de doses e controle total sem precisar tocar em nada.</p>
            </div>
            <div className={styles.featureCard}>
              <img
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/bell.svg"
                alt="Alerta"
                className={styles.featureIcon}
              />
              <h3>Alertas Inteligentes</h3>
              <p>Lembretes automáticos para medicamentos, refeições, consultas médicas e outras atividades importantes da rotina.</p>
            </div>
            <div className={styles.featureCard}>
              <img
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/people.svg"
                alt="Pessoas"
                className={styles.featureIcon}
              />
              <h3>Notificação Familiar</h3>
              <p>Familiares recebem alertas automáticos em caso de esquecimento ou não confirmação da medicação, mantendo todos informados.</p>
            </div>
            <div className={styles.featureCard}>
              <img
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/alarm.svg"
                alt="Alarme"
                className={styles.featureIcon}
              />
              <h3>Rotina Personalizada</h3>
              <p>Controle total de tarefas cotidianas: horários de refeições, caminhadas, ingestão de água e atividades personalizáveis.</p>
            </div>
            <div className={styles.featureCard}>
              <img
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/shield.svg"
                alt="Escudo"
                className={styles.featureIcon}
              />
              <h3>Interface Acessível</h3>
              <p>Design adaptado para pessoas com dificuldades visuais ou cognitivas, com fontes grandes, cores contrastantes e navegação simplificada.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Por Que Escolher o CareMind? */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h1 className={styles.container_title}>Por Que Escolher o CareMind?</h1>
        </div>

        <div className={styles.container_itens}>
          {/* Lista à esquerda */}
          <div className={styles.container_list}>
            <ol>
              <li>
                <h1>1. Mais Autonomia</h1>
                <p>
                  Permite que idosos mantenham sua independência com segurança, reduzindo a
                  dependência de familiares para tarefas básicas.
                </p>
              </li>
              <li>
                <h1>2. Segurança Familiar</h1>
                <p>
                  Familiares ficam tranquilos sabendo que seus entes queridos estão sendo
                  acompanhados e receberão alertas em caso de necessidade.
                </p>
              </li>
              <li>
                <h1>3. Prevenção de Riscos</h1>
                <p>
                  Evita esquecimentos perigosos de medicamentos e ajuda a manter uma rotina
                  saudável e organizada.
                </p>
              </li>
              <li>
                <h1>4. Tecnologia Simples</h1>
                <p>
                  Interface intuitiva e comandos de voz naturais tornam a tecnologia acessível
                  mesmo para quem não tem familiaridade com dispositivos digitais.
                </p>
              </li>
            </ol>
          </div>

          {/* Card de Impacto Social à direita */}
          <div className={styles.impactContainer}>
            <div className={styles.iconWrapper}>
              {/* Coração */}
              <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21s-6.716-4.35-9.428-7.06C.86 12.228.5 10.28 1.343 8.7 2.472 6.6 5.2 5.9 7.183 7.2c.71.47 1.286 1.124 1.68 1.89.394-.766.97-1.42 1.68-1.89 1.983-1.3 4.71-.6 5.84 1.5.843 1.58.483 3.528-1.229 5.24C18.716 16.65 12 21 12 21z"/>
              </svg>
            </div>
            <h2 className={styles.title}>Impacto Social</h2>
            <p className={styles.description}>
              Com o envelhecimento da população e o aumento de casos de Alzheimer, o CareMind
              representa uma solução tecnológica essencial para apoiar idosos e suas famílias.
            </p>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <p className={styles.statNumber}>85%</p>
                <p className={styles.statLabel}>Redução de esquecimentos</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statNumber}>92%</p>
                <p className={styles.statLabel}>Satisfação familiar</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.footerWrapper}>
        <Footer />
      </div>
    </main>
  );
}