"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useIdoso } from '@/contexts/IdosoContext';
import { FullScreenLoader } from '@/components/features/FullScreenLoader';
import { InsightsCard } from '@/components/features/relatorios/InsightsCard';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/features/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const { profile } = useProfileContext();
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
    if (isExporting || !analytics) return;

    setIsExporting(true);
    try {
      const doc = new jsPDF();

      // Configurações iniciais
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPos = 20;

      // Função auxiliar para desenhar barra horizontal
      const drawHorizontalBar = (x: number, y: number, width: number, height: number, value: number, maxValue: number, color: [number, number, number]) => {
        const barWidth = (value / maxValue) * width;
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(x, y, width, height, 2, 2, 'F');
        doc.setFillColor(...color);
        doc.roundedRect(x, y, barWidth, height, 2, 2, 'F');
      };

      // Função auxiliar para desenhar donut/círculo de progresso
      const drawProgressCircle = (centerX: number, centerY: number, radius: number, percentage: number, color: [number, number, number]) => {
        // Círculo de fundo
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(4);
        doc.circle(centerX, centerY, radius, 'S');
        
        // Arco de progresso (simulado com múltiplos segmentos)
        doc.setDrawColor(...color);
        doc.setLineWidth(4);
        const segments = Math.floor((percentage / 100) * 36);
        for (let i = 0; i < segments; i++) {
          const angle1 = (i * 10 - 90) * (Math.PI / 180);
          const angle2 = ((i + 1) * 10 - 90) * (Math.PI / 180);
          const x1 = centerX + radius * Math.cos(angle1);
          const y1 = centerY + radius * Math.sin(angle1);
          const x2 = centerX + radius * Math.cos(angle2);
          const y2 = centerY + radius * Math.sin(angle2);
          doc.line(x1, y1, x2, y2);
        }
      };

      // Cabeçalho
      doc.setFontSize(22);
      doc.setTextColor(4, 0, 186);
      doc.text('Relatório de Saúde - Caremind', margin, yPos);
      yPos += 10;

      // Informações do Relatório
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, yPos);
      yPos += 5;
      if (selectedElderName) {
        doc.text(`Idoso: ${selectedElderName}`, margin, yPos);
        yPos += 5;
      }
      doc.text(`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, margin, yPos);
      yPos += 12;

      // Linha separadora
      doc.setDrawColor(4, 0, 186);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // ========== SEÇÃO: RESUMO GERAL ==========
      doc.setFontSize(14);
      doc.setTextColor(4, 0, 186);
      doc.text('RESUMO GERAL', margin, yPos);
      yPos += 10;

      // Cards de KPIs em grid
      const cardWidth = (pageWidth - margin * 3) / 2;
      const cardHeight = 28;

      // Card 1: Taxa de Adesão
      doc.setFillColor(248, 248, 255);
      doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Taxa de Adesão Total', margin + 5, yPos + 8);
      doc.setFontSize(18);
      doc.setTextColor(4, 0, 186);
      doc.text(`${analytics.kpis.taxa_adesao_total.toFixed(1)}%`, margin + 5, yPos + 22);

      // Card 2: Total de Eventos
      doc.setFillColor(248, 248, 255);
      doc.roundedRect(margin * 2 + cardWidth, yPos, cardWidth, cardHeight, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Total de Eventos', margin * 2 + cardWidth + 5, yPos + 8);
      doc.setFontSize(18);
      doc.setTextColor(4, 0, 186);
      doc.text(`${analytics.kpis.total_eventos}`, margin * 2 + cardWidth + 5, yPos + 22);

      yPos += cardHeight + 5;

      // Card 3: Confirmados
      doc.setFillColor(232, 255, 243);
      doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Eventos Confirmados', margin + 5, yPos + 8);
      doc.setFontSize(18);
      doc.setTextColor(4, 186, 130);
      doc.text(`${analytics.kpis.total_confirmados}`, margin + 5, yPos + 22);

      // Card 4: Esquecidos
      doc.setFillColor(255, 240, 240);
      doc.roundedRect(margin * 2 + cardWidth, yPos, cardWidth, cardHeight, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Esquecidos/Pendentes', margin * 2 + cardWidth + 5, yPos + 8);
      doc.setFontSize(18);
      doc.setTextColor(220, 53, 69);
      doc.text(`${analytics.kpis.total_esquecidos}`, margin * 2 + cardWidth + 5, yPos + 22);

      yPos += cardHeight + 10;

      // Card extra: Pontualidade e Índice de Esquecimento
      doc.setFillColor(248, 248, 255);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Índice de Esquecimento: ${analytics.kpis.indice_esquecimento}`, margin + 5, yPos + 12);
      doc.text(`Pontualidade Média: ${analytics.kpis.pontualidade_media_minutos !== null ? analytics.kpis.pontualidade_media_minutos + ' min' : '—'}`, pageWidth / 2 + 10, yPos + 12);

      yPos += 30;

      // ========== SEÇÃO: GRÁFICO DE ADESÃO ==========
      doc.setFontSize(14);
      doc.setTextColor(4, 0, 186);
      doc.text('ADESAO GERAL', margin, yPos);
      yPos += 8;

      // Desenhar círculo de progresso
      const circleX = pageWidth / 2;
      const circleY = yPos + 25;
      drawProgressCircle(circleX, circleY, 18, analytics.kpis.taxa_adesao_total, [4, 0, 186]);
      
      // Texto no centro
      doc.setFontSize(14);
      doc.setTextColor(4, 0, 186);
      doc.text(`${analytics.kpis.taxa_adesao_total.toFixed(1)}%`, circleX, circleY + 2, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('Adesão', circleX, circleY + 8, { align: 'center' });

      yPos += 55;

      // ========== SEÇÃO: TENDÊNCIA DIÁRIA ==========
      if (analytics.graficos.tendencia_diaria?.length) {
        doc.setFontSize(14);
        doc.setTextColor(4, 0, 186);
        doc.text('TENDENCIA DE ADESAO DIARIA', margin, yPos);
        yPos += 8;

        const tendData = analytics.graficos.tendencia_diaria;
        const chartWidth = pageWidth - margin * 2;
        const chartHeight = 40;
        const maxVal = 100;

        // Eixos
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos + chartHeight, margin + chartWidth, yPos + chartHeight); // X
        doc.line(margin, yPos, margin, yPos + chartHeight); // Y

        // Escala Y
        doc.setFontSize(7);
        doc.setTextColor(150);
        for (let i = 0; i <= 4; i++) {
          const val = (i * 25);
          const posY = yPos + chartHeight - (val / maxVal) * chartHeight;
          doc.text(`${val}%`, margin - 2, posY + 1, { align: 'right' });
          doc.setDrawColor(230);
          doc.line(margin, posY, margin + chartWidth, posY);
        }

        // Desenhar linha e pontos
        const stepX = chartWidth / (tendData.length - 1 || 1);
        doc.setDrawColor(4, 0, 186);
        doc.setLineWidth(0.8);

        for (let i = 0; i < tendData.length; i++) {
          const x = margin + i * stepX;
          const y = yPos + chartHeight - (tendData[i].percentual / maxVal) * chartHeight;

          if (i > 0) {
            const prevX = margin + (i - 1) * stepX;
            const prevY = yPos + chartHeight - (tendData[i - 1].percentual / maxVal) * chartHeight;
            doc.line(prevX, prevY, x, y);
          }

          // Ponto
          doc.setFillColor(4, 0, 186);
          doc.circle(x, y, 1.5, 'F');

          // Label X
          if (i % Math.ceil(tendData.length / 7) === 0 || tendData.length <= 7) {
            doc.setFontSize(6);
            doc.setTextColor(100);
            const dateLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(tendData[i].data));
            doc.text(dateLabel, x, yPos + chartHeight + 5, { align: 'center' });
          }
        }

        yPos += chartHeight + 15;
      }

      // ========== SEÇÃO: PERFORMANCE POR TURNO ==========
      const turnos = analytics.graficos.performance_turnos;
      if (turnos) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(4, 0, 186);
        doc.text('PERFORMANCE POR TURNO', margin, yPos);
        yPos += 10;

        const turnoLabels = ['Manhã', 'Tarde', 'Noite'];
        const turnoKeys: ('manha' | 'tarde' | 'noite')[] = ['manha', 'tarde', 'noite'];
        const barHeight = 12;
        const maxTurno = Math.max(
          ...turnoKeys.map(k => (turnos[k]?.confirmados ?? 0) + (turnos[k]?.esquecidos ?? 0)),
          1
        );

        turnoKeys.forEach((key, idx) => {
          const confirmados = turnos[key]?.confirmados ?? 0;
          const esquecidos = turnos[key]?.esquecidos ?? 0;
          const total = confirmados + esquecidos;

          doc.setFontSize(10);
          doc.setTextColor(50);
          doc.text(turnoLabels[idx], margin, yPos + 8);

          const barX = margin + 25;
          const barWidth = pageWidth - margin * 2 - 60;

          // Barra de fundo
          doc.setFillColor(230, 230, 230);
          doc.roundedRect(barX, yPos, barWidth, barHeight, 2, 2, 'F');

          // Barra confirmados
          if (confirmados > 0) {
            const confWidth = (confirmados / maxTurno) * barWidth;
            doc.setFillColor(4, 0, 186);
            doc.roundedRect(barX, yPos, confWidth, barHeight, 2, 2, 'F');
          }

          // Barra esquecidos
          if (esquecidos > 0) {
            const confWidth = (confirmados / maxTurno) * barWidth;
            const esqWidth = (esquecidos / maxTurno) * barWidth;
            doc.setFillColor(220, 53, 69);
            doc.roundedRect(barX + confWidth, yPos, esqWidth, barHeight, 2, 2, 'F');
          }

          // Valores
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`${confirmados} conf. / ${esquecidos} esq.`, barX + barWidth + 3, yPos + 8);

          yPos += barHeight + 5;
        });

        // Legenda
        yPos += 3;
        doc.setFillColor(4, 0, 186);
        doc.rect(margin, yPos, 8, 4, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('Confirmados', margin + 10, yPos + 3);

        doc.setFillColor(220, 53, 69);
        doc.rect(margin + 45, yPos, 8, 4, 'F');
        doc.text('Esquecidos', margin + 55, yPos + 3);

        yPos += 15;
      }

      // ========== SEÇÃO: COMPARATIVO MEDICAMENTOS VS ROTINAS ==========
      const resumoTipo = analytics.graficos.resumo_por_tipo;
      if (resumoTipo) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(4, 0, 186);
        doc.text('MEDICAMENTOS VS ROTINAS', margin, yPos);
        yPos += 10;

        const tipoLabels = ['Medicamentos', 'Rotinas'];
        const tipoKeys: ('medicamento' | 'rotina')[] = ['medicamento', 'rotina'];
        const tipoColors: [number, number, number][] = [[4, 186, 130], [4, 0, 186]];

        tipoKeys.forEach((key, idx) => {
          const percentual = resumoTipo[key]?.percentual ?? 0;
          const total = resumoTipo[key]?.total ?? 0;
          const confirmados = resumoTipo[key]?.confirmados ?? 0;

          doc.setFontSize(10);
          doc.setTextColor(50);
          doc.text(tipoLabels[idx], margin, yPos + 8);

          const barX = margin + 35;
          const barWidth = pageWidth - margin * 2 - 70;

          drawHorizontalBar(barX, yPos, barWidth, 10, percentual, 100, tipoColors[idx]);

          doc.setFontSize(9);
          doc.setTextColor(...tipoColors[idx]);
          doc.text(`${percentual.toFixed(1)}%`, barX + barWidth + 3, yPos + 7);

          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(`(${confirmados}/${total})`, barX + barWidth + 18, yPos + 7);

          yPos += 18;
        });

        yPos += 5;
      }

      // ========== SEÇÃO: ACOMPANHAMENTO SEMANAL ==========
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(4, 0, 186);
      doc.text('ACOMPANHAMENTO SEMANAL', margin, yPos);
      yPos += 8;

      const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const weeklyData = chartData.datasets[0].data;
      const barWidth = (pageWidth - margin * 2 - 30) / 7;
      const maxBarHeight = 40;

      // Eixo Y
      doc.setFontSize(7);
      doc.setTextColor(150);
      for (let i = 0; i <= 4; i++) {
        const val = i * 25;
        const posY = yPos + maxBarHeight - (val / 100) * maxBarHeight;
        doc.text(`${val}%`, margin - 2, posY + 1, { align: 'right' });
        doc.setDrawColor(230);
        doc.setLineWidth(0.2);
        doc.line(margin, posY, pageWidth - margin, posY);
      }

      // Barras
      daysOfWeek.forEach((day, idx) => {
        const x = margin + 5 + idx * barWidth;
        const value = weeklyData[idx] as number;
        const barH = (value / 100) * maxBarHeight;

        doc.setFillColor(4, 0, 186);
        doc.roundedRect(x + 2, yPos + maxBarHeight - barH, barWidth - 6, barH, 2, 2, 'F');

        // Label dia
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(day, x + barWidth / 2 - 2, yPos + maxBarHeight + 6);

        // Valor
        if (value > 0) {
          doc.setFontSize(7);
          doc.setTextColor(4, 0, 186);
          doc.text(`${value}%`, x + barWidth / 2 - 2, yPos + maxBarHeight - barH - 2);
        }
      });

      yPos += maxBarHeight + 20;

      // ========== TABELA DE EVENTOS ==========
      doc.addPage();
      yPos = 20;

      doc.setFontSize(14);
      doc.setTextColor(4, 0, 186);
      doc.text('DETALHAMENTO DE EVENTOS', margin, yPos);
      yPos += 8;

      const tableData = eventos.map(e => [
        formatarData(e.data_prevista),
        formatarHora(e.data_prevista),
        e.tipo,
        e.nome,
        e.status
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Horário', 'Tipo', 'Nome', 'Status']],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [4, 0, 186], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 20 },
          2: { cellWidth: 30 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 30 }
        },
        didParseCell: (data) => {
          // Colorir status
          if (data.column.index === 4 && data.section === 'body') {
            const status = data.cell.raw as string;
            if (['Tomado', 'Realizado', 'Confirmado'].includes(status)) {
              data.cell.styles.textColor = [4, 186, 130];
              data.cell.styles.fontStyle = 'bold';
            } else if (['Não tomado', 'Perdido', 'Atrasado'].includes(status)) {
              data.cell.styles.textColor = [220, 53, 69];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawPage: () => {
          // Rodapé
          const pageCount = doc.internal.pages.length - 1;
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Caremind - Página ${pageCount}`, pageWidth - margin - 25, 287);
        }
      });

      doc.save(`relatorio-caremind-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('Erro ao gerar PDF', err);
      toast.error('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, analytics, eventos, selectedElderName, dataInicio, dataFim, chartData]);

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
              {/* Cards de Resumo - Simplificados */}
              <div className={styles.summaryGrid}>
                {/* Card Principal: Adesão */}
                <div className={`${styles.reportCard} ${styles.donutCard}`}>
                  <div className={styles.cardTitleRow}>
                    <h2 className={styles.cardTitle}>Taxa de Adesão</h2>
                  </div>
                  <div className={styles.donutWrapper} id="chart-adesao">
                    {adesaoDoughnutData ? (
                      <Doughnut data={adesaoDoughnutData} options={doughnutOptions} />
                    ) : (
                      <span>Sem dados</span>
                    )}
                    <div className={styles.donutCenter}>
                      <strong>{analytics.kpis.taxa_adesao_total?.toFixed(0)}%</strong>
                      <span>concluídos</span>
                    </div>
                  </div>
                </div>

                {/* Card: Resumo Numérico */}
                <div className={styles.reportCard}>
                  <h2 className={styles.cardTitle}>Resumo do Período</h2>
                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{analytics.kpis.total_eventos}</span>
                      <span className={styles.statLabel}>Total</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={`${styles.statValue} ${styles.statSuccess}`}>{analytics.kpis.total_confirmados}</span>
                      <span className={styles.statLabel}>Concluídos</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={`${styles.statValue} ${styles.statDanger}`}>{analytics.kpis.total_esquecidos}</span>
                      <span className={styles.statLabel}>Pendentes</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>
                        {analytics.kpis.pontualidade_media_minutos !== null
                          ? `${analytics.kpis.pontualidade_media_minutos > 0 ? '+' : ''}${analytics.kpis.pontualidade_media_minutos}min`
                          : '—'}
                      </span>
                      <span className={styles.statLabel}>Pontualidade</span>
                    </div>
                  </div>
                </div>

                {/* Card: Por Tipo */}
                <div className={styles.reportCard}>
                  <h2 className={styles.cardTitle}>Por Categoria</h2>
                  <div className={styles.categoryList}>
                    <div className={styles.categoryItem}>
                      <span className={styles.categoryIcon}>💊</span>
                      <div className={styles.categoryInfo}>
                        <span className={styles.categoryName}>Medicamentos</span>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill} 
                            style={{ width: `${analytics.kpis.taxa_adesao_medicamentos || 0}%` }}
                          />
                        </div>
                      </div>
                      <span className={styles.categoryPercent}>{(analytics.kpis.taxa_adesao_medicamentos || 0).toFixed(0)}%</span>
                    </div>
                    <div className={styles.categoryItem}>
                      <span className={styles.categoryIcon}>📋</span>
                      <div className={styles.categoryInfo}>
                        <span className={styles.categoryName}>Rotinas</span>
                        <div className={styles.progressBar}>
                          <div 
                            className={`${styles.progressFill} ${styles.progressSecondary}`}
                            style={{ width: `${analytics.kpis.taxa_adesao_rotinas || 0}%` }}
                          />
                        </div>
                      </div>
                      <span className={styles.categoryPercent}>{(analytics.kpis.taxa_adesao_rotinas || 0).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico Principal: Evolução Diária */}
              <div className={styles.chartContainer}>
                <h2 className={styles.chartTitle}>Evolução da Adesão</h2>
                <h3 className={styles.chartSubtitle}>Acompanhe o progresso ao longo do período</h3>
                <div className={styles.chartBody} id="chart-tendencia">
                  {tendenciaChartData ? (
                    <Line options={tendenciaChartOptions} data={tendenciaChartData} />
                  ) : (
                    <p className={styles.noData}>Sem dados suficientes para o período selecionado.</p>
                  )}
                </div>
              </div>

              {/* Gráfico Secundário: Por Turno */}
              <div className={styles.chartContainer}>
                <h2 className={styles.chartTitle}>Desempenho por Horário</h2>
                <h3 className={styles.chartSubtitle}>Identifique os melhores e piores horários</h3>
                <div className={styles.chartBody} id="chart-turnos">
                  {turnosChartData ? (
                    <Bar options={turnosChartOptions} data={turnosChartData} />
                  ) : (
                    <p className={styles.noData}>Sem dados suficientes para o período selecionado.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Tabela de Eventos */}
          <div className={styles.reportContainer}>
            <h2 className={styles.cardTitle}>Histórico Detalhado</h2>
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
                        <td>
                          <span className={styles.tipoBadge} data-tipo={evento.tipo.toLowerCase()}>
                            {evento.tipo === 'Medicamento' ? '💊' : '📋'} {evento.tipo}
                          </span>
                        </td>
                        <td className={styles.nomeCell}>{evento.nome}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${getStatusClassName(evento.status)}`}>
                            {evento.status}
                          </span>
                        </td>
                      </tr>
                    ))
                    : (
                      <tr>
                        <td colSpan={5} className={styles.emptyTable}>
                          Nenhum evento encontrado no período selecionado.
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