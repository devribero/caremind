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
import { FiPlus, FiAlertTriangle, FiClock } from 'react-icons/fi';

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

export default function DashboardClient({ readOnly = false, idosoId }: { readOnly?: boolean; idosoId?: string }): React.ReactElement {
  const { profile } = useProfile(idosoId);
  const { setIsLoading } = useLoading();

  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'medicamento' | 'rotina'>('medicamento');
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Medicamento | Rotina | null>(null);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const now = useMemo(() => new Date(), []);

  const carregarDados = useCallback(async () => {
    if (!profile?.id) return;

    setIsLoading(true);
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
        status: 'pendente' as const, // Compromissos não têm status no DB
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
      setIsLoading(false);
    }
  }, [profile, setIsLoading]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Efeito para verificar periodicamente se os medicamentos precisam ser desmarcados
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
        // AddMedicamentoForm passa: (nome, dosagem, frequencia, quantidade)
        const nome = nomeOuTitulo;
        const dosagem = descricaoOuDosagem;

        // Garantir que frequencia seja um objeto válido
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
        // AddRotinaForm passa: (titulo, descricao, frequencia)
        const titulo = nomeOuTitulo;
        const descricao = descricaoOuDosagem;

        // Garantir que frequencia seja um objeto válido
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
      await carregarDados();
      closeModal();
    } catch (error) {
      console.error(`Erro ao salvar ${modalType}:`, error);
    }
  };

  const handleDelete = (tipo: 'medicamento' | 'rotina', id: string | number) => {
    setConfirmDialog({
      isOpen: true,
      title: `Excluir ${tipo}`,
      message: `Tem certeza que deseja excluir este ${tipo}?`,
      onConfirm: async () => {
        try {
          if (tipo === 'medicamento') {
            await MedicamentosService.deletarMedicamento(id as number);
          } else {
            await RotinasService.deletarRotina(id as number);
          }
          await carregarDados();
        } catch (error) {
          console.error(`Erro ao excluir ${tipo}:`, error);
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => { } });
        }
      },
    });
  };

  const handleToggleAgendaStatus = async (item: AgendaItem) => {
    if (readOnly) return;
    if (item.tipo === 'compromisso') return; // Compromissos não têm status
    if (!profile?.id) return;

    const novoStatus = item.status === 'confirmado' ? 'pendente' : 'confirmado';

    // Otimista
    setAgenda(prev => prev.map(a => a.id === item.id ? { ...a, status: novoStatus } : a));

    try {
      // Se o item é temporário (temp-), precisa criar o evento primeiro
      if (item.id.toString().startsWith('temp-')) {
        // Extrai o ID do item original dos dados
        let eventoId: number;
        if (item.tipo === 'medicamento') {
          eventoId = (item.dadosOriginais as Medicamento).id;
        } else if (item.tipo === 'rotina') {
          eventoId = (item.dadosOriginais as Rotina).id;
        } else {
          throw new Error('Tipo de item inválido para criar evento');
        }

        // Cria ou atualiza o evento
        await criarOuAtualizarEvento(
          profile.id,
          item.tipo,
          eventoId,
          novoStatus,
          item.horario
        );
      } else {
        // Item já existe no histórico, apenas atualiza
        await atualizarStatusEvento(Number(item.id), novoStatus);
      }

      // Se for medicamento e foi confirmado, recarrega os medicamentos para atualizar a quantidade
      if (item.tipo === 'medicamento' && novoStatus === 'confirmado' && profile?.user_id) {
        const meds = await MedicamentosService.listarMedicamentos(profile.user_id);
        setMedicamentos(meds);
      }

      // Recarrega os dados para sincronizar a agenda
      await carregarDados();
    } catch (error) {
      console.error("Erro ao atualizar status do evento:", error);
      // Reverter
      setAgenda(prev => prev.map(a => a.id === item.id ? { ...a, status: item.status } : a));
    }
  };

  const getStatusBadge = (status: string, horario?: Date) => {
    if (status === 'confirmado') return styles.status_badge_done;
    if (horario && horario < now) return styles.status_badge_late;
    return styles.status_badge;
  };

  const getStatusText = (status: string, horario?: Date) => {
    if (status === 'confirmado') return 'Concluído';
    if (horario && horario < now) return 'Atrasado';
    return 'Pendente';
  }

  const { medsHoje, medsHojeConcluidos, rotinasHoje, rotinasHojeConcluidas, alertasPendentes, dosesOmitidas, estoqueBaixo, agendaExata } = useMemo(() => {
    const hoje = new Date();

    // 1. Calcular itens agendados para hoje baseados na frequência
    const medsAgendadosHoje = medicamentos.filter(med => isScheduledForDate(med, hoje));
    const rotinasAgendadasHoje = rotinas.filter(rot => isScheduledForDate(rot, hoje));

    // 2. Mapear eventos já existentes (histórico) para fácil acesso
    const eventosMap = new Map();
    agenda.forEach(item => {
      if (item.tipo === 'medicamento' || item.tipo === 'rotina') {
        // Chave: tipo-id_original
        const key = `${item.tipo}-${(item.dadosOriginais as HistoricoEvento).evento_id}`;
        eventosMap.set(key, item);
      }
    });

    // 3. Construir listas completas (Calculados + Histórico)
    // Se já existe no histórico, usa o status do histórico. Se não, é pendente.

    const listaMedsHoje = medsAgendadosHoje.map(med => {
      const key = `medicamento-${med.id}`;
      const eventoExistente = eventosMap.get(key);

      if (eventoExistente) {
        return eventoExistente;
      }

      // Item calculado mas ainda não gerado no histórico
      return {
        id: `temp-med-${med.id}`,
        tipo: 'medicamento',
        titulo: med.nome,
        horario: new Date(), // Horário padrão ou calcular baseado na frequência
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
        horario: new Date(),
        status: 'pendente',
        dadosOriginais: rot
      } as AgendaItem;
    });

    // Combinar com eventos extras que podem estar na agenda mas não na lista calculada (ex: pontuais não recorrentes?)
    // Por enquanto, assumimos que a lista calculada + agenda cobre tudo.
    // Mas precisamos garantir que não duplicamos se a agenda tiver algo que o calculo também trouxe.
    // A lógica acima já prioriza a agenda (eventoExistente).

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


  return (
    <div className={styles.dashboard_client}>
      <div className={styles.cards_container}>
        <div className={styles.card}>
          <h3>Medicamentos Hoje</h3>
          <p><strong>{medsHojeConcluidos} de {medsHoje.length}</strong> concluídos</p>
          <div className={styles.progress_bar}>
            <div className={styles.progress_fill} style={{ width: `${medsHoje.length ? (medsHojeConcluidos / medsHoje.length) * 100 : 0}%` }} />
          </div>
          {!readOnly && (
            <button className={styles.add_btn} onClick={() => openModal('medicamento')}>
              <FiPlus size={16} /> Adicionar Medicamento
            </button>
          )}
        </div>

        <div className={styles.card}>
          <h3>Rotinas Hoje</h3>
          <p><strong>{rotinasHojeConcluidas} de {rotinasHoje.length}</strong> concluídas</p>
          <div className={styles.progress_bar}>
            <div className={styles.progress_fill} style={{ width: `${rotinasHoje.length ? (rotinasHojeConcluidas / rotinasHoje.length) * 100 : 0}%` }} />
          </div>
          {!readOnly && (
            <button className={styles.add_btn} onClick={() => openModal('rotina')}>
              <FiPlus size={16} /> Adicionar Rotina
            </button>
          )}
        </div>

        <div className={styles.card} style={{ cursor: 'pointer' }}>
          <h3>Alertas Pendentes</h3>
          <p><strong>{alertasPendentes}</strong></p>
          <div className={styles.alerts_summary}>
            <span className={styles.alert_badge}><FiAlertTriangle /> {dosesOmitidas.length} doses omitidas</span>
            <span className={styles.alert_badge_low}><FiAlertTriangle /> {estoqueBaixo.length} estoques baixos</span>
          </div>
        </div>
      </div>

      <div className={styles.agenda_section}>
        <h3 className={styles.section_title}><FiClock /> Agenda do Dia</h3>
        {agenda.length === 0 ? (
          <p className={styles.empty_list}>Nenhuma tarefa agendada para hoje.</p>
        ) : (
          <ul className={styles.list}>
            {agenda.map(item => (
              <li key={item.id} className={styles.list_item}>
                <div className={styles.item_info}>
                  <strong>{item.titulo}</strong>
                  <span>{item.horario.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={styles.item_actions}>
                  <span
                    onClick={() => handleToggleAgendaStatus(item)}
                    className={getStatusBadge(item.status, item.horario)}
                    style={{ cursor: readOnly ? 'default' : 'pointer' }}
                  >
                    {getStatusText(item.status, item.horario)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.agenda_columns}>
        <div className={styles.agenda_column}>
          <h3 className={styles.section_title}><FiClock /> Medicamentos do Dia</h3>
          {agendaExata.filter(i => i.tipo === 'medicamento').length === 0 ? (
            <p className={styles.empty_list}>Nenhum medicamento para hoje.</p>
          ) : (
            <ul className={styles.list}>
              {agendaExata.filter(i => i.tipo === 'medicamento').map(item => (
                <li key={item.id} className={`${styles.list_item} ${item.status === 'confirmado' ? styles.completed : ''}`}>
                  <div className={styles.item_info}>
                    <strong>{item.titulo}</strong>
                    <span style={{ fontSize: '0.8em', color: '#666' }}>
                      {item.horario.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={styles.item_actions_hover}>
                    {item.id.toString().startsWith('temp-') ? (
                      <button
                        className={styles.complete_btn}
                        onClick={() => handleToggleAgendaStatus(item)}
                        title="Marcar como concluído"
                      >
                        Concluir
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleAgendaStatus(item)}
                        className={`${styles.complete_btn} ${item.status === 'confirmado' ? styles.btn_completed : ''}`}
                        title={item.status === 'confirmado' ? "Desmarcar" : "Concluir"}
                      >
                        {item.status === 'confirmado' ? "Desfazer" : "Concluir"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.agenda_column}>
          <h3 className={styles.section_title}><FiClock /> Rotinas do Dia</h3>
          {agendaExata.filter(i => i.tipo === 'rotina').length === 0 ? (
            <p className={styles.empty_list}>Nenhuma rotina para hoje.</p>
          ) : (
            <ul className={styles.list}>
              {agendaExata.filter(i => i.tipo === 'rotina').map(item => (
                <li key={item.id} className={`${styles.list_item} ${item.status === 'confirmado' ? styles.completed : ''}`}>
                  <div className={styles.item_info}>
                    <strong>{item.titulo}</strong>
                    <span style={{ fontSize: '0.8em', color: '#666' }}>
                      {item.horario.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={styles.item_actions_hover}>
                    {item.id.toString().startsWith('temp-') ? (
                      <button
                        className={styles.complete_btn}
                        onClick={() => handleToggleAgendaStatus(item)}
                        title="Marcar como concluído"
                      >
                        Concluir
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleAgendaStatus(item)}
                        className={`${styles.complete_btn} ${item.status === 'confirmado' ? styles.btn_completed : ''}`}
                        title={item.status === 'confirmado' ? "Desmarcar" : "Concluir"}
                      >
                        {item.status === 'confirmado' ? "Desfazer" : "Concluir"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
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
