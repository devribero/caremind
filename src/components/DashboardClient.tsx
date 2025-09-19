'use client';

import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { shouldResetMedicamento, formatarProximaDose, calcularProximaDose } from '@/lib/medicamentoUtils';
import styles from './DashboardClient.module.css';
import { Modal } from './Modal';
import { AddMedicamentoForm } from './forms/AddMedicamentoForm';
import { AddRotinaForm } from './forms/AddRotinaForm';
import { useLoading } from '@/contexts/LoadingContext';

// === TIPOS ===
type FrequenciaDiaria = {
    tipo: 'diario';
    horarios: string[];
};

type FrequenciaIntervalo = {
    tipo: 'intervalo';
    intervalo_horas: number;
    inicio: string;
};

type FrequenciaDiasAlternados = {
    tipo: 'dias_alternados';
    intervalo_dias: number;
    horario: string;
};

type FrequenciaSemanal = {
    tipo: 'semanal';
    dias_da_semana: number[];
    horario: string;
};

type Frequencia = FrequenciaDiaria | FrequenciaIntervalo | FrequenciaDiasAlternados | FrequenciaSemanal;

interface MedicamentoBase {
  id?: string;
  nome: string;
  dosagem: string | null;
  quantidade: number;
  frequencia: Frequencia | null;
  data_agendada?: string;
  concluido?: boolean;
  ultimaAtualizacao?: string;
}

interface Medicamento extends Omit<MedicamentoBase, 'id' | 'data_agendada' | 'concluido'> {
    id: string;
    data_agendada: string;
    concluido: boolean;
    dosagem: string | null;
}

type Rotina = {
    id: string;
    data_agendada: string;
    descricao: string;
    concluida: boolean;
};

type BaseListData = {
    total: number;
    lista: any[];
};

type ListData<T> = BaseListData & {
    concluidos: number;
    lista: T[];
};

type MedicamentosData = ListData<Medicamento>;
type RotinasData = BaseListData & {
    concluidas: number;
    lista: Rotina[];
};

// === COMPONENTES AUXILIARES ===
interface ProgressBarProps {
    current: number;
    total: number;
}

const ProgressBar = memo(function ProgressBar({ current, total }: ProgressBarProps) {
    const percentage = useMemo(() => 
        total > 0 ? Math.round((current / total) * 100) : 0,
        [current, total]
    );
    
    const progressBarStyle = useMemo(() => ({
        width: '100%',
        backgroundColor: '#e9ecef',
        borderRadius: '8px',
        height: '12px',
        overflow: 'hidden'
    }), []);

    const progressFillStyle = useMemo(() => ({
        width: `${percentage}%`,
        backgroundColor: '#0400BA',
        height: '100%',
        transition: 'width 0.5s ease-in-out',
        borderRadius: 'inherit'
    }), [percentage]);
    
    return (
        <div style={progressBarStyle}>
            <div style={progressFillStyle} />
        </div>
    );
});

ProgressBar.displayName = 'ProgressBar';

// === COMPONENTE PRINCIPAL ===
const initialMedicamentosState: MedicamentosData = {
    total: 0,
    concluidos: 0,
    lista: []
};

const initialRotinasState: RotinasData = {
    total: 0,
    concluidas: 0,
    lista: []
};

export function DashboardClient() {
    const { setIsLoading } = useLoading();
    const supabase = useMemo(() => createClient(), []);
    const { user } = useAuth();

    // === ESTADOS ===
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMedicamento, setCurrentMedicamento] = useState<Medicamento | null>(null);
    const [modalType, setModalType] = useState<'medicamento' | 'rotina'>('medicamento');
    const [medicamentos, setMedicamentos] = useState<MedicamentosData>(initialMedicamentosState);
    const [rotinas, setRotinas] = useState<RotinasData>(initialRotinasState);
    
    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setIsEditing(false);
        setCurrentMedicamento(null);
    }, []);

    const openModal = useCallback((type: 'medicamento' | 'rotina', medicamento: Medicamento | null = null) => {
        setModalType(type);
        setIsModalOpen(true);
        if (medicamento) {
            setIsEditing(true);
            setCurrentMedicamento(medicamento);
        }
    }, []);

    // === FUNÇÕES AUXILIARES ===
    const getAuthToken = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return session?.access_token;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }, [supabase]);

    const handleApiError = useCallback((error: unknown, defaultMessage: string) => {
        const message = error instanceof Error ? error.message : defaultMessage;
        console.error('API Error:', error);
        // Consider using a toast notification instead of alert
        alert(`Erro: ${message}`);
    }, []);

    // === FUNÇÕES DE API ===
    const fetchMedicamentos = useCallback(async (token: string): Promise<Medicamento[]> => {
        try {
            const response = await fetch('/api/medicamentos', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store' // Prevent caching for fresh data
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch medicamentos:', error);
            throw error;
        }
    }, []);

    const fetchRotinas = useCallback(async (token: string): Promise<Rotina[]> => {
        try {
            const response = await fetch('/api/rotinas', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store' // Prevent caching for fresh data
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch rotinas:', error);
            throw error;
        }
    }, []);

    // Efeito para verificar periodicamente se os medicamentos precisam ser desmarcados
    useEffect(() => {
        // Verifica a cada minuto
        const interval = setInterval(() => {
            setMedicamentos(prev => {
                const listaAtualizada = prev.lista.map(med => {
                    if (med.concluido && shouldResetMedicamento(med)) {
                        return { ...med, concluido: false };
                    }
                    return med;
                });
                
                // Atualiza apenas se houver mudanças
                if (JSON.stringify(listaAtualizada) !== JSON.stringify(prev.lista)) {
                    return {
                        ...prev,
                        lista: listaAtualizada,
                        concluidos: listaAtualizada.filter(med => med.concluido).length
                    };
                }
                return prev;
            });
        }, 60000); // Verifica a cada minuto

        return () => clearInterval(interval);
    }, []);

    // === HANDLERS DE FORMULÁRIO ===
    const handleSaveMedicamento = async (nome: string, dosagem: string | null, frequencia: Frequencia, quantidade: number) => {
        if (!user) return;
        
        const token = await getAuthToken();
        if (!token) return;

        try {
            const primeiraData: Date = new Date();
            
            if (frequencia.tipo === 'diario' && frequencia.horarios.length > 0) {
                const [hours, minutes] = frequencia.horarios[0].split(':');
                primeiraData.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            } else if (frequencia.tipo === 'intervalo') {
                const [hours, minutes] = frequencia.inicio.split(':');
                primeiraData.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            } else if (frequencia.tipo === 'dias_alternados' || frequencia.tipo === 'semanal') {
                const [hours, minutes] = frequencia.horario.split(':');
                primeiraData.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            }

            let response: Response;
            let data: Medicamento;

            if (currentMedicamento && currentMedicamento.id) {
                // Atualizar medicamento existente
                response = await fetch(`/api/medicamentos/${currentMedicamento.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        nome,
                        dosagem,
                        data_agendada: primeiraData.toISOString(),
                        frequencia,
                        quantidade
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.erro || 'Falha ao atualizar medicamento.');
                }

                data = await response.json();

                setMedicamentos(prev => ({
                    ...prev,
                    lista: prev.lista.map(med => 
                        med.id === currentMedicamento.id ? { ...med, ...data } : med
                    ),
                }));
            } else {
                // Criar novo medicamento
                response = await fetch('/api/medicamentos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        nome,
                        dosagem,
                        data_agendada: primeiraData.toISOString(),
                        concluido: false,
                        frequencia,
                        quantidade
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.erro || 'Falha ao salvar medicamento.');
                }

                data = await response.json();

                setMedicamentos(prev => ({
                    total: prev.total + 1,
                    concluidos: prev.concluidos,
                    lista: [...prev.lista, data],
                }));
            }

            closeModal();
        } catch (error) {
            handleApiError(error, 'Erro ao salvar medicamento');
        }
    };

    const handleSaveRotina = useCallback(async (titulo: string, descricao: string, frequencia: Frequencia | null) => {
        try {
            const token = await getAuthToken();
            const response = await fetch('/api/rotinas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    titulo,
                    descricao,
                    frequencia,
                    concluida: false
                })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao salvar rotina.');
            }

            const novaRotina = await response.json();

            setRotinas(prev => ({
                ...prev,
                total: prev.total + 1,
                concluidas: prev.concluidas + (novaRotina.concluida ? 1 : 0),
                lista: [...prev.lista, novaRotina]
            }));

            closeModal();
        } catch (error) {
            handleApiError(error, 'Erro ao salvar rotina');
        }
    }, [closeModal, getAuthToken, handleApiError]);

    const handleToggleStatus = async (
        tipo: 'medicamentos' | 'rotinas',
        id: string,
        statusAtual: boolean
    ) => {
        const novoStatus = !statusAtual;
        const agora = new Date().toISOString();
        
        if (tipo === 'medicamentos') {
            setMedicamentos(prev => {
                const listaAtualizada = prev.lista.map(med => {
                    if (med.id === id) {
                        return { 
                            ...med, 
                            concluido: novoStatus,
                            ultimaAtualizacao: novoStatus ? agora : med.ultimaAtualizacao,
                            // Se estiver marcando como não concluído, mantém a data de agendamento original
                            // Se estiver marcando como concluído, calcula a próxima dose
                            data_agendada: novoStatus 
                                ? calcularProximaDose(med)?.toISOString() || med.data_agendada
                                : med.data_agendada
                        };
                    }
                    return med;
                });
                
                return {
                    ...prev,
                    concluidos: listaAtualizada.filter(med => med.concluido).length,
                    lista: listaAtualizada
                };
            });
        } else {
            setRotinas(prev => {
                const listaAtualizada = prev.lista.map(rot => 
                    rot.id === id ? { ...rot, concluida: novoStatus } : rot
                );
                
                return {
                    ...prev,
                    concluidas: listaAtualizada.filter(rot => rot.concluida).length,
                    lista: listaAtualizada
                };
            });
        }

        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Sessão não encontrada');

            const colunaStatus = tipo === 'medicamentos' ? 'concluido' : 'concluida';

            const response = await fetch(`/api/${tipo}/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }, 
                body: JSON.stringify({
                    [colunaStatus]: novoStatus
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Falha ao atualizar status');
            }

        } catch (error) {
            if (tipo === 'medicamentos') {
                setMedicamentos(prev => ({
                    ...prev,
                    concluidos: statusAtual ? prev.concluidos + 1 : prev.concluidos - 1,
                    lista: prev.lista.map(med => 
                        med.id === id ? { ...med, concluido: statusAtual } : med
                    ),
                }));
            } else {
                setRotinas(prev => ({
                    ...prev,
                    concluidas: statusAtual ? prev.concluidas + 1 : prev.concluidas - 1,
                    lista: prev.lista.map(rot => 
                        rot.id === id ? { ...rot, concluida: statusAtual } : rot
                    ),
                }));
            }
            handleApiError(error, 'Erro ao atualizar status');
        }
    };

    // === HANDLERS DE MODAL ===

    const fetchData = useCallback(async () => {
        if (!user) return;

        const token = await getAuthToken();
        if (!token) return;

        try {
            const [medsData, rotinasData] = await Promise.all([
                fetchMedicamentos(token),
                fetchRotinas(token)
            ]);

            setMedicamentos({
                total: medsData.length,
                concluidos: medsData.filter(m => m.concluido).length,
                lista: medsData
            });

            setRotinas({
                total: rotinasData.length,
                concluidas: rotinasData.filter(r => r.concluida).length,
                lista: rotinasData
            });
        } catch (error) {
            handleApiError(error, 'Não foi possível carregar os dados do dashboard.');
        }
    }, [user, getAuthToken, fetchMedicamentos, fetchRotinas, handleApiError]);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            fetchData().finally(() => {
                setIsLoading(false);
            });
        } else {
            setMedicamentos(initialMedicamentosState);
            setRotinas(initialRotinasState);
        }
    }, [user, fetchData, setIsLoading]);

    // Função para renderizar a lista de medicamentos
    const renderMedicamentosList = useCallback(() => {
        return medicamentos.lista.map(med => ({
            id: med.id,
            nome: med.nome,
            dosagem: med.dosagem,
            quantidade: med.quantidade,
            data_agendada: med.data_agendada,
            concluido: med.concluido,
            ultimaAtualizacao: med.ultimaAtualizacao,
            frequencia: med.frequencia
        }));
    }, [medicamentos.lista]);

    // Função para editar um medicamento existente
    const handleEditMedicamento = useCallback((medicamento: Medicamento) => {
        // Define o medicamento atual para edição e abre o modal
        setCurrentMedicamento(medicamento);
        setModalType('medicamento');
        setIsModalOpen(true);
    }, []);

    const modalContent = useMemo(() => {
        if (modalType === 'medicamento') {
            return (
                <Modal
                    key={isEditing ? `edit-medicamento-${currentMedicamento?.id}` : 'add-medicamento'}
                    isOpen={isModalOpen}
                    title={isEditing ? 'Editar Medicamento' : 'Adicionar Medicamento'}
                    onClose={closeModal}
                >
                    <AddMedicamentoForm 
                        onSave={handleSaveMedicamento} 
                        onCancel={closeModal}
                        medicamento={currentMedicamento || undefined}
                    />
                </Modal>
            );
        }

        return (
            <Modal
                key="rotina-modal"
                isOpen={isModalOpen}
                title="Adicionar Rotina"
                onClose={closeModal}
            >
                <AddRotinaForm 
                    onSave={handleSaveRotina} 
                    onCancel={closeModal} 
                />
            </Modal>
        );
    }, [modalType, isModalOpen, handleSaveMedicamento, handleSaveRotina, closeModal]);

    const Card = memo(({ 
        title, 
        total, 
        completed, 
        onAddClick 
    }: { 
        title: string; 
        total: number; 
        completed: number; 
        onAddClick: () => void;
    }) => (
        <div className={styles.card}>
            <h3>{title}</h3>
            <p>Total: {total}</p>
            <p>{title === 'Medicamentos' ? 'Concluídos' : 'Concluídas'}: {completed}</p>
            <ProgressBar current={completed} total={total} />
            <button onClick={onAddClick} className={styles.add_btn}>
                + Adicionar {title.slice(0, -1)}
            </button>
        </div>
    ));

    Card.displayName = 'Card';

    const formatFrequencia = useCallback((frequencia: Frequencia | null) => {
        if (!frequencia) {
            return 'Frequência não especificada';
        }

        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        switch (frequencia.tipo) {
            case 'diario':
                return `Diário ${frequencia.horarios.length > 1 
                    ? `nos horários: ${frequencia.horarios.join(', ')}` 
                    : `às ${frequencia.horarios[0]}`}`;
                    
            case 'intervalo':
                return `A cada ${frequencia.intervalo_horas}h a partir das ${frequencia.inicio}`;
                
            case 'dias_alternados':
                return `A cada ${frequencia.intervalo_dias} dias às ${frequencia.horario}`;
                
            case 'semanal':
                const diasSelecionados = frequencia.dias_da_semana
                    .map(dia => diasSemana[dia - 1])
                    .join(', ');
                return `Toda semana nas ${frequencia.horario} de ${diasSelecionados}`;
                
            default:
                return '';
        }
    }, []);

    const ListItem = memo(({ 
        item, 
        tipo 
    }: { 
        item: Medicamento | Rotina; 
        tipo: 'medicamentos' | 'rotinas';
    }) => {
        const isMedicamento = 'nome' in item;
        
        const handleToggle = useCallback(() => {
            const isCompleted = isMedicamento 
                ? (item as Medicamento).concluido 
                : (item as Rotina).concluida;
            handleToggleStatus(tipo, item.id, isCompleted);
        }, [item, tipo, isMedicamento]);
        
        const displayText = useMemo(() => {
            if (isMedicamento) {
                const medicamento = item as Medicamento;
                const dataFormatada = new Date(medicamento.data_agendada).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return (
                    <div className={styles.medicamento_info}>
                        <div className={styles.medicamento_header}>
                            <strong>{medicamento.nome}</strong>
                            {medicamento.dosagem && <span> ({medicamento.dosagem})</span>}
                            {medicamento.quantidade > 0 && <span> - Qtd: {medicamento.quantidade}</span>}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditMedicamento(medicamento);
                                }}
                                className={styles.editButton}
                            >
                                Editar
                            </button>
                        </div>
                        <div className={styles.medicamento_schedule}>
                            <span>Próxima dose: {dataFormatada}</span>
                            <span className={styles.frequencia}>{formatFrequencia(medicamento.frequencia)}</span>
                        </div>
                    </div>
                );
            } else {
                const rotina = item as Rotina;
                return (
                    <div className={styles.rotina_info}>
                        <div className={styles.rotina_header}>
                            <strong>{rotina.descricao}</strong>
                        </div>
                        <div className={styles.rotina_schedule}>
                            {new Date(rotina.data_agendada).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                );
            }
        }, [item, isMedicamento]);
        
        const isCompleted = isMedicamento 
            ? (item as Medicamento).concluido 
            : (item as Rotina).concluida;

        return (
            <li className={`${styles.list_item} ${isCompleted ? styles.completed : ''}`}>
                <div className={styles.item_content}>
                    {displayText}
                    <button 
                        onClick={handleToggle}
                        className={isCompleted ? styles.button_secondary : styles.button_primary}
                        aria-label={isCompleted ? 'Desmarcar' : 'Concluir'}
                    >
                        {isCompleted ? 'Desmarcar' : 'Concluir'}
                    </button>
                </div>
            </li>
        );
    });

    ListItem.displayName = 'ListItem';

    const medicamentosList = useMemo(() => (
        <ul>
            {medicamentos.lista.map(med => (
                <ListItem 
                    key={`med-${med.id}`} 
                    item={med} 
                    tipo="medicamentos" 
                />
            ))}
        </ul>
    ), [medicamentos.lista]);

    const rotinasList = useMemo(() => (
        <ul>
            {rotinas.lista.map(rot => (
                <ListItem 
                    key={`rot-${rot.id}`} 
                    item={rot} 
                    tipo="rotinas" 
                />
            ))}
        </ul>
    ), [rotinas.lista]);

    return (
        <div className={styles.dashboard_client}>
            <div className={styles.cards_container}>
                <Card 
                    title="Medicamentos"
                    total={medicamentos.total}
                    completed={medicamentos.concluidos}
                    onAddClick={() => openModal('medicamento')}
                />
                
                <Card 
                    title="Rotinas"
                    total={rotinas.total}
                    completed={rotinas.concluidas}
                    onAddClick={() => openModal('rotina')}
                />
            </div>

            <div className={styles.list_section}>
                <h4>Lista de Medicamentos</h4>
                {medicamentosList}

                <h4>Lista de Rotinas</h4>
                {rotinasList}
            </div>

            {modalContent}
        </div>
    );
}