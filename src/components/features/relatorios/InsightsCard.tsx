import { memo, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, TrendingDown, Activity } from 'lucide-react';
import styles from './InsightsCard.module.css';
import type { RelatorioAnalytics } from '@/types/relatorios';

interface Insight {
  id: string;
  title: string;
  description: string;
  level: 'danger' | 'warning' | 'success' | 'info';
  icon: JSX.Element;
}

interface InsightsCardProps {
  analytics: RelatorioAnalytics | null;
}

const buildInsights = (analytics: RelatorioAnalytics | null): Insight[] => {
  if (!analytics) return [];

  const insights: Insight[] = [];
  const { kpis, graficos } = analytics;

  if (kpis.taxa_adesao_total < 50) {
    insights.push({
      id: 'adesao-baixa',
      title: 'Atenção Crítica',
      description: 'A adesão está abaixo de 50%. Reavalie horários, lembretes e acompanhamento familiar.',
      level: 'danger',
      icon: <AlertTriangle size={18} />,
    });
  }

  if (kpis.total_esquecidos > 3) {
    insights.push({
      id: 'esquecimentos',
      title: 'Alerta de Esquecimentos',
      description: `Foram registrados ${kpis.total_esquecidos} esquecimentos neste período.`,
      level: 'warning',
      icon: <Activity size={18} />,
    });
  }

  const tendencia = graficos.tendencia_diaria;
  if (tendencia.length >= 2) {
    const ultima = tendencia[tendencia.length - 1];
    const penultima = tendencia[tendencia.length - 2];
    const variacao = ultima.percentual - penultima.percentual;
    if (variacao <= -5) {
      insights.push({
        id: 'queda-tendencia',
        title: 'Tendência de Queda',
        description: `A adesão caiu ${Math.abs(variacao).toFixed(1)}% em relação ao dia anterior.`,
        level: 'warning',
        icon: <TrendingDown size={18} />,
      });
    }
  }

  const piorTurno = Object.entries(graficos.performance_turnos)
    .map(([turno, stats]) => ({ turno, percentual: stats.percentual }))
    .sort((a, b) => a.percentual - b.percentual)[0];

  if (piorTurno && piorTurno.percentual < 60) {
    insights.push({
      id: 'turno-critico',
      title: 'Horário Problemático',
      description: `O turno da ${piorTurno.turno} tem apenas ${piorTurno.percentual.toFixed(0)}% de adesão.`,
      level: 'info',
      icon: <AlertTriangle size={18} />,
    });
  }

  if (kpis.taxa_adesao_total >= 90) {
    insights.push({
      id: 'adesao-excelente',
      title: 'Excelente Desempenho',
      description: 'O tratamento está sendo seguido com disciplina exemplar.',
      level: 'success',
      icon: <CheckCircle2 size={18} />,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'sem-alertas',
      title: 'Tudo em ordem',
      description: 'Nenhum alerta crítico encontrado neste período.',
      level: 'success',
      icon: <CheckCircle2 size={18} />,
    });
  }

  return insights;
};

export const InsightsCard = memo(({ analytics }: InsightsCardProps) => {
  const insights = useMemo(() => buildInsights(analytics), [analytics]);

  if (!analytics) return null;

  return (
    <div className={styles.insightsCard}>
      <div className={styles.insightsHeader}>
        <h2 className={styles.insightsTitle}>Insights inteligentes</h2>
      </div>
      <div className={styles.insightsList}>
        {insights.map((insight) => (
          <div key={insight.id} className={`${styles.insightItem} ${styles[insight.level]}`}>
            <div className={styles.iconWrapper}>{insight.icon}</div>
            <div className={styles.insightContent}>
              <strong>{insight.title}</strong>
              <p>{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

InsightsCard.displayName = 'InsightsCard';


