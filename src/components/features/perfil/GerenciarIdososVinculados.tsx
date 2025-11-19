"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { listarIdososVinculados, deletarVinculo } from '@/lib/supabase/services/vinculos';
import { toast } from '@/components/features/Toast';
import EditIdosoModal from '@/components/features/modals/EditIdosoModal';

interface IdosoItem {
  id_idoso: string;
  nome: string | null;
  foto_usuario: string | null;
  telefone: string | null;
  data_nascimento: string | null;
}

export type GerenciarIdososVinculadosRef = {
  refresh: () => void;
};

function GerenciarIdososVinculadosImpl(_props: {}, ref: React.Ref<GerenciarIdososVinculadosRef>) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [idosos, setIdosos] = useState<IdosoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIdoso, setEditingIdoso] = useState<IdosoItem | null>(null);

  const fetchIdosos = async () => {
    if (!user?.id || !profile?.id) {
      setIdosos([]);
      return;
    }

    setLoading(true);
    try {
      const vinculos = await listarIdososVinculados(user.id);
      const normalized: IdosoItem[] = vinculos.map((vinculo) => ({
        id_idoso: vinculo.id_idoso,
        nome: vinculo.idoso?.nome || null,
        foto_usuario: vinculo.idoso?.foto_usuario || null,
        telefone: vinculo.idoso?.telefone || null,
        data_nascimento: vinculo.idoso?.data_nascimento || null,
      }));
      setIdosos(normalized);
    } catch (err) {
      console.error('Erro ao buscar idosos vinculados:', err);
      toast.error('Erro ao carregar idosos vinculados.');
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({ refresh: fetchIdosos }), [user?.id, profile?.id]);

  useEffect(() => {
    fetchIdosos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.id]);

  const handleDesvincular = async (id_idoso: string) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado.');
      return;
    }

    const input = prompt('Para confirmar a desvinculação, digite: desvincular');
    if (input === null) return; // cancelado
    if ((input || '').trim().toLowerCase() !== 'desvincular') {
      toast.error('Confirmação incorreta. Digite exatamente: desvincular');
      return;
    }
    try {
      await deletarVinculo(id_idoso, user.id);
      setIdosos(prev => prev.filter(i => i.id_idoso !== id_idoso));
      toast.success('Idoso desvinculado com sucesso.');
    } catch (err) {
      console.error('Erro ao desvincular idoso:', err);
      toast.error('Não foi possível desvincular. Tente novamente.');
    }
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#111827' }}>Idosos Vinculados</h2>
      {loading ? (
        <div>Carregando...</div>
      ) : idosos.length === 0 ? (
        <div>Nenhum idoso vinculado ainda.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {idosos.map((i) => (
            <div key={i.id_idoso} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
              <Image src={i.foto_usuario || '/icons/foto_padrao.png'} alt={i.nome || 'Idoso'} width={56} height={56} style={{ borderRadius: '9999px', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.nome || 'Sem nome'}</div>
                <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.id_idoso}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setEditingIdoso(i)}
                  style={{ background: '#0400BA', color: 'white', padding: '8px 12px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}
                >
                  Editar
                </button>
                <button onClick={() => handleDesvincular(i.id_idoso)} style={{ background: '#ef4444', color: 'white', padding: '8px 12px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>
                  Desvincular
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <EditIdosoModal
        isOpen={!!editingIdoso}
        idosoId={editingIdoso?.id_idoso}
        initialData={
          editingIdoso
            ? {
                nome: editingIdoso.nome || '',
                telefone: editingIdoso.telefone || '',
                data_nascimento: editingIdoso.data_nascimento || '',
                foto_usuario: editingIdoso.foto_usuario || '',
              }
            : undefined
        }
        onClose={() => setEditingIdoso(null)}
        onSaved={() => {
          setEditingIdoso(null);
          fetchIdosos();
        }}
      />
    </section>
  );
}

const GerenciarIdososVinculados = forwardRef(GerenciarIdososVinculadosImpl);
export default GerenciarIdososVinculados;
