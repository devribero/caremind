



"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useIdoso } from '@/contexts/IdosoContext';
import { FullScreenLoader } from '@/components/features/FullScreenLoader';
import { InsightsCard } from '@/components/features/relatorios/InsightsCard';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/features/Toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import styles from './page.module.css';
import type { RelatorioAnalytics } from '@/types/relatorios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

interface HistoricoEventoResponse {
  id: string | number;
  titulo: string | null;
  descricao: string | null;
  data_prevista: string;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'atrasado' | string;
  tipo_evento: string;
  horario_confirmacao?: string | null;
}

interface EventoHistorico {
  id: string;
  tipo: 'Medicamento' | 'Rotina';
  nome: string;
  data_prevista: string;
  status: string;
  created_at: string;
  horario_confirmacao?: string | null;
}

export default function Relatorios() {
  const { user } = useAuth();
  const router = useRouter();
  const { profile } = useProfile();
  const { idosoSelecionadoId, listaIdososVinculados } = useIdoso();
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<EventoHistorico[]>([]);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [tipoSelecionado, setTipoSelecionado] = useState<'Todos' | 'Medicamento' | 'Rotina'>('Todos');
  const [applyTick, setApplyTick] = useState<number>(0);
  const [analytics, setAnalytics] = useState<RelatorioAnalytics | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const isFamiliar = user?.user_metadata?.account_type === 'familiar';
  const targetProfileId = isFamiliar ? idosoSelecionadoId : profile?.id;
  const selectedElderName = useMemo(() => (
    listaIdososVinculados.find((i) => i.id === idosoSelecionadoId)?.nome || null
  ), [listaIdososVinculados, idosoSelecionadoId]);

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: number) => `${value}%`,
        },
        grid: {
          borderDash: [2, 4],
        },
      },
    },
  };

  useEffect(() => {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);
    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    setDataInicio((prev) => prev || toYMD(seteDiasAtras));
    setDataFim((prev) => prev || toYMD(hoje));
  }, []);

  useEffect(() => {
    const fetchEventos = async () => {
      if (!user) {
        router.push('/auth');
        return;
      }
      if (isFamiliar && !targetProfileId) {
        setEventos([]);
        setLoading(false);
        return;
      }
      if (!targetProfileId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        if (!dataInicio || !dataFim) {
          setEventos([]);
          setLoading(false);
          return;
        }

        const bodyBase = {
          perfil_id: targetProfileId,
          data_inicio: dataInicio,
          data_fim: dataFim,
        };

        const [eventosResponse, analyticsResponse] = await Promise.all([
          supabase.functions.invoke<HistoricoEventoResponse[]>('relatorios-historico', {
            body: bodyBase,
          }),
          supabase.functions.invoke<RelatorioAnalytics>('relatorios-historico', {
            body: {
              ...bodyBase,
              mode: 'analytics',
            },
          }),
        ]);

        if (eventosResponse.error) {
          throw new Error(eventosResponse.error.message);
        }

        if (analyticsResponse.error) {
          throw new Error(analyticsResponse.error.message);
        }

        const eventosHistorico = Array.isArray(eventosResponse.data) ? eventosResponse.data : [];

        // Filtrar por tipo de evento se necessário
        let eventosFiltrados = eventosHistorico;
        if (tipoSelecionado && tipoSelecionado !== 'Todos') {
          eventosFiltrados = eventosHistorico.filter(
            e => e.tipo_evento.toLowerCase() === tipoSelecionado.toLowerCase()
          );
        }

        // Mapear para o formato esperado pela UI
        const eventosFormatados: EventoHistorico[] = eventosFiltrados.map((evento) => ({
          id: evento.id.toString(),
          tipo: (evento.tipo_evento === 'medicamento' ? 'Medicamento' : 'Rotina') as 'Medicamento' | 'Rotina',
          nome: evento.titulo ?? 'Evento',
          data_prevista: evento.data_prevista,
          status: evento.status === 'confirmado' ? 'Confirmado' : 
                  evento.status === 'pendente' ? 'Pendente' :
                  evento.status === 'cancelado' ? 'Cancelado' :
                  evento.status === 'atrasado' ? 'Atrasado' : 'Pendente',
          created_at: evento.data_prevista,
          horario_confirmacao: evento.horario_confirmacao,
        }));

        setEventos(eventosFormatados);
        setAnalytics(analyticsResponse.data ?? null);
      } catch (err) {
        console.error('Erro ao buscar eventos:', err);
        setEventos([]);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEventos();
  }, [user, router, targetProfileId, isFamiliar, dataInicio, dataFim, tipoSelecionado, applyTick, supabase]);

  // Função para calcular estatísticas por período
  const calcularEstatisticas = (dias: number) => {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    const eventosRecentes = eventos.filter(evento => 
      new Date(evento.data_prevista) >= dataLimite
    );

    const total = eventosRecentes.length;
    const tomados = eventosRecentes.filter(e => 
      e.status === 'Tomado' || e.status === 'Realizado' || e.status === 'Confirmado'
    ).length;
    const perdidos = eventosRecentes.filter(e => 
      e.status === 'Não tomado' || e.status === 'Perdido' || e.status === 'Atrasado'
    ).length;

    return {
      total,
      tomados,
      perdidos
    };
  };

  const stats7Dias = useMemo(() => calcularEstatisticas(7), [eventos]);
  const stats30Dias = useMemo(() => calcularEstatisticas(30), [eventos]);

  // Dados do gráfico semanal
  const chartData = useMemo(() => {
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 7);

    // Inicializar contadores por dia da semana
    const dailyStats = daysOfWeek.map(() => ({ total: 0, realizados: 0 }));

    // Filtrar eventos dos últimos 7 dias
    const eventosUltimos7Dias = eventos.filter(evento => {
      const dataEvento = new Date(evento.data_prevista);
      return dataEvento >= seteDiasAtras && dataEvento <= hoje;
    });

    // Contar eventos por dia da semana
    eventosUltimos7Dias.forEach(evento => {
      const data = new Date(evento.data_prevista);
      const dayIndex = data.getDay();
      dailyStats[dayIndex].total++;
      
      if (evento.status === 'Tomado' || evento.status === 'Realizado' || evento.status === 'Confirmado') {
        dailyStats[dayIndex].realizados++;
      }
    });

    return {
      labels: daysOfWeek,
      datasets: [{
        label: 'Realizados (%)',
        data: dailyStats.map(day => 
          day.total > 0 ? Math.round((day.realizados / day.total) * 100) : 0
        ),
        backgroundColor: '#0400BA',
        borderRadius: 6,
        barThickness: 20,
      }]
    };
  }, [eventos]);

  // Função para formatar data
  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para formatar hora
  const formatarHora = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para determinar classe do status
  const getStatusClassName = (status: string) => {
    const statusesPositivos = ['Tomado', 'Realizado', 'Confirmado'];
    const statusesNegativos = ['Não tomado', 'Perdido', 'Atrasado'];
    
    if (statusesPositivos.includes(status)) {
      return styles.statusTomado;
    } else if (statusesNegativos.includes(status)) {
      return styles.statusPerdido;
    }
    return '';
  };

  const tendenciaChartData = useMemo(() => {
    if (!analytics?.graficos.tendencia_diaria?.length) return null;
    return {
      labels: analytics.graficos.tendencia_diaria.map(item => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(item.data))),
      datasets: [
        {
          label: 'Adesão (%)',
          data: analytics.graficos.tendencia_diaria.map(item => item.percentual),
          borderColor: '#0400BA',
          backgroundColor: 'rgba(4, 0, 186, 0.1)',
          pointBackgroundColor: '#0400BA',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [analytics]);

  const tendenciaChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.parsed.y}%` } },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 100,
        ticks: {
          callback: (value: number) => `${value}%`,
        },
      },
      x: {
        grid: { display: false },
      },
    },
  }), []);

  const turnosChartData = useMemo(() => {
    const turnos = analytics?.graficos.performance_turnos;
    if (!turnos) return null;
    const labels = ['Manhã', 'Tarde', 'Noite'];
    const keys: ('manha' | 'tarde' | 'noite')[] = ['manha', 'tarde', 'noite'];
    return {
      labels,
      datasets: [
        {
          label: 'Confirmados',
          data: keys.map((k) => turnos[k]?.confirmados ?? 0),
          backgroundColor: '#0400BA',
        },
        {
          label: 'Esquecidos',
          data: keys.map((k) => turnos[k]?.esquecidos ?? 0),
          backgroundColor: '#dc3545',
        },
      ],
    };
  }, [analytics]);

  const turnosChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
      },
    },
  }), []);

  const comparativoTipoData = useMemo(() => {
    const resumo = analytics?.graficos.resumo_por_tipo;
    if (!resumo) return null;
    return {
      labels: ['Medicamentos', 'Rotinas'],
      datasets: [
        {
          label: 'Adesão (%)',
          data: [
            resumo.medicamento?.percentual ?? 0,
            resumo.rotina?.percentual ?? 0,
          ],
          backgroundColor: ['#04BA82', '#0400BA'],
          borderRadius: 6,
        },
      ],
    };
  }, [analytics]);

  const comparativoTipoOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.parsed.y ?? ctx.parsed.x}%`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: number) => `${value}%`,
        },
      },
      y: {
        grid: { display: false },
      },
    },
  }), []);

  const adesaoDoughnutData = useMemo(() => {
    if (!analytics) return null;
    const adesao = analytics.kpis.taxa_adesao_total;
    const restante = Math.max(0, 100 - adesao);
    return {
      labels: ['Confirmados', 'Pendentes/Atrasados'],
      datasets: [
        {
          data: [adesao, restante],
          backgroundColor: ['#0400BA', '#e0e7ff'],
          borderWidth: 0,
        },
      ],
    };
  }, [analytics]);

  const doughnutOptions = useMemo(() => ({
    cutout: '70%',
    plugins: {
      legend: { display: false },
    },
  }), []);

  const handleExportPDF = useCallback(async () => {
    const element = document.getElementById('relatorio-print-container');
    if (!element || isExporting) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFontSize(18);
      pdf.text(`Relatório de Saúde - Caremind`, 10, 10);
      pdf.setFontSize(12);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 10, 16);

      pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
      pdf.save(`relatorio-caremind-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF', err);
      toast.error('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  if (loading) {
    return (
      <div className={styles.main}>
        <div className={styles.content}>
          <FullScreenLoader />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={styles.content}>
        <h1 className={styles.content_title}>
          {selectedElderName ? `Histórico de ${selectedElderName}` : 'Histórico de Medicamentos e Rotinas'}
        </h1>
        {isFamiliar && !idosoSelecionadoId && (
          <div className={styles.emptyState}>
            <p>Selecione um idoso no menu superior para visualizar os relatórios.</p>
          </div>
        )}
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Data Início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label>Data Fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label>Tipo de Evento</label>
            <select value={tipoSelecionado} onChange={(e) => setTipoSelecionado(e.target.value as any)}>
              <option value="Todos">Todos</option>
              <option value="Medicamento">Medicamentos</option>
              <option value="Rotina">Rotinas</option>
            </select>
          </div>
          <div className={styles.filterActions}>
            <button onClick={() => setApplyTick((n) => n + 1)}>Aplicar Filtros</button>
            <button onClick={() => {
              const hoje = new Date();
              const seteDiasAtras = new Date();
              seteDiasAtras.setDate(hoje.getDate() - 7);
              const toYMD = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
              };
              setDataInicio(toYMD(seteDiasAtras));
              setDataFim(toYMD(hoje));
              setTipoSelecionado('Todos');
              setApplyTick((n) => n + 1);
            }}>Limpar Filtros</button>
            <button
              type="button"
              className={styles.exportButton}
              onClick={handleExportPDF}
              disabled={isExporting || !analytics}
            >
              <Download size={16} />
              {isExporting ? 'Gerando...' : 'Exportar PDF'}
            </button>
          </div>
        </div>
        
        <div id="relatorio-print-container" className={styles.printContainer}>
          {analytics && (
            <>
              <InsightsCard analytics={analytics} />
              <div className={styles.summaryGrid}>
                <div className={`${styles.reportCard} ${styles.donutCard}`}>
                  <div className={styles.cardTitleRow}>
                    <h2 className={styles.cardTitle}>Adesão Geral</h2>
                    <span className={styles.cardSubtitle}>Período selecionado</span>
                  </div>
                  <div className={styles.donutWrapper}>
                    {adesaoDoughnutData ? (
                      <Doughnut data={adesaoDoughnutData} options={doughnutOptions} />
                    ) : (
                      <span>Sem dados</span>
                    )}
                    <div className={styles.donutCenter}>
                      <strong>{analytics.kpis.taxa_adesao_total?.toFixed(1)}%</strong>
                      <span>Adesão</span>
                    </div>
                  </div>
                </div>

                <div className={styles.reportCard}>
                  <h2 className={styles.cardTitle}>Total de Atividades</h2>
                  <p className={styles.kpiValue}>{analytics.kpis.total_eventos}</p>
                  <p className={styles.kpiLabel}>Eventos agendados</p>
                  <div className={styles.kpiSplit}>
                    <div>
                      <span>Confirmados</span>
                      <strong>{analytics.kpis.total_confirmados}</strong>
                    </div>
                    <div>
                      <span>Em aberto</span>
                      <strong>{analytics.kpis.total_eventos - analytics.kpis.total_confirmados}</strong>
                    </div>
                  </div>
                </div>

                <div className={`${styles.reportCard} ${styles.alertCard}`}>
                  <h2 className={styles.cardTitle}>Alertas & Esquecimentos</h2>
                  <p className={styles.kpiValueDanger}>{analytics.kpis.total_esquecidos}</p>
                  <p className={styles.kpiLabel}>Eventos pendentes ou atrasados</p>
                  <div className={styles.kpiSplit}>
                    <div>
                      <span>Índice de esquecimento</span>
                      <strong>{analytics.kpis.indice_esquecimento}</strong>
                    </div>
                    <div>
                      <span>Pontualidade média</span>
                      <strong>
                        {analytics.kpis.pontualidade_media_minutos !== null
                          ? `${analytics.kpis.pontualidade_media_minutos} min`
                          : '—'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h2 className={styles.chartTitle}>Tendência de Adesão</h2>
                  <h3 className={styles.chartSubtitle}>Acompanhe se o cuidado está melhorando</h3>
                  <div className={styles.chartBody}>
                    {tendenciaChartData ? (
                      <Line options={tendenciaChartOptions} data={tendenciaChartData} />
                    ) : (
                      <p>Sem dados suficientes para o período selecionado.</p>
                    )}
                  </div>
                </div>

                <div className={styles.chartContainer}>
                  <h2 className={styles.chartTitle}>Performance por Turno</h2>
                  <h3 className={styles.chartSubtitle}>Identifique horários críticos</h3>
                  <div className={styles.chartBody}>
                    {turnosChartData ? (
                      <Bar options={turnosChartOptions} data={turnosChartData} />
                    ) : (
                      <p>Sem dados suficientes para o período selecionado.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.chartContainer}>
                <h2 className={styles.chartTitle}>Comparativo Medicamentos vs Rotinas</h2>
                <h3 className={styles.chartSubtitle}>Onde o idoso precisa de mais suporte?</h3>
                <div className={styles.chartBody}>
                  {comparativoTipoData ? (
                    <Bar options={comparativoTipoOptions} data={comparativoTipoData} />
                  ) : (
                    <p>Sem dados suficientes para o período selecionado.</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className={styles.chartContainer}>
            <h2 className={styles.chartTitle}>Acompanhamento Semanal</h2>
            <h3 className={styles.chartSubtitle}>Porcentagem de eventos realizados por dia da semana</h3>
            <div style={{ height: '300px' }}>
              <Bar options={chartOptions} data={chartData} />
            </div>
          </div>

          <div className={styles.reportContainer}>
            <h2 className={styles.cardTitle}>Detalhamento de Eventos</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Tipo</th>
                    <th>Nome</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.length > 0
                    ? eventos.map((evento) => (
                        <tr key={evento.id}>
                          <td>{formatarData(evento.data_prevista)}</td>
                          <td>{formatarHora(evento.data_prevista)}</td>
                          <td>{evento.tipo}</td>
                          <td>{evento.nome}</td>
                          <td className={getStatusClassName(evento.status)}>
                            {evento.status}
                          </td>
                        </tr>
                      ))
                    : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                            Nenhum evento encontrado. Os eventos serão registrados automaticamente quando você adicionar medicamentos ou rotinas.
                          </td>
                        </tr>
                      )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}