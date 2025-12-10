'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileContext } from '@/contexts/ProfileContext';
import { listarIdososVinculados } from '@/lib/supabase/services/vinculos';

export type IdosoResumo = {
  id: string;
  nome: string;
};

export const TODOS_IDOSOS_ID = '__TODOS__';

type IdosoContextType = {
  listaIdososVinculados: IdosoResumo[];
  idosoSelecionadoId: string | null;
  setIdosoSelecionado: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  mostrarTodos: boolean; // true quando "Todos" está selecionado
  todosIdososIds: string[]; // lista de todos os IDs para queries
};

const IdosoContext = createContext<IdosoContextType | undefined>(undefined);

export function IdosoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [lista, setLista] = useState<IdosoResumo[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.id) {
      setLista([]);
      setSelecionado(null);
      return;
    }
    // Apenas contas familiares listam idosos vinculados
    const isFamiliar = ((profile?.tipo || user.user_metadata?.account_type)?.toString().toLowerCase() === 'familiar');
    if (!isFamiliar) {
      setLista([]);
      setSelecionado(null);
      return;
    }

    setLoading(true);
    try {
      const idososVinculados = await listarIdososVinculados(profile.id);

      const mapped: IdosoResumo[] = idososVinculados.map((vinculo) => ({
        id: vinculo.id_idoso,
        nome: vinculo.idoso?.nome || 'Idoso',
      }));

      setLista(mapped);

      // Mantém seleção se ainda existir; caso contrário, usa persistido ou seleciona primeiro
      const persisted = typeof window !== 'undefined' ? (localStorage.getItem('idosoSelecionadoId') || null) : null;
      setSelecionado((prev) => {
        const candidate = (persisted && persisted !== '') ? persisted : prev;
        if (candidate && mapped.some((i) => i.id === candidate)) return candidate;
        return mapped.length ? mapped[0].id : null;
      });
    } catch (error) {
      console.error('Erro ao carregar idosos vinculados:', error);
      setLista([]);
      setSelecionado(null);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.id, profile?.tipo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Persiste a seleção entre sessões
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selecionado) {
        localStorage.setItem('idosoSelecionadoId', selecionado);
      } else {
        localStorage.removeItem('idosoSelecionadoId');
      }
    }
  }, [selecionado]);

  const mostrarTodos = selecionado === TODOS_IDOSOS_ID;
  const todosIdososIds = useMemo(() => lista.map(i => i.id), [lista]);

  const value: IdosoContextType = useMemo(() => ({
    listaIdososVinculados: lista,
    idosoSelecionadoId: mostrarTodos ? null : escolhidoOrNull(selecionado),
    setIdosoSelecionado: setSelecionado,
    loading,
    refresh,
    mostrarTodos,
    todosIdososIds,
  }), [lista, selecionado, loading, refresh, mostrarTodos, todosIdososIds]);

  return (
    <IdosoContext.Provider value={value}>
      {children}
    </IdosoContext.Provider>
  );
}

function escolhidoOrNull(id: string | null) { return id ?? null; }

export function useIdoso() {
  const ctx = useContext(IdosoContext);
  if (!ctx) throw new Error('useIdoso deve ser usado dentro de IdosoProvider');
  return ctx;
}
