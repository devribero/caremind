"use client";
import styles from "./DashboardOverview.module.css";

export default function DashboardOverview() {
  return (
    <div className={styles.wrapper}>
      <section className={styles.banner}>
        <div>
          <h2 className={styles.bannerTitle}>Dashboard CareMind</h2>
          <p className={styles.bannerSubtitle}>Visão completa do seu cuidado</p>
        </div>
      </section>

      <section className={styles.kpis}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Medicamentos de Hoje</span>
          <span className={styles.cardValue}>2 de 5 concluídos</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Rotinas do Dia</span>
          <span className={styles.cardValue}>1 de 3 concluídas</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Alertas Pendentes</span>
          <span className={styles.cardValue}>0</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Status do Vínculo Familiar</span>
          <span className={styles.cardValue}>Conectado</span>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Próximos Medicamentos</h3>
          <div className={styles.placeholder}>Lista de próximos horários aparecerá aqui.</div>
        </div>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Resumo da Semana</h3>
          <div className={styles.placeholder}>Gráfico e indicadores semanais aparecerão aqui.</div>
        </div>
      </section>
    </div>
  );
}
