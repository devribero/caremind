'use client';

import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Header } from '@/components/shared/headers/HeaderHome';
import { Footer } from '@/components/shared/Footer';
import styles from './page.module.css';
import Image from 'next/image';
import { BsCamera, BsMic, BsBell, BsPeople, BsHeartPulse, BsMegaphone } from 'react-icons/bs';
import { FaQuoteLeft } from 'react-icons/fa';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Hook de Animação no Scroll (Recorrente)
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.active);
        } else {
          // Remove a classe para animar novamente ao rolar de volta
          entry.target.classList.remove(styles.active);
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll(`.${styles.reveal}`);
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [loading]); // Re-run when loading finishes

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
      <Header />

      {/* HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={`${styles.heroContent} ${styles.reveal} ${styles.active}`}>
            
            <h1 className={styles.heroTitle}>
              Cuidado inteligente que traz
              <span className={styles.titleHighlight}> autonomia e segurança</span>
              todos os dias.
            </h1>
            
            <p className={styles.heroDescription}>
              O CareMind ajuda no controle de medicações e rotinas, prevenindo esquecimentos e garantindo mais tranquilidade para famílias e cuidadores.
            </p>
            
            
            <p className={styles.ctaNote}>Sem compromisso • Cancela quando quiser</p>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.mockupContainer}>
              {/* Floating Animation applied here */}
              <div className={`${styles.phoneMockup} ${styles.floating}`}>
                <div className={styles.mockupFrame}>
                  <Image
                    src="/images/print_app_inicio.jpeg"
                    alt="Tela Inicial CareMind"
                    width={300}
                    height={600}
                    className={styles.mockupScreenImage}
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funcionalidades" className={styles.featuresSection}>
        <div className={styles.container}>
          <div className={styles.reveal}>
            <h2 className={styles.sectionTitle}>
              Tecnologia simples para um cuidado completo
            </h2>
            <p className={styles.sectionSubtitle}>
              Funcionalidades pensadas para simplificar o dia a dia de quem cuida e de quem precisa de cuidado.
            </p>
          </div>
          
          <div className={styles.featuresGrid}>
            {[
              { icon: BsCamera, title: "OCR de Medicamentos", desc: "Cadastre com uma foto: o sistema identifica o remédio e cria os lembretes sozinho, exclusivamente a partir de receitas médicas.", delay: "0s", featured: false },
              { icon: BsMic, title: "Comando por Voz", desc: "Compatível com assistentes virtuais como a Alexa. Lembretes e confirmações por voz, sem tocar no aparelho.", delay: "0.1s", featured: false },
              { icon: BsBell, title: "Alertas inteligentes", desc: "O CareMind detecta atrasos e envia avisos antes que o esquecimento se torne um risco.", delay: "0.2s", featured: false },
              { icon: BsPeople, title: "Família conectada", desc: "Parentes recebem notificações instantâneas sobre o andamento da rotina.", delay: "0.3s", featured: false },
              { icon: BsHeartPulse, title: "Botão de Emergência (SOS)", desc: "Em caso de emergência, um toque alerta instantaneamente todos os familiares cadastrados.", delay: "0.4s", featured: false },
              { icon: BsMegaphone, title: "Navegação por Voz (TTS)", desc: "O app fala com o idoso. Menus e instruções são lidos em voz alta para quem tem dificuldade de visão.", delay: "0.5s", featured: false }
            ].map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className={`${styles.featureCard} ${styles.reveal}`}
                  style={{ transitionDelay: `${index * 0.1}s` }}
                >
                  <div className={styles.featureIconWrapper}>
                    <IconComponent className={styles.featureIcon} size={24} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* OCR DEMO SECTION */}
      <section id="como-funciona" className={styles.ocrSection}>
        <div className={styles.container}>
          <div className={styles.ocrGrid}>
            <div className={`${styles.ocrContent} ${styles.reveal}`}>
              <div className={styles.featureBadge}>Exclusivo CareMind</div>
              <h2 className={styles.ocrTitle}>
                Cadastro de medicamentos em <span className={styles.titleHighlight}>segundos</span>
              </h2>
              <p className={styles.ocrDescription}>
                Esqueça a digitação manual. Com nossa tecnologia avançada de OCR (Reconhecimento Óptico de Caracteres), basta apontar a câmera para a **receita médica**.
              </p>
              <ul className={styles.ocrList}>
                <li>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Identificação automática do nome e dosagem (apenas de receitas médicas)</span>
                </li>
                <li>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Sugestão inteligente de horários</span>
                </li>
                <li>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Funciona exclusivamente com receitas médicas</span>
                </li>
              </ul>
            </div>
            <div className={`${styles.ocrVisual} ${styles.reveal}`}>
              {/* Breathing animation for OCR focus */}
              <div className={`${styles.computerFrame} ${styles.breathing}`}>
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className={styles.videoPlayer}
                  poster="/images/print_app_configuracoes.jpeg"
                >
                  <source src="/videos/ocr-demo.mp4" type="video/mp4" />
                  <Image
                    src="/images/print_app_configuracoes.jpeg"
                    alt="OCR Demo"
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </video>
                <div className={styles.scanOverlay}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MOCKUPS SECTION */}
      <section className={styles.mockupsSection}>
        <div className={styles.container}>
          <div className={styles.reveal}>
            <h2 className={styles.sectionTitle}>Veja o CareMind em ação</h2>
            <p className={styles.sectionSubtitle}>Interface sofisticada que faz a diferença no dia a dia</p>
          </div>
          
          <div className={styles.mockupsGrid}>
            {/* Card 1: Gestão */}
            <div className={`${styles.mockupCard} ${styles.reveal}`} style={{ transitionDelay: '0s' }}>
              <div className={styles.mockupVisual}>
                <div className={`${styles.mockupDevice} ${styles.floating}`}>
                  <div className={styles.deviceFrame}>
                    <Image
                      src="/images/print_app_gestao.jpeg"
                      alt="Gestão de Medicamentos"
                      width={260}
                      height={520}
                      className={styles.deviceScreenImage}
                    />
                  </div>
                </div>
              </div>
              <h3>Gestão Simplificada</h3>
              <p>Acompanhe todos os medicamentos, horários e estoques em uma interface limpa e organizada.</p>
            </div>
            
            {/* Card 2: Família */}
            <div className={`${styles.mockupCard} ${styles.reveal}`} style={{ transitionDelay: '0.2s' }}>
              <div className={styles.mockupVisual}>
                <div className={`${styles.mockupDevice} ${styles.floatingReverse}`}>
                  <div className={styles.deviceFrame}>
                    <Image
                      src="/images/print_app_familia.jpeg"
                      alt="Painel Familiar"
                      width={260}
                      height={520}
                      className={styles.deviceScreenImage}
                    />
                  </div>
                </div>
              </div>
              <h3>Painel Familiar</h3>
              <p>Mantenha toda a família conectada e informada sobre a rotina de cuidados em tempo real.</p>
            </div>
            
            {/* Card 3: Perfil */}
            <div className={`${styles.mockupCard} ${styles.reveal}`} style={{ transitionDelay: '0.4s' }}>
              <div className={styles.mockupVisual}>
                <div className={`${styles.mockupDevice} ${styles.floating}`}>
                  <div className={styles.deviceFrame}>
                    <Image
                      src="/images/print_app_perfil.jpeg"
                      alt="Perfil do Usuário"
                      width={260}
                      height={520}
                      className={styles.deviceScreenImage}
                    />
                  </div>
                </div>
              </div>
              <h3>Perfil Completo</h3>
              <p>Gerencie informações pessoais, contatos de emergência e preferências com facilidade.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.container}>
          <div className={styles.reveal}>
            <h2 className={styles.sectionTitle}>Perguntas Frequentes</h2>
            <p className={styles.sectionSubtitle}>Tudo que você precisa saber sobre o CareMind</p>
          </div>
          
          <div className={styles.faqGrid}>
            {[
              { q: "É seguro para idosos com Alzheimer?", a: "Sim. O CareMind foi desenvolvido com interface simplificada, textos grandes e comandos por voz. Além disso, familiares recebem alertas se houver esquecimentos, criando uma rede de segurança completa." },
              { q: "Como funciona o alerta de esquecimento?", a: "O sistema envia notificações para o aplicativo do idoso e também para os familiares vinculados. Se não houver confirmação em até 30 minutos, o alerta é escalonado com notificações adicionais." },
              { q: "Precisa de internet sempre?", a: "Para melhores resultados, sim. O aplicativo precisa de internet para sincronizar dados e enviar alertas. No entanto, lembretes locais funcionam mesmo sem conexão temporária." },
              { q: "Funciona sem Alexa?", a: "Sim! A integração com Alexa é opcional. Todas as funcionalidades principais funcionam normalmente pelo aplicativo, incluindo lembretes, confirmações e acompanhamento familiar." },
              { q: "O familiar precisa baixar aplicativo?", a: "Familiares podem acessar pelo painel web em qualquer computador ou celular. O aplicativo mobile é opcional e oferece conveniência adicional para acompanhamento." },
              { q: "Como funciona o cadastro por foto?", a: "Basta tirar uma foto da receita médica. Nosso sistema de reconhecimento identifica os medicamentos, dosagens e frequências automaticamente. Você só precisa confirmar as informações." }
            ].map((faq, idx) => (
              <div key={idx} className={`${styles.faqItem} ${styles.reveal}`} style={{ transitionDelay: `${idx * 0.05}s` }}>
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <Footer />
      </footer>
    </main>
  );
}