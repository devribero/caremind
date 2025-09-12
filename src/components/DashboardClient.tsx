'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import styles from './DashboardClient.module.css';
import { Modal } from './Modal';
import { AddMedicamentoForm } from './forms/AddMedicamentoForm';
import { AddRotinaForm } from './forms/AddRotinaForm';

// === TIPOS ===
type Medicamento = {
    id: string;
    nome: string;
    dosagem: string | null;
    data_agendada: string;
    concluido: boolean;
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
function ProgressBar({ current, total }: { current: number; total: number }) {
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
}

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
    const handleSaveMedicamento = async (nome: string, dosagem: string, data: string) => {
        if (!user) return;
        
        const token = await getAuthToken();
        if (!token) return;

        try {
            const response = await fetch('/api/medicamentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    nome,
                    dosagem,
                    data_agendada: new Date(data).toISOString(),
                    concluido: false
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.erro || 'Falha ao salvar medicamento.');
            }

            closeModal();
            await fetchData();
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

            closeModal();
            await fetchData();
        } catch (error) {
            handleApiError(error, 'Erro ao salvar rotina');
        }
    };

    const handleToggleStatus = async (
        tipo: 'medicamentos' | 'rotinas',
        id: string,
        statusAtual: boolean
    ) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Sessão não encontrada');

            const colunaStatus = tipo === 'medicamentos' ? 'concluido' : 'concluida';
            const novoStatus = !statusAtual;

            console.log('Atualizando status:', {
                tipo,
                id,
                statusAtual,
                novoStatus
            });

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

            console.log('Status atualizado com sucesso');
            await fetchData();
        } catch (error) {
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
            <ProgressBar current={completed} total={total} />
            <button onClick={onAddClick} className={styles.add_btn}>
                + Adicionar {title.slice(0, -1)}
            </button>
        </div>
    );

    const renderListItem = (
        item: Medicamento | Rotina,
        tipo: 'medicamentos' | 'rotinas'
    ) => {
        const isMedicamento = 'nome' in item;
        const displayText = isMedicamento 
            ? `${item.nome} (${item.dosagem}) - ${new Date(item.data_agendada).toLocaleDateString()}`
            : `${item.descricao} - ${new Date(item.data_agendada).toLocaleDateString()}`;
        
        const isCompleted = isMedicamento ? item.concluido : (item as Rotina).concluida;

        return (
            <li key={item.id} className={styles.list_item}>
                <span>{displayText}</span>
                <button onClick={() => handleToggleStatus(tipo, item.id, isCompleted)}>
                    {isCompleted ? 'Desmarcar' : 'Concluir'}
                </button>
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