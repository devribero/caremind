'use client';

import { FaMicrophone, FaBell, FaClock } from "react-icons/fa";
import { Header } from '@/components/headers/HeaderHome';
import { IoShieldCheckmarkSharp } from "react-icons/io5";
import { BsFillPeopleFill } from "react-icons/bs";
import { Button } from "@/components/ui/button"
import { Footer } from '@/components/Footer';
import { IoIosCamera } from "react-icons/io";
import { FaHeart } from 'react-icons/fa';
import styles from './page.module.css';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redireciona para o dashboard se o usuário já estiver logado
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Mostra loading enquanto verifica a autenticação
  if (loading) {
    return (
      <main className={styles.main}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px'
        }}>
          Carregando...
        </div>
      </main>
    );
  }
  return (
    <main className={styles.main}>

      <Header />

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.logoWrapper}>
            <Image
              src="/logo.png"
              alt="CareMind Logo"
              width={500} // Defina a largura real da sua imagem /logo.png
              height={170} // Defina a altura real da sua imagem /logo.png
              className={styles.logo} // Sua classe CSS ainda funciona
            />
          </div>
          <h1 className={styles.title}>
            Cuidado Inteligente para Quem Você Ama
          </h1>
          <p className={styles.description}>
            Assistente virtual com integração por voz para auxiliar idosos no gerenciamento de medicações e rotinas diárias.
            Mais autonomia para eles, mais tranquilidade para a família.
          </p>
          <div className={styles.buttonGroup}>
            <Link href="/login">
              <Button size="lg" className={styles.primaryButton}>
                Experimente
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.section_2}>
        <div className={styles.container}>
          <h1 className={styles.container_title}>Funcionalidades Principais</h1>
          <div className={styles.container_cards}>
            <div className={styles.card}>
              <IoIosCamera />
              <h1>Camera Inteligente</h1>
              <p>Cadastre medicamentos facilmente fotografando a cartela. O sistema identifica automaticamente o remédio e suas informações.</p>
            </div>
            <div className={styles.card}>
              <FaMicrophone />
              <h1>Comandos de Voz</h1>
              <p>Integração com Alexa e Google Home para lembretes por voz, confirmação de doses e controle total sem precisar tocar em nada.</p>
            </div>
            <div className={styles.card}>
              <FaBell />
              <h1>Alertas Inteligentes</h1>
              <p>Lembretes automáticos para medicamentos, refeições, consultas médicas e outras atividades importantes da rotina.</p>
            </div>
            <div className={styles.card}>
              <BsFillPeopleFill />
              <h1>Notificação Familiar</h1>
              <p>Familiares recebem alertas automáticos em caso de esquecimento ou não confirmação da medicação, mantendo todos informados.</p>
            </div>
            <div className={styles.card}>
              <FaClock />
              <h1>Rotina Personalizada</h1>
              <p>Controle completo de tarefas cotidianas: horários de refeições, caminhadas, ingestão de água e atividades personalizáveis.</p>
            </div>
            <div className={styles.card}>
              <IoShieldCheckmarkSharp />
              <h1>Interface Acessível</h1>
              <p>Design adaptado para pessoas com dificuldades visuais ou cognitivas, com fontes grandes, cores contrastantes e navegação simplificada.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section_3}>
        <div className={styles.container}>
          <h1 className={styles.container_title}>Por Que Escolher o CareMind?</h1>
          <div className={styles.container_itens}>
            <div className={styles.container_list}>
              <ol>
                <li>
                  <h1>1. Mais Autonomia</h1>
                  <p>Permite que idosos mantenham sua independência com segurança, reduzindo a dependência de familiares para tarefas básicas.</p>
                </li>
                <li>
                  <h1>2. Segurança Familiar</h1>
                  <p>Familiares ficam tranquilos sabendo que seus entes queridos estão sendo acompanhados e receberão alertas em caso de necessidade.</p>
                </li>
                <li>
                  <h1>3. Prevenção de Riscos</h1>
                  <p>Evita esquecimentos perigosos de medicamentos e ajuda a manter uma rotina saudável e organizada.</p>
                </li>
                <li>
                  <h1>4. Tecnologia Simples</h1>
                  <p>Interface intuitiva e comandos de voz naturais tornam a tecnologia acessível mesmo para quem não tem familiaridade com dispositivos digitais.</p>
                </li>
              </ol>
            </div>
            <div className={styles.impactContainer}>
              <div className={styles.iconWrapper}>
                <FaHeart size={40} color="white" />
              </div>
              <h1 className={styles.title}>Impacto Social</h1>
              <p className={styles.description}>
                Com o envelhecimento da população e o aumento de casos de Alzheimer, o CareMind representa uma solução tecnológica essencial para apoiar idosos e suas famílias.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <h2 className={styles.statNumber}>85%</h2>
                  <p className={styles.statLabel}>Redução de esquecimentos</p>
                </div>
                <div className={styles.statCard}>
                  <h2 className={styles.statNumber}>92%</h2>
                  <p className={styles.statLabel}>Satisfação familiar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

    </main>
  );
}