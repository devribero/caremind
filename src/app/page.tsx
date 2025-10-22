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
      <Header />

      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Cuidado inteligente que traz segurança e autonomia todos os dias.
            </h1>
            <p className={styles.heroDescription}>
              O CareMind ajuda no controle de medicações e rotinas, prevenindo esquecimentos e garantindo mais tranquilidade para famílias e cuidadores.
            </p>
            <div className={styles.heroButton}>
              <Link href="/auth?mode=register">
                <Button size="lg" className={styles.ctaButton}>
                  Quero conhecer o CareMind
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
          <h1 className={styles.sectionTitle}>Tecnologia simples para um cuidado completo</h1>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <Image
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/camera.svg"
                alt="Camera"
                className={styles.featureIcon}
                width={32}height={32}
              />
              <h3>Reconhecimento automático de medicamentos</h3>
              <p>Cadastre com uma foto: o sistema identifica o remédio e cria os lembretes sozinho.</p>
            </div>
            <div className={styles.featureCard}>
              <Image
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/mic.svg"
                alt="Microfone"
                className={styles.featureIcon}
                width={32}
                height={32}
              />
              <h3>Comandos por voz</h3>
              <p>Compatível com Alexa e Google Home. Lembretes e confirmações de dose por voz, sem tocar no aparelho.</p>
            </div>
            <div className={styles.featureCard}>
              <Image
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/bell.svg"
                alt="Alerta"
                className={styles.featureIcon}
                width={32}
                height={32}
              />
              <h3>Alertas inteligentes</h3>
              <p>O CareMind detecta atrasos e envia avisos antes que o esquecimento se torne um risco.</p>
            </div>
            <div className={styles.featureCard}>
              <Image
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/people.svg"
                alt="Pessoas"
                className={styles.featureIcon}
                width={32}
                height={32}
              />
              <h3>Família conectada</h3>
              <p>Parentes recebem notificações instantâneas sobre o andamento da rotina.</p>
            </div>
            <div className={styles.featureCard}>
              <Image
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/alarm.svg"
                alt="Alarme"
                className={styles.featureIcon}
                width={32}
                height={32}
              />
              <h3>Rotina personalizada</h3>
              <p>Organize horários de refeições, hidratação e atividades diárias com poucos toques.</p>
            </div>
            <div className={styles.featureCard}>
              <Image
                src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/shield.svg"
                alt="Escudo"
                className={styles.featureIcon}
                width={32}
                height={32}
              />
              <h3>Interface acessível</h3>
              <p>Textos grandes, alto contraste e navegação simples para todos os níveis de familiaridade digital.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Por Que Escolher o CareMind? */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h1 className={styles.container_title}>Mais independência para quem precisa, mais tranquilidade pra quem cuida.</h1>
        </div>

        <div className={styles.container_itens}>
          {/* Lista à esquerda */}
          <div className={styles.container_list}>
            <ol>
              <li>
                <h1>Autonomia com segurança</h1>
                <p>Permite que idosos mantenham suas rotinas com confiança e sem dependência constante.</p>
              </li>
              <li>
                <h1>Proteção familiar</h1>
                <p>Envia alertas automáticos para familiares em caso de esquecimento ou irregularidade.</p>
              </li>
              <li>
                <h1>Prevenção de riscos</h1>
                <p>Monitora padrões e antecipa esquecimentos, garantindo cuidado contínuo.</p>
              </li>
              <li>
                <h1>Tecnologia humana</h1>
                <p>Criado para ser usado com naturalidade — sem barreiras técnicas, sem complicação.</p>
              </li>
            </ol>
          </div>

          {/* Card de Impacto Social à direita */}
          <div className={styles.impactContainer}>
            <h2 className={styles.title}>Cuidado inteligente que já transforma famílias</h2>
            <p className={styles.description}>
              Com o envelhecimento da população e o aumento dos casos de Alzheimer, o CareMind se tornou uma ferramenta essencial no apoio diário ao cuidado familiar.
            </p>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <p className={styles.statNumber}>85%</p>
                <p className={styles.statLabel}>menos esquecimentos registrados</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statNumber}>92%</p>
                <p className={styles.statLabel}>das famílias relatam mais tranquilidade</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statNumber}>✓</p>
                <p className={styles.statLabel}>Presente em centenas de lares que cuidam com inteligência</p>
              </div>
            </div>

            <div className={styles.heroButton}>
              <Link href="/auth?mode=register">
                <Button size="lg" className={styles.ctaButton}>
                  Quero conhecer o CareMind
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <Footer />
      </footer>
    </main>
  );
}