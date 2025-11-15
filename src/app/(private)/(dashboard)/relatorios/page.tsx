



"use client";

import { useState, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useIdoso } from '@/contexts/IdosoContext';
import { FullScreenLoader } from '@/components/features/FullScreenLoader';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import styles from './page.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface EventoHistorico {
  id: string;
  tipo: 'Medicamento' | 'Rotina';
  nome: string;
  horario: string;
  status: string;
  created_at: string;
}

export default function Relatorios() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { idosoSelecionadoId, listaIdososVinculados } = useIdoso();
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<EventoHistorico[]>([]);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [tipoSelecionado, setTipoSelecionado] = useState<'Todos' | 'Medicamento' | 'Rotina'>('Todos');
  const [applyTick, setApplyTick] = useState<number>(0);
  const isFamiliar = user?.user_metadata?.account_type === 'familiar';
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
      if (isFamiliar && !idosoSelecionadoId) {
        setEventos([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const params = new URLSearchParams();
        if (idosoSelecionadoId) params.set('idoso_id', idosoSelecionadoId);
        if (dataInicio) params.set('dataInicio', dataInicio);
        if (dataFim) params.set('dataFim', dataFim);
        if (tipoSelecionado && tipoSelecionado !== 'Todos') params.set('tipoEvento', tipoSelecionado);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`/api/relatorios/historico${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const historico = await res.json();
        const eventosFormatados: EventoHistorico[] = (historico || []).map((evento: any) => ({
          id: evento.id,
          tipo: evento.tipo_evento as 'Medicamento' | 'Rotina',
          nome: evento.evento,
          horario: evento.horario_programado,
          status: evento.status,
          created_at: evento.horario_programado,
        }));
        setEventos(eventosFormatados);
      } catch (err) {
        console.error('Erro ao buscar eventos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventos();
  }, [user, router, supabase, idosoSelecionadoId, isFamiliar, dataInicio, dataFim, tipoSelecionado, applyTick]);

  // Função para calcular estatísticas por período
  const calcularEstatisticas = (dias: number) => {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    const eventosRecentes = eventos.filter(evento => 
      new Date(evento.horario) >= dataLimite
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
      const dataEvento = new Date(evento.horario);
      return dataEvento >= seteDiasAtras && dataEvento <= hoje;
    });

    // Contar eventos por dia da semana
    eventosUltimos7Dias.forEach(evento => {
      const data = new Date(evento.horario);
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
          </div>
        </div>
        
        <div className={styles.reportGrid}>
          <div className={styles.reportCard}>
            <h2 className={styles.cardTitle}>Eventos Realizados</h2>
            <div className={styles.progressWrapper}>
              <div className={styles.progressLabel}>
                <span>Últimos 7 dias</span>
                <span>{stats7Dias.tomados}/{stats7Dias.total}</span>
              </div>
              <div className={styles.progressBar}>
                <progress value={stats7Dias.tomados} max={stats7Dias.total || 1} />
              </div>
            </div>
            <div className={styles.progressWrapper}>
              <div className={styles.progressLabel}>
                <span>Últimos 30 dias</span>
                <span>{stats30Dias.tomados}/{stats30Dias.total}</span>
              </div>
              <div className={styles.progressBar}>
                <progress value={stats30Dias.tomados} max={stats30Dias.total || 1} />
              </div>
            </div>
          </div>

          <div className={styles.reportCard}>
            <h2 className={styles.cardTitle}>Eventos Não Realizados</h2>
            <div className={styles.progressWrapper}>
              <div className={styles.progressLabel}>
                <span>Últimos 7 dias</span>
                <span>{stats7Dias.perdidos}/{stats7Dias.total}</span>
              </div>
              <div className={styles.progressBar}>
                <progress value={stats7Dias.perdidos} max={stats7Dias.total || 1} className={styles.progressBarRed} />
              </div>
            </div>
            <div className={styles.progressWrapper}>
              <div className={styles.progressLabel}>
                <span>Últimos 30 dias</span>
                <span>{stats30Dias.perdidos}/{stats30Dias.total}</span>
              </div>
              <div className={styles.progressBar}>
                <progress value={stats30Dias.perdidos} max={stats30Dias.total || 1} className={styles.progressBarRed} />
              </div>
            </div>
          </div>
        </div>

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
                        <td>{formatarData(evento.horario)}</td>
                        <td>{formatarHora(evento.horario)}</td>
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
  );
}