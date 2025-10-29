"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import styles from "./page.module.css";

export default function PoliticaPrivacidadePage() {
  const router = useRouter();

  return (
    <main className={styles.main}>
      <button 
        onClick={() => router.push('/')} 
        className={styles.backButton}
        aria-label="Voltar à página inicial"
      >
        <ArrowLeft size={24} />
      </button>
      <div className={styles.content}>
        <h1 className={styles.content_title}>Política de Privacidade</h1>
        <p className={styles.subtitle}>
          Saiba como seus dados são coletados, armazenados e utilizados no Caremind.
        </p>

        <section className={styles.section}>
          <p>
            O Caremind é um aplicativo dedicado ao cuidado de idosos, ajudando cuidadores a gerenciar medicamentos, rotinas e compromissos de forma organizada e segura.
          </p>

          <h3>Dados Coletados</h3>
          <p>
            Coletamos os seguintes tipos de dados pessoais:
          </p>
          <ul>
            <li><strong>Dados de Conta:</strong> Nome, email, tipo de conta (individual ou familiar).</li>
            <li><strong>Dados de Medicamentos:</strong> Nome do medicamento, dosagem, frequência, quantidade.</li>
            <li><strong>Dados de Compromissos:</strong> Título, descrição, data e hora, local, tipo de compromisso.</li>
            <li><strong>Dados de Integração:</strong> Tokens de acesso para integrações com terceiros, como Amazon Alexa.</li>
          </ul>

          <h3>Armazenamento e Segurança</h3>
          <p>
            Todos os dados são armazenados no Supabase, um banco de dados seguro na nuvem, protegido por Row Level Security (RLS). Isso significa que cada usuário só pode acessar seus próprios dados ou dados de idosos vinculados a eles (no caso de contas familiares).
          </p>
          <p>
            Implementamos medidas de segurança para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição.
          </p>

          <h3>Uso dos Dados</h3>
          <p>
            Os dados são utilizados exclusivamente para fornecer as funcionalidades do aplicativo:
          </p>
          <ul>
            <li>Gerenciamento de medicamentos e lembretes.</li>
            <li>Organização de compromissos e rotinas.</li>
            <li>Relatórios e dashboards para cuidadores.</li>
            <li>Integrações com dispositivos inteligentes para lembretes automáticos.</li>
          </ul>

          <h3>Integrações e Compartilhamento</h3>
          <p>
            Para integrações com Amazon Alexa, coletamos tokens de acesso necessários para a autenticação. Esses tokens são usados exclusivamente para funcionalidades de lembrete e confirmação de medicamentos, rotinas e compromissos. Não compartilhamos esses dados com terceiros além do necessário para a integração.
          </p>
          <p>
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD), não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais, exceto quando exigido por lei.
          </p>

          <h3>Seus Direitos</h3>
          <p>
            Você tem o direito de acessar, corrigir, excluir ou portar seus dados. Para exercer esses direitos, entre em contato conosco através do email de suporte.
          </p>
        </section>
      </div>
    </main>
  );
}
