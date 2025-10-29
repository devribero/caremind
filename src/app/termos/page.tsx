"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import styles from "./page.module.css";

export default function TermosPage() {
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
        <h1 className={styles.content_title}>Termos de Uso</h1>
        <p className={styles.subtitle}>
          Leia os termos e condições para o uso do Caremind.
        </p>

        <section className={styles.section}>
          <p>
            Ao usar o Caremind, você concorda com estes termos de uso.
          </p>

          <h3>Uso do Serviço</h3>
          <p>
            O Caremind é fornecido para uso pessoal e não comercial. Você é responsável por manter a confidencialidade de suas credenciais de acesso.
          </p>

          <h3>Responsabilidades</h3>
          <ul>
            <li>O aplicativo é uma ferramenta de apoio, não substitui aconselhamento médico profissional.</li>
            <li>O usuário é responsável pela precisão dos dados inseridos (medicamentos, horários, etc.).</li>
            <li>Não use o aplicativo para fins ilegais ou prejudiciais.</li>
          </ul>

          <h3>Limitação de Responsabilidade</h3>
          <p>
            O Caremind não se responsabiliza por danos diretos, indiretos ou consequenciais decorrentes do uso do aplicativo, incluindo erros médicos ou falhas em lembretes.
          </p>

          <h3>Modificações</h3>
          <p>
            Podemos atualizar estes termos periodicamente. Continuando a usar o aplicativo após alterações, você concorda com os novos termos.
          </p>

          <h3>Contato</h3>
          <p>
            Para dúvidas sobre privacidade ou termos, entre em contato: suporte@caremind.com
          </p>
        </section>
      </div>
    </main>
  );
}
