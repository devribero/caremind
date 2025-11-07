'use client';

// Importações básicas do React
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { shouldResetMedicamento } from '@/lib/utils/medicamento';
import { MedicamentosService } from '@/lib/supabase/services/medicamentos';
import { RotinasService } from '@/lib/supabase/services/rotinas';
import { HistoricoEventosService } from '@/lib/supabase/services/historicoEventos';
import { AddRotinaForm } from './forms/AddRotinaForm';
import { AddMedicamentoForm } from './forms/AddMedicamentoForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import styles from './DashboardClient.module.css';
import { useLoading } from '@/contexts/LoadingContext';
import { FiPlus, FiAlertTriangle, FiClock, FiEdit2, FiTrash2 } from 'react-icons/fi';
import type { Database } from '@/types/supabase';

// ===== TIPOS DE DADOS =====

// Tipos baseados no schema do banco de dados
type Medicamento = Database['public']['Tables']['medicamentos']['Row'] & {
    quantidade?: number | null;
    data_agendada?: string | null;
};

type Rotina = Database['public']['Tables']['rotinas']['Row'];

// Tipos para o estado do componente
interface MedicamentosData {
    total: number;
    concluidos: number;
    lista: Medicamento[];
}

interface RotinasData {
    total: number;
    concluidas: number;
    lista: Rotina[];
}

interface Frequencia {
    tipo: 'diario' | 'intervalo' | 'especifico' | 'semanal' | 'mensal' | 'dias_alternados';
    intervalo?: number;
    dias?: number[];
    dias_da_semana?: number[];
    dias_do_mes?: number[];
}

type MedicamentoFrequencia = Frequencia;

interface MedicamentoFormData extends Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'user_id'> {
    id?: string | number;
}

interface RotinaFormData extends Omit<Rotina, 'id' | 'created_at' | 'updated_at' | 'user_id'> {
    id?: string | number;
}

interface AgendaItem {
    id: string;
    tipo_evento: 'medicamento' | 'rotina' | string;
    evento_id: string;
    titulo: string;
    horario?: Date;
    status: 'pendente' | 'confirmado' | 'esquecido' | string;
}

const estadoInicialMedicamentos: MedicamentosData = {
    total: 0,
    concluidos: 0,
    lista: []
};

const estadoInicialRotinas: RotinasData = {
    total: 0,
    concluidas: 0,
    lista: []
};

const estadoInicialAgenda: AgendaItem[] = [];

// ===== COMPONENTE PRINCIPAL =====

interface User {
    id: string;
    email?: string;
    // Add other user properties as needed
}

function useCarregarDados(user: User | null, idosoId?: string) {
    const [medicamentos, setMedicamentos] = useState<MedicamentosData>(estadoInicialMedicamentos);
    const [rotinas, setRotinas] = useState<RotinasData>(estadoInicialRotinas);
    const [agenda, setAgenda] = useState<AgendaItem[]>(estadoInicialAgenda);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { setIsLoading } = useLoading();

    const carregarDados = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);
            setIsLoading(true);

            const [dadosMedicamentos, dadosRotinas, itensAgenda] = await Promise.all([
                idosoId ? MedicamentosService.listarMedicamentos(idosoId) : Promise.resolve([]),
                idosoId ? RotinasService.listarRotinas(idosoId) : Promise.resolve([]),
                idosoId ? buscarAgenda(idosoId) : Promise.resolve([]),
            ]);

            setMedicamentos({
                total: dadosMedicamentos.length,
                concluidos: dadosMedicamentos.filter((m: any) => m.concluido).length,
                lista: dadosMedicamentos
            });

            setRotinas({
                total: dadosRotinas.length,
                concluidas: dadosRotinas.filter((r: any) => r.concluido).length,
                lista: dadosRotinas
            });

            setAgenda(itensAgenda);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError(err instanceof Error ? err : new Error('Erro desconhecido ao carregar dados'));
        } finally {
            setLoading(false);
            setIsLoading(false);
        }
    }, [user, idosoId, setIsLoading]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    return { medicamentos, rotinas, agenda, loading, error, recarregar: carregarDados, setMedicamentos, setRotinas, setAgenda };
}

async function buscarAgenda(idosoId: string): Promise<AgendaItem[]> {
    try {
        const hoje = new Date();
        const data = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD

        const eventos = await HistoricoEventosService.listarEventosPorData(idosoId, data);

        return eventos.map((evento) => ({
            id: evento.id.toString(),
            tipo_evento: evento.tipo_evento || 'outro',
            evento_id: evento.evento_id?.toString() || '',
            titulo: evento.descricao || 'Evento sem descrição',
            horario: evento.data_prevista ? new Date(evento.data_prevista) : undefined,
            status: (evento.status as 'pendente' | 'confirmado' | 'esquecido') || 'pendente',
        })).sort((a, b) => {
            const rank = (it: AgendaItem) => it.status === 'confirmado' ? 2 : (it.horario && it.horario < new Date() ? 0 : 1);
            const ra = rank(a);
            const rb = rank(b);
            if (ra !== rb) return ra - rb;
            return (a.horario?.getTime() || 0) - (b.horario?.getTime() || 0);
        });
    } catch (erro) {
        console.error('Falha ao buscar agenda:', erro);
        return [];
    }
}

export default function DashboardClient({ readOnly = false, idosoId }: { readOnly?: boolean; idosoId?: string }): React.ReactElement {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'medicamento' | 'rotina'>('medicamento');
    const [isEditing, setIsEditing] = useState(false);

    const [medicamentoSelecionado, setMedicamentoSelecionado] = useState<Medicamento | null>(null);
    const [rotinaSelecionada, setRotinaSelecionada] = useState<Rotina | null>(null);
    const [mostrarFormMedicamento, setMostrarFormMedicamento] = useState(false);
    const [mostrarFormRotina, setMostrarFormRotina] = useState(false);
    const [mostrarConfirmacaoExclusao, setMostrarConfirmacaoExclusao] = useState(false);
    const [itemParaExcluir, setItemParaExcluir] = useState<{ tipo: 'medicamento' | 'rotina'; id: string } | null>(null);
    // agenda manipulada via hook

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

    const { user } = useAuth();
    const { setIsLoading } = useLoading();

    const { 
      medicamentos, 
      rotinas, 
      agenda, 
      loading, 
      error, 
      recarregar: recarregarDados,
      setMedicamentos,
      setRotinas,
      setAgenda
    } = useCarregarDados(user, idosoId);

    const supabase = useMemo(() => createClient(), []);
    const alertsRef = useRef<HTMLDivElement>(null);
    const pendingControllers = useRef<AbortController[]>([]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setIsEditing(false);
        setMedicamentoSelecionado(null);
        setRotinaSelecionada(null);
    }, []);

    const isSameDay = useCallback((a: Date, b: Date) => (
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    ), []);

    const toDate = useCallback((iso: string | null | undefined) => {
        if (!iso) return undefined;
        try {
            return new Date(iso);
        } catch (e) {
            console.error('Erro ao converter data:', e);
            return undefined;
        }
    }, []);

    const now = useMemo(() => new Date(), []);
    const yesterday = useMemo(() => {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return d;
    }, [now]);

    const openModal = useCallback((type: 'medicamento' | 'rotina', medicamento: Medicamento | null = null) => {
        setModalType(type);
        setIsModalOpen(true);

        if (medicamento) {
            setIsEditing(true);
            setMedicamentoSelecionado(medicamento);
        } else {
            setIsEditing(false);
            setMedicamentoSelecionado(null);
        }
    }, []);

    const getAuthToken = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return session?.access_token;
        } catch (error) {
            console.error('Erro ao obter token de autenticação:', error);
            return null;
        }
    }, [supabase]);

    const handleApiError = useCallback((error: unknown, mensagemPadrao: string) => {
        const mensagem = error instanceof Error ? error.message : mensagemPadrao;
        console.error('Erro na API:', error);
        alert(`Erro: ${mensagem}`);
    }, []);

    const isMedicamentoHoje = useCallback((m: Medicamento): boolean => {
        const d = toDate(m.data_agendada);
        if (d && isSameDay(d, now)) return true;
        const f = m.frequencia;
        if (!f) return false;
        if (f.tipo === 'diario') return true;
        if (f.tipo === 'semanal') {
            const today = now.getDay(); // 0=Dom, 6=Sáb
            return Array.isArray(f.dias_da_semana) && f.dias_da_semana.includes(today + 1); // API usa 1=Dom
        }
        return false;
    }, [now, isSameDay, toDate]);

    const isRotinaHoje = useCallback((r: Rotina): boolean => {
        const d = toDate(r.data_agendada as any);
        if (d && isSameDay(d, now)) return true;
        const f: any = r.frequencia as any;
        if (!f || typeof f !== 'object') return false;
        if (f.tipo === 'diario') return true;
        if (f.tipo === 'semanal') {
            const today = now.getDay();
            return Array.isArray(f.dias_da_semana) && f.dias_da_semana.includes(today + 1);
        }
        return false;
    }, [now, isSameDay, toDate]);

    const criarMedicamento = useCallback(async (data: any) => {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão não encontrada');

        try {
            setIsLoading(true);
            const novoMedicamento = await MedicamentosService.criarMedicamento({
                ...(data as any),
                user_id: idosoId as any,
            } as any);
            setMedicamentos((anterior: MedicamentosData) => ({
                ...anterior,
                lista: [...anterior.lista, novoMedicamento as any],
                total: anterior.total + 1
            }));
        } catch (erro) {
            console.error('Erro ao criar medicamento:', erro);
            handleApiError(erro, 'Não foi possível criar o medicamento');
            throw erro as any;
        } finally {
            setIsLoading(false);
        }
    }, [getAuthToken, idosoId]);

    const atualizarMedicamento = useCallback(async (id: string, data: any) => {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão não encontrada');

        try {
            setIsLoading(true);
            const medicamentoAtualizado = await MedicamentosService.atualizarMedicamento(Number(id), data as any);
            setMedicamentos((anterior: MedicamentosData) => ({
                ...anterior,
                lista: anterior.lista.map((m: Medicamento) => String(m.id) === String(id) ? { ...m, ...medicamentoAtualizado as any } : m)
            }));
        } catch (erro) {
            console.error('Erro ao atualizar medicamento:', erro);
            handleApiError(erro, 'Não foi possível atualizar o medicamento');
            throw erro as any;
        } finally {
            setIsLoading(false);
        }
    }, [getAuthToken]);

    const criarRotina = useCallback(async (data: any) => {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão não encontrada');

        try {
            setIsLoading(true);
            const novaRotina = await RotinasService.criarRotina({
                ...(data as any),
                user_id: idosoId as any,
            } as any);
            setRotinas((anterior: RotinasData) => ({
                ...anterior,
                lista: [...anterior.lista, novaRotina as any],
                total: anterior.total + 1
            }));
        } catch (erro) {
            console.error('Erro ao criar rotina:', erro);
            handleApiError(erro, 'Não foi possível criar a rotina');
            throw erro as any;
        } finally {
            setIsLoading(false);
        }
    }, [getAuthToken, idosoId]);

    const atualizarRotina = useCallback(async (id: string, data: any) => {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão não encontrada');

        try {
            setIsLoading(true);
            const rotinaAtualizada = await RotinasService.atualizarRotina(Number(id), data as any);
            setRotinas((prev: RotinasData) => ({
                ...prev,
                lista: prev.lista.map((rot: Rotina) => String(rot.id) === String(id) ? { ...rot, ...rotinaAtualizada as any } : rot)
            }));
        } catch (erro) {
            console.error('Erro ao atualizar rotina:', erro);
            handleApiError(erro, 'Não foi possível atualizar a rotina');
            throw erro as any;
        } finally {
            setIsLoading(false);
        }
    }, [getAuthToken]);

    const confirmarExclusao = useCallback((itemId: string, itemType: 'medicamentos' | 'rotinas') => {
        setConfirmDialog({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir este ${itemType === 'medicamentos' ? 'medicamento' : 'rotina'}?`,
            onConfirm: async () => {
                try {
                    await executarExclusao(itemId, itemType);
                    await recarregarDados();
                } catch (erro) {
                    console.error(`Erro ao excluir ${itemType === 'medicamentos' ? 'medicamento' : 'rotina'}:`, erro);
                    handleApiError(erro, `Não foi possível excluir o ${itemType === 'medicamentos' ? 'medicamento' : 'rotina'}`);
                }
            },
            itemId,
            itemType
        });
    }, [executarExclusao, recarregarDados]);

    async function executarExclusao(itemId: string, itemType: 'medicamentos' | 'rotinas'): Promise<void> {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Sessão não encontrada');

            if (itemType === 'medicamentos') {
                setMedicamentos((anterior: MedicamentosData) => ({
                    ...anterior,
                    lista: anterior.lista.filter((med: Medicamento) => String(med.id) !== String(itemId)),
                    total: anterior.total - 1
                }));
            } else {
                setRotinas((anterior: RotinasData) => ({
                    ...anterior,
                    lista: anterior.lista.filter((rot: Rotina) => String(rot.id) !== String(itemId)),
                    total: anterior.total - 1
                }));
            }

            if (itemType === 'medicamentos') {
                await MedicamentosService.excluirMedicamento(Number(itemId));
            } else {
                await RotinasService.excluirRotina(Number(itemId));
            }
        } catch (erro) {
            console.error(`Erro ao excluir ${itemType === 'medicamentos' ? 'medicamento' : 'rotina'}:`, erro);
            handleApiError(erro, `Não foi possível excluir o ${itemType === 'medicamentos' ? 'medicamento' : 'rotina'}`);
        }
    }

    const formatarFrequencia = useCallback((frequencia: Frequencia | null): string => {
        if (!frequencia) return 'Sem repetição';
        switch (frequencia.tipo) {
            case 'diario': {
                const horarios = (frequencia as any).horarios as string[] | undefined;
                const texto = Array.isArray(horarios) && horarios.length > 0 ? horarios.join(', ') : 'horário não definido';
                return `Diário - ${texto}`;
            }
            case 'intervalo': {
                const h = (frequencia as any).intervalo_horas ?? (frequencia as any).intervalo;
                return `A cada ${h ?? 24}h`;
            }
            case 'dias_alternados': {
                const d = (frequencia as any).intervalo_dias ?? (frequencia as any).intervalo;
                const horario = (frequencia as any).horario;
                return `A cada ${d ?? 2} dias${horario ? ` (${horario})` : ''}`;
            }
            case 'semanal': {
                const dias = (frequencia as any).dias_da_semana as number[] | undefined;
                const horario = (frequencia as any).horario as string | undefined;
                if (Array.isArray(dias) && dias.length > 0) {
                    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                    const txt = dias.map(dia => diasSemana[(dia - 1 + 7) % 7]).join(', ');
                    return `Toda ${txt}${horario ? ` (${horario})` : ''}`;
                }
                return `Semanal${horario ? ` (${horario})` : ''}`;
            }
            default:
                return 'Frequência personalizada';
        }
    }, []);

    const handleSaveMedicamento = useCallback(async (nome: string, dosagem: string | null, frequencia: Frequencia, quantidade: number) => {
        try {
            const data: Pick<Medicamento, 'nome' | 'dosagem' | 'frequencia' | 'quantidade' | 'data_agendada' | 'concluido'> = {
                nome,
                dosagem: dosagem as any, // conforme schema atual
                frequencia: frequencia as any,
                quantidade,
                data_agendada: new Date().toISOString(),
                concluido: false
            };

            if (isEditing && medicamentoSelecionado) {
                await atualizarMedicamento(String(medicamentoSelecionado.id), data);
            } else {
                await criarMedicamento(data);
            }
            closeModal();
            await recarregarDados(); // Recarrega os dados após salvar
        } catch (erro) {
            handleApiError(erro, `Erro ao ${isEditing ? 'atualizar' : 'criar'} medicamento`);
        }
    }, [isEditing, medicamentoSelecionado, atualizarMedicamento, criarMedicamento, closeModal, handleApiError, recarregarDados]);

    const handleSaveRotina = useCallback(async (titulo: string, descricao: string, frequencia: any) => {
        try {
            const data = {
                titulo,
                descricao,
                frequencia,
                concluido: false,
            };
            if (isEditing && rotinaSelecionada) {
                await atualizarRotina(String(rotinaSelecionada.id), data);
            } else {
                await criarRotina(data);
            }
            closeModal();
            await recarregarDados(); // Recarrega os dados após salvar
        } catch (erro) {
            handleApiError(erro, `Erro ao ${isEditing ? 'atualizar' : 'criar'} rotina`);
        }
    }, [isEditing, rotinaSelecionada, criarRotina, atualizarRotina, closeModal, handleApiError, recarregarDados]);

    const handleEditMedicamento = useCallback((medicamento: Medicamento) => {
        setMedicamentoSelecionado(medicamento);
        setModalType('medicamento');
        setIsEditing(true);
        setIsModalOpen(true);
    }, []);

    const handleEditRotina = useCallback((rotina: Rotina) => {
        setRotinaSelecionada(rotina);
        setModalType('rotina');
        setIsEditing(true);
        setIsModalOpen(true);
    }, []);

    const handleToggleStatus = useCallback(async (id: string, historicoEventoId?: string) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Sessão não encontrada');

            const agendaItem = agenda.find(it =>
                it.tipo_evento === 'medicamento' &&
                it.evento_id === id
            );
            const medicamento = medicamentos.lista.find(m => String(m.id) === String(id));
            if (!medicamento) return;

            const novoStatus = medicamento.concluido ? 'pendente' : 'confirmado';
            const novoConcluido = !medicamento.concluido;

            setAgenda(prevAgenda => prevAgenda.map(item =>
                item.tipo_evento === 'medicamento' && String(item.evento_id) === String(id)
                    ? { ...item, status: novoStatus }
                    : item
            ));

            setMedicamentos((prev: MedicamentosData) => ({
                ...prev,
                lista: prev.lista.map((m: Medicamento) => String(m.id) === String(id) ? { ...m, concluido: novoConcluido } : m),
                concluidos: prev.lista.reduce((acc: number, m: Medicamento) => acc + ((String(m.id) === String(id) ? novoConcluido : m.concluido) ? 1 : 0), 0)
            }));

            if (historicoEventoId) {
                await HistoricoEventosService.atualizarEvento(Number(historicoEventoId), { status: novoStatus, horario_confirmacao: novoStatus === 'confirmado' ? new Date().toISOString() : null } as any);
            }

            await MedicamentosService.atualizarMedicamento(Number(id), { concluido: novoConcluido } as any);
        } catch (erro) {
            setAgenda(prevAgenda => prevAgenda.map(item =>
                item.tipo_evento === 'medicamento' && String(item.evento_id) === String(id)
                    ? { ...item, status: item.status === 'confirmado' ? 'pendente' : 'confirmado' }
                    : item
            ));
            setMedicamentos((prev: MedicamentosData) => ({
                ...prev,
                lista: prev.lista.map((m: Medicamento) => String(m.id) === String(id) ? { ...m, concluido: !m.concluido } : m)
            }));
            handleApiError(erro, 'Erro ao atualizar status do medicamento');
        }
    }, [getAuthToken, handleApiError, medicamentos.lista]);

    const handleToggleRotinaStatus = useCallback(async (id: string, historicoEventoId?: string) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Sessão não encontrada');

            const agendaItem = agenda.find(it =>
                it.tipo_evento === 'rotina' &&
                it.evento_id === id
            );
            const rotina = rotinas.lista.find(r => String(r.id) === String(id));
            if (!rotina) return;

            const novoStatus = rotina.concluido ? 'pendente' : 'confirmado';
            const novoConcluido = !rotina.concluido;

            setAgenda(prevAgenda => prevAgenda.map(item =>
                item.tipo_evento === 'rotina' && String(item.evento_id) === String(id)
                    ? { ...item, status: novoStatus }
                    : item
            ));

            setRotinas((prev: RotinasData) => ({
                ...prev,
                lista: prev.lista.map((r: Rotina) => String(r.id) === String(id) ? { ...r, concluido: novoConcluido } : r),
                concluidas: prev.lista.reduce((acc: number, r: Rotina) => acc + ((String(r.id) === String(id) ? novoConcluido : r.concluido) ? 1 : 0), 0)
            }));

            if (historicoEventoId) {
                await HistoricoEventosService.atualizarEvento(Number(historicoEventoId), { status: novoStatus, horario_confirmacao: novoStatus === 'confirmado' ? new Date().toISOString() : null } as any);
            }

            await RotinasService.atualizarRotina(Number(id), { concluido: novoConcluido } as any);
        } catch (erro) {
            setAgenda(prevAgenda => prevAgenda.map(item =>
                item.tipo_evento === 'rotina' && String(item.evento_id) === String(id)
                    ? { ...item, status: item.status === 'confirmado' ? 'pendente' : 'confirmado' }
                    : item
            ));
            setRotinas((prev: RotinasData) => ({
                ...prev,
                lista: prev.lista.map((r: Rotina) => String(r.id) === String(id) ? { ...r, concluido: !r.concluido } : r)
            }));
            handleApiError(erro, 'Erro ao atualizar status da rotina');
        }
    }, [getAuthToken, handleApiError, rotinas.lista]);

    // Dados focados no dia
    const medsHoje = useMemo(() => {
        return medicamentos.lista.filter(m => isMedicamentoHoje(m));
    }, [medicamentos.lista, isMedicamentoHoje]);

    const rotinasHoje = useMemo(() => {
        return rotinas.lista.filter(r => isRotinaHoje(r));
    }, [rotinas.lista, isRotinaHoje]);

    const medsHojeConcluidos = useMemo(() => medsHoje.filter(m => m.concluido).length, [medsHoje]);
    const rotinasHojeConcluidas = useMemo(() => rotinasHoje.filter(r => r.concluido).length, [rotinasHoje]);

    const dosesOmitidas = useMemo(() => {
        return medicamentos.lista.filter(m => {
            const d = toDate(m.data_agendada);
            return d && !m.concluido && d < now && (isSameDay(d, now) || isSameDay(d, yesterday));
        });
    }, [medicamentos.lista, now, isSameDay, yesterday, toDate]);

    const estoqueBaixo = useMemo(() => medicamentos.lista.filter(m => typeof m.quantidade === 'number' && m.quantidade <= 3), [medicamentos.lista]);

    const alertasPendentes = useMemo(() => dosesOmitidas.length + estoqueBaixo.length, [dosesOmitidas.length, estoqueBaixo.length]);

    const agendaDoDia = useMemo(() => agenda, [agenda]);

    // Localiza o ID do histórico correspondente a um medicamento/rotina na agenda
    const getHistoricoIdForMedicamento = useCallback((medId: string): string | undefined => {
        const itens = agendaDoDia.filter(it => it.tipo_evento === 'medicamento' && it.evento_id === medId);
        const pendente = itens.find(it => it.status !== 'confirmado');
        return (pendente || itens[0])?.id;
    }, [agendaDoDia]);

    const getHistoricoIdForRotina = useCallback((rotinaId: string): string | undefined => {
        const itens = agendaDoDia.filter(it => it.tipo_evento === 'rotina' && it.evento_id === rotinaId);
        const pendente = itens.find(it => it.status !== 'confirmado');
        return (pendente || itens[0])?.id;
    }, [agendaDoDia]);

    const getStatusBadge = useCallback((status: string, horario?: Date) => {
        if (status === 'confirmado') return 'concluido';
        if (horario && horario < now) return 'atrasado';
        return 'pendente';
    }, [now]);

    // Alterna status de conclusão de um item da agenda (historico_eventos)
    const handleToggleAgendaStatus = useCallback(async (id: string) => {
        let previous: AgendaItem[] = [];
        setAgenda(prev => {
            previous = prev;
            return prev.map(it => it.id === id ? { ...it, status: it.status === 'confirmado' ? 'pendente' : 'confirmado' } : it);
        });

        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Sessão não encontrada');
            const item = (previous || []).find(i => String(i.id) === String(id));
            const novoStatus = item && item.status === 'confirmado' ? 'pendente' : 'confirmado';
            await HistoricoEventosService.atualizarEvento(Number(id), { status: novoStatus, horario_confirmacao: novoStatus === 'confirmado' ? new Date().toISOString() : null } as any);
        } catch (erro) {
            if (previous) setAgenda(previous);
            handleApiError(erro, 'Erro ao atualizar status do evento');
        }
    }, [getAuthToken, handleApiError]);

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
                        medicamento={medicamentoSelecionado ? {
                            id: String(medicamentoSelecionado.id),
                            nome: (medicamentoSelecionado.nome as any) ?? '',
                            dosagem: (medicamentoSelecionado.dosagem as any) ?? null,
                            quantidade: Number(medicamentoSelecionado.quantidade ?? 0),
                            frequencia: (medicamentoSelecionado.frequencia as any) ?? null,
                            data_agendada: medicamentoSelecionado.data_agendada || undefined,
                            concluido: Boolean(medicamentoSelecionado.concluido)
                        } : undefined}
                    />
                ) : (
                    <AddRotinaForm
                        onSave={handleSaveRotina}
                        onCancel={closeModal}
                        rotina={rotinaSelecionada ? { id: String(rotinaSelecionada.id), titulo: (rotinaSelecionada as any).titulo, descricao: (rotinaSelecionada as any).descricao } : undefined}
                    />
                )}
            </Modal>
        );
    }, [isModalOpen, modalType, isEditing, medicamentoSelecionado, rotinaSelecionada, handleSaveMedicamento, handleSaveRotina, closeModal]);

    // Removido: listas completas de medicamentos e rotinas do dashboard

    return (
        <div className={styles.dashboard_client}>
            <div className={styles.cards_container}>
                <div className={styles.card}>
                    <h3>Medicamentos Hoje</h3>
                    <p><strong></strong> {medsHojeConcluidos} de {medsHoje.length} concluídos</p>
                    <div className={styles.progress_bar}>
                        <div
                            className={styles.progress_fill}
                            style={{ width: `${medsHoje.length ? (medsHojeConcluidos / medsHoje.length) * 100 : 0}%` }}
                        />
                    </div>
                    {!readOnly && (
                        <button className={styles.add_btn} onClick={() => openModal('medicamento')}>
                            <FiPlus size={16} /> Adicionar Medicamento
                        </button>
                    )}
                </div>

                <div className={styles.card}>
                    <h3>Rotinas Hoje</h3>
                    <p><strong></strong> {rotinasHojeConcluidas} de {rotinasHoje.length} concluídas</p>
                    <div className={styles.progress_bar}>
                        <div
                            className={styles.progress_fill}
                            style={{ width: `${rotinasHoje.length ? (rotinasHojeConcluidas / rotinasHoje.length) * 100 : 0}%` }}
                        />
                    </div>
                    {!readOnly && (
                        <button className={styles.add_btn} onClick={() => openModal('rotina')}>
                            <FiPlus size={16} /> Adicionar Rotina
                        </button>
                    )}
                </div>

                <div className={styles.card} onClick={() => alertsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} style={{ cursor: 'pointer' }}>
                    <h3>Alertas Pendentes</h3>
                    <p><strong></strong> {alertasPendentes}</p>
                    <div className={styles.alerts_summary}>
                        <span className={styles.alert_badge}><FiAlertTriangle /> {dosesOmitidas.length} doses omitidas</span>
                        <span className={styles.alert_badge_low}><FiAlertTriangle /> {estoqueBaixo.length} estoques baixos</span>
                    </div>
                </div>
            </div>

            <div className={styles.alerts_section} ref={alertsRef}>
                <h3 className={styles.section_title}><FiAlertTriangle /> Alertas Importantes</h3>
                {alertasPendentes === 0 ? (
                    <p className={styles.empty_list}>Nenhum alerta importante no momento.</p>
                ) : (
                    <ul className={styles.list}>
                        {dosesOmitidas.map(m => (
                            <li key={'dose-' + m.id} className={styles.list_item + ' ' + styles.alert_item}>
                                <div className={styles.item_info}>
                                    <strong> Dose omitida: {m.nome}</strong>
                                    <span>Agendada para {toDate(m.data_agendada)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </li>
                        ))}
                        {estoqueBaixo.map(m => (
                            <li key={'stock-' + m.id} className={styles.list_item + ' ' + styles.alert_item_low}>
                                <div className={styles.item_info}>
                                    <strong> Estoque baixo: {m.nome}</strong>
                                    <span>Quantidade atual: {m.quantidade}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className={styles.list_section}>
                <div className={styles.list_container}>
                    <div className={styles.list_header}>
                        <h3>Medicamentos de hoje</h3>
                    </div>
                    {medsHoje.length === 0 ? (
                        <p className={styles.empty_list}>Nenhum medicamento para hoje.</p>
                    ) : (
                        <ul className={styles.list}>
                            {medsHoje.map(m => {
                                const agendaItem = agendaDoDia.find(it => it.tipo_evento === 'medicamento' && String(it.evento_id) === String(m.id));
                                const isDone = agendaItem?.status === 'confirmado' || m.concluido;
                                const historicoId = getHistoricoIdForMedicamento(String(m.id));

                                return (
                                    <li key={m.id} className={`${styles.list_item} ${isDone ? styles.completed : ''}`}>
                                        <div className={styles.item_info}>
                                            <strong>{m.nome}</strong>
                                            {m.dosagem && <span>{m.dosagem}</span>}
                                            {m.frequencia && <span className={styles.frequencia}>{formatarFrequencia(m.frequencia)}</span>}
                                            <span className={styles.quantidade}>Quantidade: {m.quantidade}</span>
                                        </div>
                                        {!readOnly && (
                                            <div className={styles.item_actions}>
                                                <button
                                                    onClick={() => handleToggleStatus(String(m.id), historicoId)}
                                                    className={isDone ? styles.desfazer_btn : styles.concluir_btn}
                                                >
                                                    {isDone ? 'Desfazer' : 'Concluir'}
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className={styles.list_container}>
                    <div className={styles.list_header}>
                        <h3>Rotinas de hoje</h3>
                    </div>
                    {rotinasHoje.length === 0 ? (
                        <p className={styles.empty_list}>Nenhuma rotina para hoje.</p>
                    ) : (
                        <ul className={styles.list}>
                            {rotinasHoje.map(r => {
                                const agendaItem = agendaDoDia.find(it => it.tipo_evento === 'rotina' && String(it.evento_id) === String(r.id));
                                const isDone = agendaItem?.status === 'confirmado' || r.concluido;
                                return (
                                    <li key={r.id} className={`${styles.list_item} ${isDone ? styles.completed : ''}`}>
                                        <div className={styles.item_info}>
                                            <strong>{r.titulo || 'Rotina'}</strong>
                                            {r.descricao ? <span>{r.descricao}</span> : null}
                                            {r.frequencia ? <span className={styles.frequencia}>{formatarFrequencia(r.frequencia as any)}</span> : null}
                                        </div>
                                        {!readOnly && (
                                            <div className={styles.item_actions}>
                                                <button
                                                    onClick={() => handleToggleRotinaStatus(String(r.id), getHistoricoIdForRotina(String(r.id)))}
                                                    className={isDone ? styles.desfazer_btn : styles.concluir_btn}
                                                >
                                                    {isDone ? 'Desfazer' : 'Concluir'}
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            <div className={styles.agenda_section}>
                <h3 className={styles.section_title}><FiClock /> Agenda do Dia</h3>
                {agendaDoDia.length === 0 ? (
                    <p className={styles.empty_list}>Nenhuma tarefa agendada para hoje.</p>
                ) : (
                    <ul className={styles.list}>
                        {agendaDoDia.map(item => {
                            const statusBadge = getStatusBadge(item.status, item.horario);
                            return (
                                <li key={item.id} className={styles.list_item}>
                                    <div className={styles.item_info}>
                                        <strong>{item.titulo}</strong>
                                        <span>{item.horario ? item.horario.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </div>
                                    <div className={styles.item_actions}>
                                        <span
                                            onClick={() => handleToggleAgendaStatus(item.id)}
                                            className={statusBadge === 'atrasado' ? styles.status_badge_late : statusBadge === 'concluido' ? styles.status_badge_done : styles.status_badge}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {statusBadge === 'atrasado' ? 'Atrasado' : statusBadge === 'concluido' ? 'Concluído' : 'Pendente'}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {!readOnly && renderModal}

            {!readOnly && (
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText="Excluir"
                    cancelText="Cancelar"
                    onConfirm={confirmDialog.onConfirm || (() => { })}
                    onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    danger
                />
            )}
        </div>
    );
}