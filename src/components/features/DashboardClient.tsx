'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { CompromissosService, MedicamentosService, RotinasService } from '@/lib/supabase/services';
import { listarEventosDoDia, atualizarStatusEvento, criarOuAtualizarEvento } from '@/lib/supabase/services/historicoEventos';
import { shouldResetMedicamento } from '@/lib/utils/medicamentoUtils';
import { Tables } from '@/types/supabase';
import { isScheduledForDate } from '@/lib/utils/scheduleUtils';

import styles from './DashboardClient.module.css';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { AddMedicamentoForm } from './forms/AddMedicamentoForm';
import { AddRotinaForm } from './forms/AddRotinaForm';
import { useLoading } from '@/contexts/LoadingContext';
import { 
  Pill, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Package
} from 'lucide-react';

// Tipos
type Medicamento = Tables<'medicamentos'>;
type Rotina = Tables<'rotinas'>;
type Compromisso = Tables<'compromissos'>;
type HistoricoEvento = import('@/lib/supabase/services/historicoEventos').HistoricoEvento;

type AgendaItem = {
  id: string;
  tipo: 'medicamento' | 'rotina' | 'compromisso';
  titulo: string;
  horario: Date;
  status: 'pendente' | 'confirmado' | 'atrasado' | 'esquecido';
  dadosOriginais: Medicamento | Rotina | Compromisso | HistoricoEvento;
};

type FilterType = 'todos' | 'medicamento' | 'rotina';

// Helpers de data
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
};

const formatDateLabel = (date: Date, today: Date): string => {
  if (isSameDay(date, today)) return 'Hoje';
  if (isSameDay(date, addDays(today, -1))) return 'Ontem';
  if (isSameDay(date, addDays(today, 1))) return 'Amanhã';
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

export default function DashboardClient({ readOnly = false, idosoId }: { readOnly?: boolean; idosoId?: string }): React.ReactElement {
  const { profile } = useProfile(idosoId);
  const { setIsLoading } = useLoading();

  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'medicamento' | 'rotina'>('medicamento');
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Medicamento | Rotina | null>(null);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const today = useMemo(() => new Date(), []);
  const now = useMemo(() => new Date(), []);
  const isToday = isSameDay(selectedDate, today);

  const carregarDados = useCallback(async (showLoader = false, date?: Date) => {
    if (!profile?.id) return;

    if (showLoader) setIsLoading(true);
    
    try {
      const targetDate = date || selectedDate;
      const [eventos, compromissos, meds, rots] = await Promise.all([
        listarEventosDoDia(profile.id, targetDate),
        CompromissosService.listarCompromissos(profile.id),
        MedicamentosService.listarMedicamentos(profile.user_id),
        RotinasService.listarRotinas(profile.user_id),
      ]);

      const agendaEventos = eventos.map(e => ({
        id: e.id.toString(),
        tipo: e.tipo_evento as 'medicamento' | 'rotina',
        titulo: e.titulo || 'Evento',
        horario: new Date(e.data_prevista),
        status: e.status as 'pendente' | 'confirmado' | 'atrasado' | 'esquecido',
        dadosOriginais: e,
      }));

      const agendaCompromissos = compromissos
        .filter(c => c.data_hora && isSameDay(new Date(c.data_hora), targetDate))
        .map(c => ({
          id: c.id,
          tipo: 'compromisso' as const,
          titulo: c.titulo,
          horario: new Date(c.data_hora!),
          status: 'pendente' as const,
          dadosOriginais: c,
        }));

      const agendaCompleta = [...agendaEventos, ...agendaCompromissos].sort(
        (a, b) => a.horario.getTime() - b.horario.getTime()
      );

      setAgenda(agendaCompleta);
      setMedicamentos(meds);
      setRotinas(rots);

    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [profile, setIsLoading, selectedDate]);

  useEffect(() => {
    carregarDados(false, selectedDate);
  }, [selectedDate, profile?.id]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setMedicamentos(medicamentosAtuais => {
        const listaAtualizada = medicamentosAtuais.map(med => {
          if (med.concluido && shouldResetMedicamento(med as any)) {
            return { ...med, concluido: false };
          }
          return med;
        });

        if (JSON.stringify(listaAtualizada) !== JSON.stringify(medicamentosAtuais)) {
          return listaAtualizada;
        }

        return medicamentosAtuais;
      });
    }, 60000);

    return () => clearInterval(intervalo);
  }, []);

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentItem(null);
  };

  const openModal = (type: 'medicamento' | 'rotina', item: Medicamento | Rotina | null = null) => {
    setModalType(type);
    setCurrentItem(item);
    setIsEditing(!!item);
    setIsModalOpen(true);
  };

  const handleSave = async (
    nomeOuTitulo: string,
    descricaoOuDosagem?: string | null,
    frequencia?: any,
    quantidade?: number
  ) => {
    if (!profile) return;

    try {
      if (modalType === 'medicamento') {
        const nome = nomeOuTitulo;
        const dosagem = descricaoOuDosagem;

        let frequenciaLimpa: any = null;
        if (frequencia) {
          frequenciaLimpa = {};
          if (frequencia.tipo) frequenciaLimpa.tipo = frequencia.tipo;
          if ('horarios' in frequencia && Array.isArray(frequencia.horarios)) {
            frequenciaLimpa.horarios = frequencia.horarios;
          }
          if ('intervalo_horas' in frequencia && frequencia.intervalo_horas !== undefined) {
            frequenciaLimpa.intervalo_horas = frequencia.intervalo_horas;
          }
          if ('inicio' in frequencia && frequencia.inicio) {
            frequenciaLimpa.inicio = frequencia.inicio;
          }
          if ('intervalo_dias' in frequencia && frequencia.intervalo_dias !== undefined) {
            frequenciaLimpa.intervalo_dias = frequencia.intervalo_dias;
          }
          if ('horario' in frequencia && frequencia.horario) {
            frequenciaLimpa.horario = frequencia.horario;
          }
          if ('dias_da_semana' in frequencia && Array.isArray(frequencia.dias_da_semana)) {
            frequenciaLimpa.dias_da_semana = frequencia.dias_da_semana;
          }
        }

        const medData = {
          nome: nome?.trim() || null,
          dosagem: dosagem?.trim() || null,
          frequencia: frequenciaLimpa,
          quantidade: quantidade || null,
        };

        if (isEditing && currentItem) {
          await MedicamentosService.atualizarMedicamento((currentItem as Medicamento).id, medData);
        } else {
          await MedicamentosService.criarMedicamento({ ...medData, user_id: profile.user_id });
        }
      } else {
        const titulo = nomeOuTitulo;
        const descricao = descricaoOuDosagem;

        let frequenciaLimpa: any = null;
        if (frequencia) {
          frequenciaLimpa = {};
          if (frequencia.tipo) frequenciaLimpa.tipo = frequencia.tipo;
          if ('horarios' in frequencia && Array.isArray(frequencia.horarios)) {
            frequenciaLimpa.horarios = frequencia.horarios;
          }
          if ('intervalo_horas' in frequencia && frequencia.intervalo_horas !== undefined) {
            frequenciaLimpa.intervalo_horas = frequencia.intervalo_horas;
          }
          if ('inicio' in frequencia && frequencia.inicio) {
            frequenciaLimpa.inicio = frequencia.inicio;
          }
          if ('intervalo_dias' in frequencia && frequencia.intervalo_dias !== undefined) {
            frequenciaLimpa.intervalo_dias = frequencia.intervalo_dias;
          }
          if ('horario' in frequencia && frequencia.horario) {
            frequenciaLimpa.horario = frequencia.horario;
          }
          if ('dias_da_semana' in frequencia && Array.isArray(frequencia.dias_da_semana)) {
            frequenciaLimpa.dias_da_semana = frequencia.dias_da_semana;
          }
        }

        const rotinaData = {
          titulo: titulo?.trim() || null,
          descricao: descricao?.trim() || null,
          frequencia: frequenciaLimpa,
        };

        if (isEditing && currentItem) {
          await RotinasService.atualizarRotina((currentItem as Rotina).id, rotinaData);
        } else {
          await RotinasService.criarRotina({ ...rotinaData, user_id: profile.user_id });
        }
      }
      await carregarDados(true, selectedDate);
      closeModal();
    } catch (error) {
      console.error(`Erro ao salvar ${modalType}:`, error);
    }
  };

  const handleToggleAgendaStatus = async (item: AgendaItem) => {
    if (readOnly) return;
    if (item.tipo === 'compromisso') return;
    if (!profile?.id) return;

    const novoStatus = item.status === 'confirmado' ? 'pendente' : 'confirmado';

    setAgenda(prev => prev.map(a => a.id === item.id ? { ...a, status: novoStatus } : a));

    try {
      if (item.id.toString().startsWith('temp-')) {
        let eventoId: number;
        if (item.tipo === 'medicamento') {
          eventoId = (item.dadosOriginais as Medicamento).id;
        } else if (item.tipo === 'rotina') {
          eventoId = (item.dadosOriginais as Rotina).id;
        } else {
          throw new Error('Tipo de item inválido para criar evento');
        }

        await criarOuAtualizarEvento(
          profile.id,
          item.tipo,
          eventoId,
          novoStatus,
          item.horario,
          item.titulo
        );
      } else {
        await atualizarStatusEvento(Number(item.id), novoStatus);
      }

      if (item.tipo === 'medicamento' && novoStatus === 'confirmado' && profile?.user_id) {
        const meds = await MedicamentosService.listarMedicamentos(profile.user_id);
        setMedicamentos(meds);
      }

      await carregarDados(false, selectedDate);
    } catch (error) {
      console.error("Erro ao atualizar status do evento:", error);
      setAgenda(prev => prev.map(a => a.id === item.id ? { ...a, status: item.status } : a));
    }
  };

  // Calcular dados da agenda
  const { 
    agendaExata, 
    eventosAtrasados, 
    proximoEvento, 
    totalConcluidos, 
    estoqueBaixo 
  } = useMemo(() => {
    const getHorarioFromFrequencia = (frequencia: any): Date => {
      const agora = new Date();
      if (!frequencia) return agora;

      if (frequencia.horarios?.length > 0) {
        const [hora, minuto] = frequencia.horarios[0].split(':').map(Number);
        const horario = new Date(selectedDate);
        horario.setHours(hora, minuto, 0, 0);
        return horario;
      }

      if (frequencia.tipo === 'intervalo' && frequencia.inicio) {
        const [hora, minuto] = frequencia.inicio.split(':').map(Number);
        const horario = new Date(selectedDate);
        horario.setHours(hora, minuto, 0, 0);
        return horario;
      }

      if (frequencia.horario) {
        const [hora, minuto] = frequencia.horario.split(':').map(Number);
        const horario = new Date(selectedDate);
        horario.setHours(hora, minuto, 0, 0);
        return horario;
      }

      return agora;
    };

    const medsAgendados = medicamentos.filter(med => isScheduledForDate(med, selectedDate));
    const rotinasAgendadas = rotinas.filter(rot => isScheduledForDate(rot, selectedDate));

    const eventosMap = new Map();
    agenda.forEach(item => {
      if (item.tipo === 'medicamento' || item.tipo === 'rotina') {
        const eventoId = (item.dadosOriginais as HistoricoEvento).evento_id;
        if (eventoId) {
          const key = `${item.tipo}-${eventoId}`;
          eventosMap.set(key, item);
        }
      }
    });

    const listaMeds = medsAgendados.map(med => {
      const key = `medicamento-${med.id}`;
      const eventoExistente = eventosMap.get(key);

      if (eventoExistente) {
        return eventoExistente;
      }

      return {
        id: `temp-med-${med.id}`,
        tipo: 'medicamento',
        titulo: med.nome,
        horario: getHorarioFromFrequencia(med.frequencia),
        status: 'pendente',
        dadosOriginais: med
      } as AgendaItem;
    });

    const listaRotinas = rotinasAgendadas.map(rot => {
      const key = `rotina-${rot.id}`;
      const eventoExistente = eventosMap.get(key);

      if (eventoExistente) {
        return eventoExistente;
      }

      return {
        id: `temp-rot-${rot.id}`,
        tipo: 'rotina',
        titulo: rot.titulo,
        horario: getHorarioFromFrequencia(rot.frequencia),
        status: 'pendente',
        dadosOriginais: rot
      } as AgendaItem;
    });

    const todosEventos = [...listaMeds, ...listaRotinas].sort((a, b) => a.horario.getTime() - b.horario.getTime());
    
    // Eventos atrasados: pendentes com horário passado (apenas se for hoje)
    const atrasados = isToday 
      ? todosEventos.filter(e => e.status === 'pendente' && e.horario < now)
      : [];
    
    // Próximo evento: primeiro pendente com horário futuro (apenas se for hoje)
    const proximo = isToday 
      ? todosEventos.find(e => e.status === 'pendente' && e.horario >= now)
      : null;
    
    // Total concluídos
    const concluidos = todosEventos.filter(e => e.status === 'confirmado').length;
    
    // Estoque baixo
    const estoqueBaixoList = medicamentos.filter(m => m.quantidade != null && m.quantidade <= 3);

    return {
      agendaExata: todosEventos,
      eventosAtrasados: atrasados,
      proximoEvento: proximo,
      totalConcluidos: concluidos,
      estoqueBaixo: estoqueBaixoList
    };
  }, [agenda, medicamentos, rotinas, selectedDate, isToday, now]);

  // Filtrar agenda
  const agendaFiltrada = useMemo(() => {
    if (activeFilter === 'todos') return agendaExata;
    return agendaExata.filter(item => item.tipo === activeFilter);
  }, [agendaExata, activeFilter]);

  const getItemStatus = (item: AgendaItem) => {
    if (item.status === 'confirmado') return 'done';
    if (isToday && item.horario < now) return 'late';
    return 'pending';
  };

  const userName = profile?.nome?.split(' ')[0] || 'Usuário';

  return (
    <div className={styles.dashboard}>
      {/* Header com Saudação e Navegação de Data */}
      <header className={styles.header}>
        <div className={styles.greeting}>
          <h1>{getGreeting()}, <span>{userName}</span>!</h1>
          <p>Acompanhe sua agenda de saúde</p>
        </div>
        
        <div className={styles.dateNav}>
          <button 
            className={styles.dateNavBtn} 
            onClick={() => navigateDate('prev')}
            aria-label="Dia anterior"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button 
            className={styles.dateLabel}
            onClick={goToToday}
            title="Voltar para hoje"
          >
            {formatDateLabel(selectedDate, today)}
          </button>
          
          <button 
            className={styles.dateNavBtn} 
            onClick={() => navigateDate('next')}
            aria-label="Próximo dia"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* Hero Section - Card de Destaque */}
      <section className={styles.heroSection}>
        {eventosAtrasados.length > 0 ? (
          // Card de Alerta - Eventos Atrasados
          <div className={styles.heroCard} data-type="alert">
            <div className={styles.heroIcon}>
              <AlertCircle size={32} />
            </div>
            <div className={styles.heroContent}>
              <h2>Atenção!</h2>
              <p>{eventosAtrasados.length} {eventosAtrasados.length === 1 ? 'evento atrasado' : 'eventos atrasados'}</p>
              <ul className={styles.alertList}>
                {eventosAtrasados.slice(0, 3).map(e => (
                  <li key={e.id}>
                    {e.tipo === 'medicamento' ? <Pill size={14} /> : <Activity size={14} />}
                    <span>{e.titulo}</span>
                    <span className={styles.alertTime}>
                      {e.horario.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
                {eventosAtrasados.length > 3 && (
                  <li className={styles.alertMore}>+{eventosAtrasados.length - 3} mais</li>
                )}
              </ul>
            </div>
          </div>
        ) : proximoEvento ? (
          // Card de Próximo Evento
          <div className={styles.heroCard} data-type="next">
            <div className={styles.heroIcon}>
              <Clock size={32} />
            </div>
            <div className={styles.heroContent}>
              <span className={styles.heroLabel}>Próximo</span>
              <h2>{proximoEvento.titulo}</h2>
              <p>
                {proximoEvento.tipo === 'medicamento' ? <Pill size={16} /> : <Activity size={16} />}
                às {proximoEvento.horario.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {!readOnly && (
              <button 
                className={styles.heroAction}
                onClick={() => handleToggleAgendaStatus(proximoEvento)}
              >
                Concluir agora
              </button>
            )}
          </div>
        ) : (
          // Card de Tudo em Dia
          <div className={styles.heroCard} data-type="success">
            <div className={styles.heroIcon}>
              <Sparkles size={32} />
            </div>
            <div className={styles.heroContent}>
              <h2>Tudo em dia!</h2>
              <p>
                {agendaExata.length === 0 
                  ? 'Nenhuma tarefa agendada para este dia'
                  : 'Todas as tarefas foram concluídas'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Stats Compactos */}
      <section className={styles.statsRow}>
        <div className={styles.statBadge} data-type="done">
          <CheckCircle2 size={16} />
          <span>{totalConcluidos} Concluídos</span>
        </div>
        
        <div className={styles.statBadge} data-type="total">
          <Clock size={16} />
          <span>{agendaExata.length} Total</span>
        </div>
        
        {estoqueBaixo.length > 0 && (
          <div className={styles.statBadge} data-type="warning">
            <Package size={16} />
            <span>{estoqueBaixo.length} Estoque baixo</span>
          </div>
        )}

        {!readOnly && (
          <div className={styles.addButtons}>
            <button onClick={() => openModal('medicamento')} title="Adicionar medicamento">
              <Plus size={14} />
              <Pill size={14} />
            </button>
            <button onClick={() => openModal('rotina')} title="Adicionar rotina">
              <Plus size={14} />
              <Activity size={14} />
            </button>
          </div>
        )}
      </section>

      {/* Agenda Principal */}
      <section className={styles.agendaSection}>
        <div className={styles.agendaHeader}>
          <h3>Agenda</h3>
          
          <div className={styles.filterTabs}>
            <button 
              className={activeFilter === 'todos' ? styles.active : ''}
              onClick={() => setActiveFilter('todos')}
            >
              Todos
            </button>
            <button 
              className={activeFilter === 'medicamento' ? styles.active : ''}
              onClick={() => setActiveFilter('medicamento')}
            >
              <Pill size={14} />
              Medicamentos
            </button>
            <button 
              className={activeFilter === 'rotina' ? styles.active : ''}
              onClick={() => setActiveFilter('rotina')}
            >
              <Activity size={14} />
              Rotinas
            </button>
          </div>
        </div>

        {agendaFiltrada.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <CheckCircle2 size={56} strokeWidth={1.5} />
            </div>
            <h4>Nenhum evento</h4>
            <p>
              {activeFilter === 'todos' 
                ? 'Não há tarefas agendadas para este dia'
                : `Não há ${activeFilter === 'medicamento' ? 'medicamentos' : 'rotinas'} agendados`}
            </p>
          </div>
        ) : (
          <div className={styles.timeline}>
            {agendaFiltrada.map((item, index) => {
              const status = getItemStatus(item);
              const showTimeDivider = index === 0 || 
                item.horario.getHours() !== agendaFiltrada[index - 1].horario.getHours();
              
              return (
                <React.Fragment key={item.id}>
                  {showTimeDivider && (
                    <div className={styles.timeDivider}>
                      <span>{item.horario.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  
                  <div className={`${styles.timelineItem} ${styles[status]}`} data-type={item.tipo}>
                    <div className={styles.timelineLine} />
                    <div className={styles.timelineDot} data-type={item.tipo} />
                    
                    <div className={styles.timelineCard}>
                      <div className={styles.cardIcon} data-type={item.tipo}>
                        {item.tipo === 'medicamento' ? <Pill size={18} /> : <Activity size={18} />}
                      </div>
                      
                      <div className={styles.cardContent}>
                        <span className={styles.cardType}>
                          {item.tipo === 'medicamento' ? 'Medicamento' : 'Rotina'}
                        </span>
                        <h4>{item.titulo}</h4>
                      </div>
                      
                      {item.tipo !== 'compromisso' && !readOnly && item.status !== 'confirmado' && (
                        <button
                          onClick={() => handleToggleAgendaStatus(item)}
                          className={styles.cardAction}
                        >
                          Concluir
                        </button>
                      )}
                      
                      {item.status === 'confirmado' && (
                        <div className={styles.cardCheck}>
                          <CheckCircle2 size={20} />
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </section>

      {/* Modais */}
      {!readOnly && isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={`${isEditing ? 'Editar' : 'Adicionar'} ${modalType}`}>
          {modalType === 'medicamento' ? (
            <AddMedicamentoForm onSave={handleSave} onCancel={closeModal} medicamento={currentItem as Medicamento} />
          ) : (
            <AddRotinaForm onSave={handleSave} onCancel={closeModal} rotina={currentItem as Rotina} />
          )}
        </Modal>
      )}

      {!readOnly && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        />
      )}
    </div>
  );
}
