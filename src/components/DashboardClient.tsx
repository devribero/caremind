'use client';

import { useState, useEffect, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import styles from './DashboardClient.module.css';
import { Modal } from './Modal';
import { AddMedicamentoForm } from './forms/AddMedicamentoForm';
import { AddRotinaForm } from './forms/AddRotinaForm';

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

type Medicamento = {
    id: string;
    nome: string;
    dosagem: string | null;
    data_agendada: string;
    concluido: boolean;
    frequencia: Frequencia;
    quantidade: number;
};

type Rotina = {
    id: string;
    descricao: string;
    data_agendada: string;
    concluida: boolean;
};

type MedicamentosData = {
    total: number;
    concluidos: number;
    lista: Medicamento[];
};

type RotinasData = {
    total: number;
    concluidas: number;
    lista: Rotina[];
};

// === COMPONENTES AUXILIARES ===
const ProgressBarComponent = ({ current, total }: { current: number; total: number }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    return (
        <div style={{ 
            width: '100%', 
            backgroundColor: '#e9ecef', 
            borderRadius: '8px', 
            height: '12px' 
        }}>
            <div
                style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: '#0400BA', 
                    borderRadius: '8px', 
                    height: '100%', 
                    transition: 'width 0.5s ease-in-out' 
                }}
            />
        </div>
    );
};

function LoadingSpinner() {
    return <div>Carregando...</div>;
}

// === COMPONENTE PRINCIPAL ===
export function DashboardClient() {
    const supabase = createClient();
    const { user } = useAuth();

    // === ESTADOS ===
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'medicamento' | 'rotina'>('medicamento');
    const [medicamentos, setMedicamentos] = useState<MedicamentosData>({ 
        total: 0, 
        concluidos: 0, 
        lista: [] 
    });
    const [rotinas, setRotinas] = useState<RotinasData>({ 
        total: 0, 
        concluidas: 0, 
        lista: [] 
    });

    // === FUNÇÕES AUXILIARES ===
    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    };

    const handleApiError = (error: unknown, defaultMessage: string) => {
        const message = error instanceof Error ? error.message : defaultMessage;
        console.error('API Error:', error);
        alert(`Erro: ${message}`);
    };

    // === FUNÇÕES DE API ===
    const fetchMedicamentos = async (token: string): Promise<Medicamento[]> => {
        const response = await fetch('/api/medicamentos', {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Falha ao buscar medicamentos');
        return response.json();
    };

    const fetchRotinas = async (token: string): Promise<Rotina[]> => {
        const response = await fetch('/api/rotinas', {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Falha ao buscar rotinas');
        return response.json();
    };

    const fetchData = async () => {
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
    };

    // === HANDLERS DE FORMULÁRIO ===
    const handleSaveMedicamento = async (nome: string, dosagem: string, frequencia: Frequencia, quantidade: number) => {
        if (!user) return;
        
        const token = await getAuthToken();
        if (!token) return;

        try {
            // Calculate the first occurrence based on frequency type
            const primeiraData: Date = new Date();
            
            // Set the time based on the frequency type
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

            const response = await fetch('/api/medicamentos', {
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

            // Get the new medicamento from API response
            const novoMedicamento = await response.json();

            // Optimistic update - add to local state immediately
            setMedicamentos(prev => ({
                total: prev.total + 1,
                concluidos: prev.concluidos, // Doesn't change when adding new (starts as false)
                lista: [...prev.lista, novoMedicamento],
            }));

            closeModal();
        } catch (error) {
            handleApiError(error, 'Erro ao salvar medicamento');
        }
    };

    const handleSaveRotina = async (titulo: string, descricao: string, data: string) => {
        if (!user) return;
        
        const token = await getAuthToken();
        if (!token) return;

        try {
            const response = await fetch('/api/rotinas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    titulo,
                    descricao,
                    data_agendada: new Date(data).toISOString(),
                    concluida: false
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.erro || 'Falha ao salvar rotina.');
            }

            // Get the new rotina from API response
            const novaRotina = await response.json();

            // Optimistic update - add to local state immediately
            setRotinas(prev => ({
                total: prev.total + 1,
                concluidas: prev.concluidas, // Doesn't change when adding new (starts as false)
                lista: [...prev.lista, novaRotina],
            }));

            closeModal();
        } catch (error) {
            handleApiError(error, 'Erro ao salvar rotina');
        }
    };

    const handleToggleStatus = async (
        tipo: 'medicamentos' | 'rotinas',
        id: string,
        statusAtual: boolean
    ) => {
        const novoStatus = !statusAtual;
        
        // Optimistic update - update UI immediately
        if (tipo === 'medicamentos') {
            setMedicamentos(prev => ({
                ...prev,
                concluidos: novoStatus ? prev.concluidos + 1 : prev.concluidos - 1,
                lista: prev.lista.map(med => 
                    med.id === id ? { ...med, concluido: novoStatus } : med
                ),
            }));
        } else {
            setRotinas(prev => ({
                ...prev,
                concluidas: novoStatus ? prev.concluidas + 1 : prev.concluidas - 1,
                lista: prev.lista.map(rot => 
                    rot.id === id ? { ...rot, concluida: novoStatus } : rot
                ),
            }));
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
                throw new Error(responseData.erro || 'Falha ao atualizar status');
            }

        } catch (error) {
            // Rollback optimistic update on error
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
    const openModal = (type: 'medicamento' | 'rotina') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    // === EFFECTS ===
    useEffect(() => {
        if (user) {
            setLoading(true);
            fetchData().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [user]);

    // === RENDER ===
    if (loading) {
        return <LoadingSpinner />;
    }

    const renderModalContent = () => {
        if (modalType === 'medicamento') {
            return (
                <Modal
                    isOpen={isModalOpen}
                    title="Adicionar Medicamento"
                    onClose={closeModal}
                >
                    <AddMedicamentoForm 
                        onSave={handleSaveMedicamento} 
                        onCancel={closeModal} 
                    />
                </Modal>
            );
        }

        return (
            <Modal
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
    };

    const renderCard = (
        title: string,
        total: number,
        completed: number,
        onAddClick: () => void
    ) => (
        <div className={styles.card}>
            <h3>{title}</h3>
            <p>Total: {total}</p>
            <p>{title === 'Medicamentos' ? 'Concluídos' : 'Concluídas'}: {completed}</p>
            <ProgressBarComponent current={completed} total={total} />
            <button onClick={onAddClick} className={styles.add_btn}>
                + Adicionar {title.slice(0, -1)}
            </button>
        </div>
    );

    const formatFrequencia = (frequencia: Frequencia) => {
        switch (frequencia.tipo) {
            case 'diario':
                return `Diário ${frequencia.horarios.length > 1 ? 'nos horários: ' + frequencia.horarios.join(', ') : 'às ' + frequencia.horarios[0]}`;
            case 'intervalo':
                return `A cada ${frequencia.intervalo_horas}h a partir das ${frequencia.inicio}`;
            case 'dias_alternados':
                return `A cada ${frequencia.intervalo_dias} dias às ${frequencia.horario}`;
            case 'semanal':
                const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const diasSelecionados = frequencia.dias_da_semana.map(dia => diasSemana[dia - 1]);
                return `Toda semana nas ${frequencia.horario} de ${diasSelecionados.join(', ')}`;
            default:
                return '';
        }
    };

    const renderListItem = (
        item: Medicamento | Rotina,
        tipo: 'medicamentos' | 'rotinas'
    ) => {
        const isMedicamento = 'nome' in item;
        
        let displayText: React.ReactNode;
        
        if (isMedicamento) {
            const medicamento = item as Medicamento;
            const dataFormatada = new Date(medicamento.data_agendada).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            displayText = (
                <div className={styles.medicamento_info}>
                    <div className={styles.medicamento_header}>
                        <strong>{medicamento.nome}</strong>
                        {medicamento.dosagem && <span> ({medicamento.dosagem})</span>}
                        {medicamento.quantidade > 0 && <span> - Qtd: {medicamento.quantidade}</span>}
                    </div>
                    <div className={styles.medicamento_schedule}>
                        <span>Próxima dose: {dataFormatada}</span>
                        <span className={styles.frequencia}>{formatFrequencia(medicamento.frequencia)}</span>
                    </div>
                </div>
            );
        } else {
            const rotina = item as Rotina;
            displayText = (
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
        
        const isCompleted = isMedicamento ? item.concluido : (item as Rotina).concluida;

        return (
            <li key={item.id} className={`${styles.list_item} ${isCompleted ? styles.completed : ''}`}>
                <div className={styles.item_content}>
                    {displayText}
                    <button 
                        onClick={() => handleToggleStatus(tipo, item.id, isCompleted)}
                        className={isCompleted ? styles.button_secondary : styles.button_primary}
                    >
                        {isCompleted ? 'Desmarcar' : 'Concluir'}
                    </button>
                </div>
            </li>
        );
    };

    return (
        <div className={styles.dashboard_client}>
            <h2>Resumo do Dashboard</h2>
            
            <div className={styles.cards_container}>
                {renderCard(
                    'Medicamentos',
                    medicamentos.total,
                    medicamentos.concluidos,
                    () => openModal('medicamento')
                )}
                
                {renderCard(
                    'Rotinas',
                    rotinas.total,
                    rotinas.concluidas,
                    () => openModal('rotina')
                )}
            </div>

            <div className={styles.list_section}>
                <h4>Lista de Medicamentos</h4>
                <ul>
                    {medicamentos.lista.map(med => 
                        renderListItem(med, 'medicamentos')
                    )}
                </ul>

                <h4>Lista de Rotinas</h4>
                <ul>
                    {rotinas.lista.map(rot => 
                        renderListItem(rot, 'rotinas')
                    )}
                </ul>
            </div>

            {isModalOpen && renderModalContent()}
        </div>
    );
}