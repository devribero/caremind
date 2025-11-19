'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Header } from '@/components/shared/headers/HeaderHome';
import { Footer } from '@/components/shared/Footer';
import styles from './page.module.css';
import Image from 'next/image';
import { Waves } from '@/components/shared/Waves';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleAuthCheck = async () => {
      try {
        if (!loading && user) {
          const tipo = (user.user_metadata?.account_type as string | undefined)?.toLowerCase();
          await router.push(tipo === 'familiar' ? '/familiar-dashboard' : '/dashboard');
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
    };

    handleAuthCheck();
  }, [user, loading, router]);

  const parallaxOffset = scrollY * 0.5;

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Carregando...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Waves />
      <Header />

      <section
        className={styles.heroSection}
      >
        <div className={styles.heroContainer}>
          <div
            className={`${styles.heroContent} ${styles.fadeInUp}`}
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          >
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

          <div
            className={`${styles.heroImage} ${styles.fadeInRight}`}
            style={{ transform: `translateY(${scrollY * 0.2}px)` }}
          >
            <div className={styles.floatingImage}>
              <Image
                src="/images/hero-elderly.svg"
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
        </div>
      </section>

      <section className={styles.featuresSection}>
        <div className={styles.container}>
          <h1 className={`${styles.sectionTitle} ${styles.fadeIn}`}>
            Tecnologia simples para um cuidado completo
          </h1>
          <div className={styles.featuresGrid}>
            {[
              { icon: "camera.svg", title: "Reconhecimento automático de medicamentos", desc: "Cadastre com uma foto: o sistema identifica o remédio e cria os lembretes sozinho.", delay: "0s" },
              { icon: "mic.svg", title: "Comandos por voz", desc: "Compatível com Alexa e Google Home. Lembretes e confirmações de dose por voz, sem tocar no aparelho.", delay: "0.1s" },
              { icon: "bell.svg", title: "Alertas inteligentes", desc: "O CareMind detecta atrasos e envia avisos antes que o esquecimento se torne um risco.", delay: "0.2s" },
              { icon: "people.svg", title: "Família conectada", desc: "Parentes recebem notificações instantâneas sobre o andamento da rotina.", delay: "0.3s" },
              { icon: "alarm.svg", title: "Rotina personalizada", desc: "Organize horários de refeições, hidratação e atividades diárias com poucos toques.", delay: "0.4s" },
              { icon: "shield.svg", title: "Interface acessível", desc: "Textos grandes, alto contraste e navegação simples para todos os níveis de familiaridade digital.", delay: "0.5s" }
            ].map((feature, index) => (
              <div
                key={index}
                className={`${styles.featureCard} ${styles.scaleIn}`}
                style={{ animationDelay: feature.delay }}
              >
                <div className={styles.featureIconWrapper}>
                  <Image
                    src={`https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/${feature.icon}`}
                    alt={feature.title}
                    className={styles.featureIcon}
                    width={32}
                    height={32}
                  />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <h1 className={`${styles.container_title} ${styles.fadeIn}`}>
            Mais independência para quem precisa, mais tranquilidade pra quem cuida.
          </h1>
        </div>

        <div className={styles.container_itens}>
          <div className={`${styles.container_list} ${styles.slideInLeft}`}>
            <ol className={styles.container_list_ol}>
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

          <div className={`${styles.impactContainer} ${styles.slideInRight}`}>
            <h2 className={styles.title}>Cuidado inteligente que já transforma famílias</h2>
            <p className={styles.description}>
              Com o envelhecimento da população e o aumento dos casos de Alzheimer, o CareMind se tornou uma ferramenta essencial no apoio diário ao cuidado familiar.
            </p>

            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} ${styles.pulse}`}>
                <p className={styles.statNumber}>85%</p>
                <p className={styles.statLabel}>menos esquecimentos registrados</p>
              </div>
              <div className={`${styles.statCard} ${styles.pulse}`} style={{ animationDelay: '0.2s' }}>
                <p className={styles.statNumber}>92%</p>
                <p className={styles.statLabel}>das famílias relatam mais tranquilidade</p>
              </div>
              <div className={`${styles.statCard} ${styles.pulse}`} style={{ animationDelay: '0.4s' }}>
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
