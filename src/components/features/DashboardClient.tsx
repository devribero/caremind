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
import { Pill, Activity, AlertTriangle, Calendar, CheckCircle2, Clock, Plus } from 'lucide-react';

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

export default function DashboardClient({ readOnly = false, idosoId }: { readOnly?: boolean; idosoId?: string }): React.ReactElement {
  const { profile } = useProfile(idosoId);
  const { setIsLoading } = useLoading();

  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'medicamento' | 'rotina'>('medicamento');
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Medicamento | Rotina | null>(null);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const now = useMemo(() => new Date(), []);

  const carregarDados = useCallback(async (showLoader = false) => {
    if (!profile?.id) return;

    if (showLoader) setIsLoading(true);
    
    try {
      const hoje = new Date();
      const [eventos, compromissos, meds, rots] = await Promise.all([
        listarEventosDoDia(profile.id, hoje),
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

      const agendaCompromissos = compromissos.map(c => ({
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
  }, [profile, setIsLoading]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

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
      await carregarDados(true);
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

      await carregarDados(false);
    } catch (error) {
      console.error("Erro ao atualizar status do evento:", error);
      setAgenda(prev => prev.map(a => a.id === item.id ? { ...a, status: item.status } : a));
    }
  };

  const { medsHoje, medsHojeConcluidos, rotinasHoje, rotinasHojeConcluidas, alertasPendentes, dosesOmitidas, estoqueBaixo, agendaExata } = useMemo(() => {
    const hoje = new Date();

    const getHorarioFromFrequencia = (frequencia: any): Date => {
      const agora = new Date();
      if (!frequencia) return agora;

      if (frequencia.horarios?.length > 0) {
        const [hora, minuto] = frequencia.horarios[0].split(':').map(Number);
        const horario = new Date(hoje);
        horario.setHours(hora, minuto, 0, 0);
        return horario;
      }

      if (frequencia.tipo === 'intervalo' && frequencia.inicio) {
        const [hora, minuto] = frequencia.inicio.split(':').map(Number);
        const horario = new Date(hoje);
        horario.setHours(hora, minuto, 0, 0);
        return horario;
      }

      if (frequencia.horario) {
        const [hora, minuto] = frequencia.horario.split(':').map(Number);
        const horario = new Date(hoje);
        horario.setHours(hora, minuto, 0, 0);
        return horario;
      }

      return agora;
    };

    const medsAgendadosHoje = medicamentos.filter(med => isScheduledForDate(med, hoje));
    const rotinasAgendadasHoje = rotinas.filter(rot => isScheduledForDate(rot, hoje));

    const eventosMap = new Map();
    agenda.forEach(item => {
      if (item.tipo === 'medicamento' || item.tipo === 'rotina') {
        const key = `${item.tipo}-${(item.dadosOriginais as HistoricoEvento).evento_id}`;
        eventosMap.set(key, item);
      }
    });

    const listaMedsHoje = medsAgendadosHoje.map(med => {
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

    const listaRotinasHoje = rotinasAgendadasHoje.map(rot => {
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

    const medsHojeConcluidos = listaMedsHoje.filter(a => a.status === 'confirmado').length;
    const rotinasHojeConcluidas = listaRotinasHoje.filter(a => a.status === 'confirmado').length;

    const dosesOmitidas = agenda.filter(a => a.status === 'atrasado' || a.status === 'esquecido');
    const estoqueBaixo = medicamentos.filter(m => m.quantidade != null && m.quantidade <= 3);
    const alertasPendentes = dosesOmitidas.length + estoqueBaixo.length;

    return {
      medsHoje: listaMedsHoje,
      medsHojeConcluidos,
      rotinasHoje: listaRotinasHoje,
      rotinasHojeConcluidas,
      alertasPendentes,
      dosesOmitidas,
      estoqueBaixo,
      agendaExata: [...listaMedsHoje, ...listaRotinasHoje].sort((a, b) => a.horario.getTime() - b.horario.getTime())
    };
  }, [agenda, medicamentos, rotinas]);

  // Filtrar agenda baseado no filtro ativo
  const agendaFiltrada = useMemo(() => {
    if (activeFilter === 'todos') return agendaExata;
    return agendaExata.filter(item => item.tipo === activeFilter);
  }, [agendaExata, activeFilter]);

  const getItemStatus = (item: AgendaItem) => {
    if (item.status === 'confirmado') return 'done';
    if (item.horario < now) return 'late';
    return 'pending';
  };

  return (
    <div className={styles.dashboard}>
      {/* Cards de Resumo */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} data-type="medicamento">
            <Pill size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{medsHojeConcluidos}/{medsHoje.length}</span>
            <span className={styles.statLabel}>Medicamentos</span>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${medsHoje.length ? (medsHojeConcluidos / medsHoje.length) * 100 : 0}%` }} 
              />
            </div>
          </div>
          {!readOnly && (
            <button className={styles.statAddBtn} onClick={() => openModal('medicamento')} title="Adicionar medicamento">
              <Plus size={16} />
            </button>
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} data-type="rotina">
            <Activity size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{rotinasHojeConcluidas}/{rotinasHoje.length}</span>
            <span className={styles.statLabel}>Rotinas</span>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                data-type="rotina"
                style={{ width: `${rotinasHoje.length ? (rotinasHojeConcluidas / rotinasHoje.length) * 100 : 0}%` }} 
              />
            </div>
          </div>
          {!readOnly && (
            <button className={styles.statAddBtn} onClick={() => openModal('rotina')} title="Adicionar rotina">
              <Plus size={16} />
            </button>
          )}
        </div>

        <div className={styles.statCard} data-alert={alertasPendentes > 0}>
          <div className={styles.statIcon} data-type="alerta">
            <AlertTriangle size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{alertasPendentes}</span>
            <span className={styles.statLabel}>Alertas</span>
            <div className={styles.alertDetails}>
              {dosesOmitidas.length > 0 && <span>{dosesOmitidas.length} omitidos</span>}
              {estoqueBaixo.length > 0 && <span>{estoqueBaixo.length} estoques baixos</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Agenda Principal */}
      <div className={styles.agendaContainer}>
        <div className={styles.agendaHeader}>
          <div className={styles.agendaTitle}>
            <Calendar size={20} />
            <h2>Agenda do Dia</h2>
          </div>
          
          {/* Filter Chips */}
          <div className={styles.filterChips}>
            <button 
              className={`${styles.filterChip} ${activeFilter === 'todos' ? styles.active : ''}`}
              onClick={() => setActiveFilter('todos')}
            >
              Todos
            </button>
            <button 
              className={`${styles.filterChip} ${activeFilter === 'medicamento' ? styles.active : ''}`}
              onClick={() => setActiveFilter('medicamento')}
              data-type="medicamento"
            >
              <Pill size={14} />
              Medicamentos
            </button>
            <button 
              className={`${styles.filterChip} ${activeFilter === 'rotina' ? styles.active : ''}`}
              onClick={() => setActiveFilter('rotina')}
              data-type="rotina"
            >
              <Activity size={14} />
              Rotinas
            </button>
          </div>
        </div>

        {/* Timeline */}
        {agendaFiltrada.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <CheckCircle2 size={64} strokeWidth={1} />
            </div>
            <h3>Tudo em dia!</h3>
            <p>
              {activeFilter === 'todos' 
                ? 'Nenhuma tarefa agendada para hoje. Aproveite o dia!' 
                : `Nenhum${activeFilter === 'medicamento' ? ' medicamento' : 'a rotina'} agendad${activeFilter === 'medicamento' ? 'o' : 'a'} para hoje.`}
            </p>
            {!readOnly && (
              <div className={styles.emptyActions}>
                <button onClick={() => openModal('medicamento')} className={styles.emptyBtn}>
                  <Pill size={16} /> Adicionar Medicamento
                </button>
                <button onClick={() => openModal('rotina')} className={styles.emptyBtn}>
                  <Activity size={16} /> Adicionar Rotina
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.timeline}>
            {agendaFiltrada.map(item => {
              const status = getItemStatus(item);
              return (
                <div 
                  key={item.id} 
                  className={`${styles.timelineItem} ${styles[status]}`}
                  data-type={item.tipo}
                >
                  <div className={styles.timelineTime}>
                    <Clock size={12} />
                    <span>{item.horario.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  <div className={styles.timelineCard}>
                    <div className={styles.timelineIndicator} data-type={item.tipo} />
                    
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineInfo}>
                        <span className={styles.timelineType}>
                          {item.tipo === 'medicamento' ? <Pill size={14} /> : <Activity size={14} />}
                          {item.tipo === 'medicamento' ? 'Medicamento' : 'Rotina'}
                        </span>
                        <h4>{item.titulo}</h4>
                      </div>
                      
                      <div className={styles.timelineActions}>
                        {item.tipo !== 'compromisso' && !readOnly && (
                          <button
                            onClick={() => handleToggleAgendaStatus(item)}
                            className={`${styles.statusBtn} ${item.status === 'confirmado' ? styles.completed : ''}`}
                          >
                            {item.status === 'confirmado' ? (
                              <>
                                <CheckCircle2 size={16} />
                                Concluído
                              </>
                            ) : (
                              'Concluir'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
