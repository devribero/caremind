'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

export type IdosoResumo = {
  id: string;
  nome: string;
};

type IdosoContextType = {
  listaIdososVinculados: IdosoResumo[];
  idosoSelecionadoId: string | null;
  setIdosoSelecionado: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>;
};

const IdosoContext = createContext<IdosoContextType | undefined>(undefined);

export function IdosoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [lista, setLista] = useState<IdosoResumo[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setLista([]);
      setSelecionado(null);
      return;
    }
    // Apenas contas familiares listam idosos vinculados
    const isFamiliar = (profile?.tipo || user.user_metadata?.account_type) === 'familiar';
    if (!isFamiliar) {
      setLista([]);
      setSelecionado(null);
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/vinculos/idosos', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
      });
      if (!res.ok) {
        setLista([]);
        setSelecionado(null);
        return;
      }
      const itens = await res.json();
      const mapped: IdosoResumo[] = (Array.isArray(itens) ? itens : []).map((x: any) => ({
        id: x.id || x.idoso_id || x.id_idoso,
        nome: x.nome || x.nome_idoso || x.nome_completo || 'Idoso',
      }));
      setLista(mapped);
      // Mantém seleção se ainda existir; caso contrário, seleciona primeiro
      setSelecionado((prev) => {
        if (prev && mapped.some((i) => i.id === prev)) return prev;
        return mapped.length ? mapped[0].id : null;
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, user, profile?.tipo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: IdosoContextType = useMemo(() => ({
    listaIdososVinculados: lista,
    idosoSelecionadoId: escolhidoOrNull(selecionado),
    setIdosoSelecionado: setSelecionado,
    loading,
    refresh,
  }), [lista, selecionado, loading, refresh]);

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
