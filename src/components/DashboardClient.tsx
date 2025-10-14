'use client';

// Importações básicas do React
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { shouldResetMedicamento } from '@/lib/medicamentoUtils';

import styles from './DashboardClient.module.css';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { AddMedicamentoForm } from './forms/AddMedicamentoForm';
import { AddRotinaForm } from './forms/AddRotinaForm';
import { useLoading } from '@/contexts/LoadingContext';
import { FiEdit2, FiTrash2, FiPlus, FiCheck, FiX } from 'react-icons/fi';

// ===== TIPOS DE DADOS =====

// Tipos para as frequências de medicamentos
type FrequenciaDiaria = {
    tipo: 'diario';
    horarios: string[];  // Ex: ['08:00', '14:00', '20:00']
};

type FrequenciaIntervalo = {
    tipo: 'intervalo';
    intervalo_horas: number;  // Ex: 8 (a cada 8 horas)
    inicio: string;           // Ex: '08:00'
};

type FrequenciaDiasAlternados = {
    tipo: 'dias_alternados';
    intervalo_dias: number;  // Ex: 2 (a cada 2 dias)
    horario: string;         // Ex: '09:00'
};

type FrequenciaSemanal = {
    tipo: 'semanal';
    dias_da_semana: number[];  // Números de 1 a 7 representando os dias da semana
    horario: string;           // Ex: '09:00'
};

// Tipo que une todos os tipos de frequência
type Frequencia = FrequenciaDiaria | FrequenciaIntervalo | FrequenciaDiasAlternados | FrequenciaSemanal;

// Interface para um medicamento
interface Medicamento {
    id: string;
    nome: string;
    dosagem: string | null;  // Ex: '500mg', '1 comprimido'
    quantidade: number;       // Quantidade em estoque
    frequencia: Frequencia | null;
    data_agendada: string;    // Próxima data/hora da dose
    concluido: boolean;       // Se a última dose foi tomada
    ultimaAtualizacao?: string; // Quando foi a última atualização
}

// Interface para uma rotina
interface Rotina {
    id: string;
    titulo?: string;
    descricao?: string;
    concluido: boolean;      // API usa 'concluido'
    frequencia?: any;
    data_agendada?: string;  // opcional
}

// Interface para os dados de medicamentos
interface MedicamentosData {
    total: number;           // Total de medicamentos
    concluidos: number;      // Quantos estão marcados como concluídos
    lista: Medicamento[];    // Lista de medicamentos
}

// Interface para os dados de rotinas
interface RotinasData {
    total: number;           // Total de rotinas
    concluidas: number;      // Quantas estão marcadas como concluídas
    lista: Rotina[];         // Lista de rotinas
}

// Estado inicial para medicamentos
const estadoInicialMedicamentos: MedicamentosData = {
    total: 0,
    concluidos: 0,
    lista: []
};

// Estado inicial para rotinas
const estadoInicialRotinas: RotinasData = {
    total: 0,
    concluidas: 0,
    lista: []
};

// ===== COMPONENTE PRINCIPAL =====

export default function DashboardClient({ readOnly = false }: { readOnly?: boolean }): React.ReactElement {
    // Estados para controle do modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'medicamento' | 'rotina'>('medicamento');
    const [isEditing, setIsEditing] = useState(false);
    
    // Estados para os itens atuais sendo editados
    const [currentMedicamento, setCurrentMedicamento] = useState<Medicamento | null>(null);
    const [currentRotina, setCurrentRotina] = useState<Rotina | null>(null);
    
    // Estados para o diálogo de confirmação
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (() => void) | null;
        itemId?: string;
        itemType?: 'medicamentos' | 'rotinas';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });
    
    // Estados para armazenar os dados
    const [medicamentos, setMedicamentos] = useState<MedicamentosData>(estadoInicialMedicamentos);
    const [rotinas, setRotinas] = useState<RotinasData>(estadoInicialRotinas);
    
    // Estados para controle de carregamento
    const { setIsLoading } = useLoading();
    
    // Conexão com o banco de dados
    const supabase = useMemo(() => createClient(), []);
    
    // Dados do usuário logado
    const { user } = useAuth();

    // ===== FUNÇÕES PARA MANIPULAR O MODAL =====
    
    // Fecha o modal e limpa os dados
    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setIsEditing(false);
        setCurrentMedicamento(null);
        setCurrentRotina(null);
    }, []);

    // Abre o modal para adicionar ou editar um item
    const openModal = useCallback((type: 'medicamento' | 'rotina', medicamento: Medicamento | null = null) => {
        setModalType(type);
        setIsModalOpen(true);
        
        if (medicamento) {
            setIsEditing(true);
            setCurrentMedicamento(medicamento);
        } else {
            setIsEditing(false);
            setCurrentMedicamento(null);
        }
    }, []);

    // ===== FUNÇÕES AUXILIARES =====
    
    // Pega o token de autenticação do usuário
    const getAuthToken = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return session?.access_token;
        } catch (error) {
            console.error('Erro ao obter token de autenticação:', error);
            return null;
        }
    }, [supabase]);

    // Mostra mensagens de erro
    const handleApiError = useCallback((error: unknown, mensagemPadrao: string) => {
        const mensagem = error instanceof Error ? error.message : mensagemPadrao;
        console.error('Erro na API:', error);
        alert(`Erro: ${mensagem}`);
    }, []);

    // ===== FUNÇÕES PARA BUSCAR DADOS =====
    
    // Busca a lista de medicamentos da API
    const buscarMedicamentos = useCallback(async (token: string): Promise<Medicamento[]> => {
        try {
            const resposta = await fetch('/api/medicamentos', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
            if (!resposta.ok) throw new Error(`Erro HTTP! status: ${resposta.status}`);
            return await resposta.json();
        } catch (erro) {
            console.error('Falha ao buscar medicamentos:', erro);
            throw erro;
        }
    }, []);

    // Busca a lista de rotinas da API
    const buscarRotinas = useCallback(async (token: string): Promise<Rotina[]> => {
        try {
            const resposta = await fetch('/api/rotinas', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
            if (!resposta.ok) throw new Error(`Erro HTTP! status: ${resposta.status}`);
            return await resposta.json();
        } catch (erro) {
            console.error('Falha ao buscar rotinas:', erro);
            throw erro;
        }
    }, []);

    // ===== EFEITOS =====
    
    // Efeito para verificar periodicamente se os medicamentos precisam ser desmarcados
    useEffect(() => {
        const intervalo = setInterval(() => {
            setMedicamentos(medicamentosAtuais => {
                const listaAtualizada = medicamentosAtuais.lista.map(med => {
                    if (med.concluido && shouldResetMedicamento(med)) {
                        return { ...med, concluido: false };
                    }
                    return med;
                });
                
                if (JSON.stringify(listaAtualizada) !== JSON.stringify(medicamentosAtuais.lista)) {
                    return {
                        ...medicamentosAtuais,
                        lista: listaAtualizada,
                        concluidos: listaAtualizada.filter(med => med.concluido).length
                    };
                }
                
                return medicamentosAtuais;
            });
        }, 60000); 

        return () => clearInterval(intervalo);
    }, []);

    // Função para carregar todos os dados
    const carregarDados = useCallback(async () => {
        if (!user) return;
        const token = await getAuthToken();
        if (!token) return;

        try {
            setIsLoading(true);
            const [dadosMedicamentos, dadosRotinas] = await Promise.all([
                buscarMedicamentos(token),
                buscarRotinas(token)
            ]);

            setMedicamentos({
                total: dadosMedicamentos.length,
                concluidos: dadosMedicamentos.filter(m => m.concluido).length,
                lista: dadosMedicamentos
            });

            setRotinas({
                total: dadosRotinas.length,
                concluidas: dadosRotinas.filter((r: any) => r.concluido || r.concluida).length,
                lista: dadosRotinas as Rotina[]
            });
        } catch (erro) {
            handleApiError(erro, 'Não foi possível carregar os dados do dashboard.');
        } finally {
            setIsLoading(false);
        }
    }, [user, getAuthToken, buscarMedicamentos, buscarRotinas, handleApiError, setIsLoading]);

    // Carrega os dados quando o componente é montado ou quando o usuário muda
    useEffect(() => {
        if (user) {
            carregarDados();
        } else {
            setMedicamentos(estadoInicialMedicamentos);
            setRotinas(estadoInicialRotinas);
        }
    }, [user, carregarDados]);

    // ===== FUNÇÕES CRUD (Criação, Leitura, Atualização, Deleção) =====
    
    // Função para criar um novo medicamento
    const criarMedicamento = useCallback(async (data: any) => {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão não encontrada');
        
        const resposta = await fetch('/api/medicamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(erro.error || 'Falha ao criar medicamento');
        }

        const novoMedicamento = await resposta.json();
        setMedicamentos(anterior => ({
            ...anterior,
            lista: [...anterior.lista, novoMedicamento],
            total: anterior.total + 1
        }));
    }, [getAuthToken]);

    // Função para atualizar um medicamento existente
    const atualizarMedicamento = useCallback(async (id: string, data: any) => {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão não encontrada');
        
        const resposta = await fetch(`/api/medicamentos/${id}`, {
            method: 'PATCH', // Usar PATCH para atualizações parciais
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(erro.error || 'Falha ao atualizar medicamento');
        }

        const medicamentoAtualizado = await resposta.json();
        setMedicamentos(anterior => ({
            ...anterior,
            lista: anterior.lista.map(m => m.id === id ? { ...m, ...medicamentoAtualizado } : m)
        }));
    }, [getAuthToken]);

    // Função para criar uma nova rotina
    const criarRotina = useCallback(async (data: any) => {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão não encontrada');
        
        const resposta = await fetch('/api/rotinas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(erro.error || 'Falha ao criar rotina');
        }

        const novaRotina = await resposta.json();
        setRotinas(anterior => ({
            ...anterior,
            lista: [...anterior.lista, novaRotina],
            total: anterior.total + 1
        }));
    }, [getAuthToken]);
    
    // Função para atualizar uma rotina existente
    const atualizarRotina = useCallback(async (id: string, data: Partial<Rotina>) => {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão não encontrada');
        
        const resposta = await fetch(`/api/rotinas/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        
        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(erro.error || 'Falha ao atualizar rotina');
        }
        
        const rotinaAtualizada = await resposta.json();
        setRotinas(prev => ({
            ...prev,
            lista: prev.lista.map(rot => rot.id === id ? { ...rot, ...rotinaAtualizada } : rot)
        }));
    }, [getAuthToken]);
    
    // Função para confirmar a exclusão
    const confirmarExclusao = (tipo: 'medicamentos' | 'rotinas', id: string) => {
        const itemType = tipo === 'medicamentos' ? 'medicamento' : 'rotina';
        setConfirmDialog({
            isOpen: true,
            title: `Excluir ${itemType}`,
            message: `Tem certeza que deseja excluir este ${itemType}?`,
            onConfirm: () => executarExclusao(tipo, id)
        });
    };

    // Função que executa a exclusão
    const executarExclusao = async (tipo: 'medicamentos' | 'rotinas', id: string) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Sessão não encontrada');

            // Atualização otimista
            if (tipo === 'medicamentos') {
                setMedicamentos(anterior => ({
                    ...anterior,
                    lista: anterior.lista.filter(med => med.id !== id),
                    total: anterior.total - 1
                }));
            } else {
                setRotinas(anterior => ({
                    ...anterior,
                    lista: anterior.lista.filter(rot => rot.id !== id),
                    total: anterior.total - 1
                }));
            }

            const resposta = await fetch(`/api/${tipo}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resposta.ok) throw new Error('Falha ao excluir o item');
        } catch (erro) {
            handleApiError(erro, 'Erro ao excluir item');
            carregarDados(); // Recarrega os dados em caso de falha
        } finally {
            setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        }
    };
    
    const fecharConfirmacao = useCallback(() => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }, []);

    // Formata a frequência para exibição
    const formatarFrequencia = useCallback((frequencia: Frequencia | null): string => {
        if (!frequencia) return 'Sem repetição';
        switch (frequencia.tipo) {
            case 'diario': return `Diário - ${frequencia.horarios.join(', ')}`;
            case 'intervalo': return `A cada ${frequencia.intervalo_horas}h (início: ${frequencia.inicio})`;
            case 'dias_alternados': return `A cada ${frequencia.intervalo_dias} dias (${frequencia.horario})`;
            case 'semanal': {
                const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const dias = frequencia.dias_da_semana.map(dia => diasSemana[dia - 1]).join(', ');
                return `Toda ${dias} (${frequencia.horario})`;
            }
            default: return 'Frequência personalizada';
        }
    }, []);

    // ===== HANDLERS PARA FORMULÁRIOS =====
    
    // Lida com o salvamento de medicamento
    const handleSaveMedicamento = useCallback(async (nome: string, dosagem: string | null, frequencia: Frequencia, quantidade: number) => {
        try {
            const data = { nome, dosagem, frequencia, quantidade, data_agendada: new Date().toISOString(), concluido: false };
            if (isEditing && currentMedicamento) {
                await atualizarMedicamento(currentMedicamento.id, data);
            } else {
                await criarMedicamento(data);
            }
            closeModal();
        } catch (erro) {
            handleApiError(erro, `Erro ao ${isEditing ? 'atualizar' : 'criar'} medicamento`);
        }
    }, [isEditing, currentMedicamento, atualizarMedicamento, criarMedicamento, closeModal, handleApiError]);

    // Lida com o salvamento de rotina
    const handleSaveRotina = useCallback(async (titulo: string, descricao: string, frequencia: any) => {
        try {
            // A API espera: { titulo, descricao, frequencia, concluido }
            const data = {
                titulo,
                descricao,
                frequencia,
                concluido: false,
            };
            if (isEditing && currentRotina) {
                await atualizarRotina(currentRotina.id, data);
            } else {
                await criarRotina(data);
            }
            closeModal();
        } catch (erro) {
            handleApiError(erro, `Erro ao ${isEditing ? 'atualizar' : 'criar'} rotina`);
        }
    }, [isEditing, currentRotina, criarRotina, atualizarRotina, closeModal, handleApiError]);
    
    // Lida com a edição de rotina
    const handleEditRotina = useCallback((rotina: Rotina) => {
        setCurrentRotina(rotina);
        setModalType('rotina');
        setIsEditing(true);
        setIsModalOpen(true);
    }, []);

    // Alterna status de conclusão do medicamento (otimista)
    const handleToggleStatus = useCallback(async (id: string) => {
        // estado anterior para possível rollback
        let previousState: MedicamentosData | null = null;
        setMedicamentos(prev => {
            previousState = prev;
            const lista = prev.lista.map(m => m.id === id ? { ...m, concluido: !m.concluido } : m);
            return {
                ...prev,
                lista,
                concluidos: lista.filter(m => m.concluido).length,
            };
        });

        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Sessão não encontrada');
            const med = medicamentos.lista.find(m => m.id === id);
            const novoStatus = med ? !med.concluido : true;

            const resposta = await fetch(`/api/medicamentos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ concluido: novoStatus })
            });

            if (!resposta.ok) {
                throw new Error('Falha ao atualizar status do medicamento');
            }
        } catch (erro) {
            // rollback
            if (previousState) {
                setMedicamentos(previousState);
            }
            handleApiError(erro, 'Erro ao atualizar status do medicamento');
        }
    }, [getAuthToken, handleApiError, medicamentos.lista]);

    // Alterna status de conclusão da rotina (otimista)
    const handleToggleRotinaStatus = useCallback(async (id: string) => {
        // estado anterior para possível rollback
        let previousState: RotinasData | null = null;
        setRotinas(prev => {
            previousState = prev;
            const lista = prev.lista.map(r => r.id === id ? { ...r, concluido: !r.concluido } : r);
            return {
                ...prev,
                lista,
                concluidas: lista.filter(r => r.concluido).length,
            };
        });

        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Sessão não encontrada');
            const rot = rotinas.lista.find(r => r.id === id);
            const novoStatus = rot ? !rot.concluido : true;

            const resposta = await fetch(`/api/rotinas/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ concluido: novoStatus })
            });

            if (!resposta.ok) {
                throw new Error('Falha ao atualizar status da rotina');
            }
        } catch (erro) {
            // rollback
            if (previousState) {
                setRotinas(previousState);
            }
            handleApiError(erro, 'Erro ao atualizar status da rotina');
        }
    }, [getAuthToken, handleApiError, rotinas.lista]);

    // ===== RENDERIZAÇÃO =====

    // Renderização do modal
    const renderModal = useMemo(() => {
        if (!isModalOpen) return null;

        return (
            <Modal 
                isOpen={isModalOpen} 
                onClose={closeModal}
                title={isEditing ? `Editar ${modalType}` : `Adicionar ${modalType}`}
            >
                {modalType === 'medicamento' ? (
                    <AddMedicamentoForm 
                        onSave={handleSaveMedicamento}
                        onCancel={closeModal}
                        medicamento={currentMedicamento ?? undefined}
                    />
                ) : (
                    <AddRotinaForm 
                        onSave={handleSaveRotina}
                        onCancel={closeModal}
                        rotina={currentRotina ?? undefined}
                    />
                )}
            </Modal>
        );
    }, [isModalOpen, modalType, isEditing, currentMedicamento, currentRotina, handleSaveMedicamento, handleSaveRotina, closeModal]);

    // Renderização da lista de medicamentos
    const listaMedicamentos = useMemo(() => {
        if (medicamentos.lista.length === 0) {
            return (
                <p className={styles.empty_list}>Nenhum medicamento adicionado.</p>
            );
        }
        return (
            <ul className={styles.list}>
                {medicamentos.lista.map(med => (
                    <li key={med.id} className={styles.list_item}>
                        <div className={styles.item_info}>
                            <strong>{med.nome}</strong>
                            <span>{med.dosagem} - {formatarFrequencia(med.frequencia)}</span>
                        </div>
                        {!readOnly && (
                            <div className={styles.item_actions}>
                                <button
                                    onClick={() => handleToggleStatus(med.id)}
                                    className={`${styles.statusButton} ${med.concluido ? styles.completed : ''}`}
                                    aria-label={med.concluido ? 'Desfazer' : 'Concluir'}
                                    title={med.concluido ? 'Desfazer' : 'Concluir'}
                                >
                                    {med.concluido ? <FiX /> : <FiCheck />}
                                </button>
                                <button onClick={() => openModal('medicamento', med)} className={styles.icon_button}><FiEdit2 /></button>
                                <button onClick={() => confirmarExclusao('medicamentos', med.id)} className={`${styles.icon_button} ${styles.danger}`}><FiTrash2 /></button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        );
    }, [medicamentos.lista, openModal, formatarFrequencia, handleToggleStatus, confirmarExclusao, readOnly]);

    // Renderização da lista de rotinas
    const listaRotinas = useMemo(() => {
        if (rotinas.lista.length === 0) {
            return (
                <p className={styles.empty_list}>Nenhuma rotina adicionada.</p>
            );
        }
        return (
            <ul className={styles.list}>
                {rotinas.lista.map((rot) => (
                    <li key={rot.id} className={styles.list_item}>
                        <div className={styles.item_info}>
                            <strong>{rot.titulo || rot.descricao || 'Rotina'}</strong>
                            {rot.descricao && rot.titulo ? (
                                <span>{rot.descricao}</span>
                            ) : null}
                        </div>
                        {!readOnly && (
                            <div className={styles.item_actions}>
                                <button
                                    onClick={() => handleToggleRotinaStatus(rot.id)}
                                    className={`${styles.statusButton} ${rot.concluido ? styles.completed : ''}`}
                                    aria-label={rot.concluido ? 'Desfazer' : 'Concluir'}
                                    title={rot.concluido ? 'Desfazer' : 'Concluir'}
                                >
                                    {rot.concluido ? <FiX /> : <FiCheck />}
                                </button>
                                <button onClick={() => handleEditRotina(rot)} className={styles.icon_button}>
                                    <FiEdit2 />
                                </button>
                                <button onClick={() => confirmarExclusao('rotinas', rot.id)} className={`${styles.icon_button} ${styles.danger}`}>
                                    <FiTrash2 />
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        );
    }, [rotinas.lista, handleEditRotina, handleToggleRotinaStatus, readOnly]);

    return (
        <div className={styles.dashboard_client}>
            {!readOnly && (
                <div className={styles.actions}>
                    <button className={`${styles.button} ${styles.primary}`} onClick={() => openModal('medicamento')}>
                        <FiPlus size={16} /> Adicionar Medicamento
                    </button>
                    <button className={styles.button} onClick={() => openModal('rotina')}>
                        <FiPlus size={16} /> Adicionar Rotina
                    </button>
                </div>
            )}

            <div className={styles.cards_container}>
            <div className={styles.card}>
                <h3>Medicamentos</h3>
                <p><strong>Total:</strong> {medicamentos.total}</p>
                <p><strong>Concluídos:</strong> {medicamentos.concluidos}</p>
                <div className={styles.progress_bar}>
                    <div
                        className={styles.progress_fill}
                        style={{ width: `${medicamentos.total ? (medicamentos.concluidos / medicamentos.total) * 100 : 0}%` }}
                    />
                </div>
                {!readOnly && (
                    <button className={styles.add_btn} onClick={() => openModal('medicamento')}>
                        <FiPlus size={16} /> Adicionar Medicamento
                    </button>
                )}
            </div>
            
            <div className={styles.card}>
                <h3>Rotinas</h3>
                <p><strong>Total:</strong> {rotinas.total}</p>
                <p><strong>Concluídas:</strong> {rotinas.concluidas}</p>
                <div className={styles.progress_bar}>
                    <div
                        className={styles.progress_fill}
                        style={{ width: `${rotinas.total ? (rotinas.concluidas / rotinas.total) * 100 : 0}%` }}
                    />
                </div>
                {!readOnly && (
                    <button className={styles.add_btn} onClick={() => openModal('rotina')}>
                        <FiPlus size={16} /> Adicionar Rotina
                    </button>
                )}
            </div>
        </div>

        <div className={styles.list_section}>
            <div className={styles.list_container}>
                <div className={styles.list_header}>
                    <h3>Medicamentos</h3>
                </div>
                {listaMedicamentos}
            </div>

            <div className={styles.list_container}>
                <div className={styles.list_header}>
                    <h3>Rotinas</h3>
                </div>
                {listaRotinas}
            </div>
        </div>

        {!readOnly && renderModal}
        
        {!readOnly && (
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={confirmDialog.onConfirm || (() => {})}
                onCancel={fecharConfirmacao}
                danger
            />
        )}
    </div>
    );
}