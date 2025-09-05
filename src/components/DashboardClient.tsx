'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import styles from './DashboardClient.module.css';
import { Modal } from './Modal';
import { AddMedicamentoForm } from './forms/AddMedicamentoForm';

// --- DEFINIÇÃO DOS TIPOS ---
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

// --- Componente Reutilizável para a Barra de Progresso ---
function ProgressBar({ current, total }: { current: number; total: number }) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return (
        <div style={{ width: '100%', backgroundColor: '#e9ecef', borderRadius: '8px', height: '12px' }}>
            <div
                style={{ width: `${percentage}%`, backgroundColor: '#0400BA', borderRadius: '8px', height: '100%', transition: 'width 0.5s ease-in-out' }}
            ></div>
        </div>
    );
}

// --- Componente Principal do Dashboard ---
export function DashboardClient() {
    const supabase = createClient();
    const { user } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [medicamentos, setMedicamentos] = useState<{ total: number; concluidos: number; lista: Medicamento[] }>({ total: 0, concluidos: 0, lista: [] });
    const [rotinas, setRotinas] = useState<{ total: number; concluidas: number; lista: Rotina[] }>({ total: 0, concluidas: 0, lista: [] });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;

        const hoje = new Date();
        const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
        const fimDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString();

        const { data: medsData } = await supabase.from('medicamentos').select('*').eq('user_id', user.id).gte('data_agendada', inicioDoDia).lt('data_agendada', fimDoDia);
        if (medsData) {
            setMedicamentos({ total: medsData.length, concluidos: medsData.filter(m => m.concluido).length, lista: medsData });
        }

        const { data: rotinasData } = await supabase.from('rotinas').select('*').eq('user_id', user.id).gte('data_agendada', inicioDoDia).lt('data_agendada', fimDoDia);
        if (rotinasData) {
            setRotinas({ total: rotinasData.length, concluidas: rotinasData.filter(r => r.concluida).length, lista: rotinasData });
        }
    };

    useEffect(() => {
        if (user) {
            setLoading(true);
            fetchData().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleSaveMedicamento = async (nome: string, dosagem: string, data: string) => {
        if (!user) return;

        const { error } = await supabase.from('medicamentos').insert({
            user_id: user.id,
            nome,
            dosagem,
            data_agendada: new Date(data).toISOString(),
            // A linha abaixo foi a causa do erro anterior. Eu a comentei.
            // A solução ideal é você adicionar a coluna 'concluido' no seu banco de dados.
            // concluido: false,
        });

        if (error) {
            alert("Erro ao salvar: " + error.message);
        } else {
            setIsModalOpen(false);
            await fetchData();
        }
    };

    if (loading) {
        return <div>Carregando...</div>;
    }

    return (
        <>
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Adicionar Novo Medicamento"
            >
                <AddMedicamentoForm
                    onSave={handleSaveMedicamento}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            <div className={styles.dashboardContainer}>
                <h1 className={styles.dashboardTitle}>Dashboard</h1>

                <div className={styles.summaryGrid}>
                    <div className={styles.card}>
                        <p>Medicamentos do Dia</p>
                        <span className={styles.progressText}>{medicamentos.concluidos}/{medicamentos.total}</span>
                        <ProgressBar current={medicamentos.concluidos} total={medicamentos.total} />
                    </div>

                    <div className={styles.card}>
                        <p>Rotinas do Dia</p>
                        <span className={styles.progressText}>{rotinas.concluidas}/{rotinas.total}</span>
                        <ProgressBar current={rotinas.concluidas} total={rotinas.total} />
                    </div>

                    <div className={styles.card}>
                        <p>Exportar Dados</p>
                        <div className={styles.exportButtons}>
                            <button>PDF</button>
                            <button>TXT</button>
                        </div>
                    </div>
                </div>

                <div className={styles.detailsGrid}>
                    <div className={`${styles.card} ${styles.largeCard}`}>
                        <div className={styles.cardHeader}>
                            <h2>Medicamentos do Dia</h2>
                            <button className={styles.novoBtn} onClick={() => setIsModalOpen(true)}>
                                Novo
                            </button>
                        </div>
                        <div className={styles.cardBody}>
                            {medicamentos.lista.length === 0 ? (
                                <p className={styles.emptyText}>Nenhum Remédio para o dia de hoje</p>
                            ) : (
                                <ul>
                                    {medicamentos.lista.map(med => (
                                        <li key={med.id}>{med.nome} - {med.concluido ? 'Concluído' : 'Pendente'}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className={`${styles.card} ${styles.largeCard}`}>
                        <div className={styles.cardHeader}>
                            <h2>Rotinas do Dia</h2>
                            <button className={styles.novoBtn}>Novo</button>
                        </div>
                        <div className={styles.cardBody}>
                            {rotinas.lista.length === 0 ? (
                                <p className={styles.emptyText}>Nenhuma Rotina para o dia de hoje</p>
                            ) : (
                                <ul>
                                    {rotinas.lista.map(rotina => (
                                        <li key={rotina.id}>{rotina.descricao} - {rotina.concluida ? 'Concluída' : 'Pendente'}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}