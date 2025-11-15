"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { useAuthRequest } from '@/hooks/useAuthRequest';
import { toast } from '@/components/features/Toast';

interface IdosoItem {
  id_idoso: string;
  nome: string | null;
  foto_usuario: string | null;
}

export type GerenciarIdososVinculadosRef = {
  refresh: () => void;
};

function GerenciarIdososVinculadosImpl(_props: {}, ref: React.Ref<GerenciarIdososVinculadosRef>) {
  const { makeRequest } = useAuthRequest();
  const [idosos, setIdosos] = useState<IdosoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIdosos = async () => {
    setLoading(true);
    try {
      const data = await makeRequest<any[]>("/api/vinculos/idosos");
      const normalized: IdosoItem[] = (Array.isArray(data) ? data : []).map((x: any) => ({
        id_idoso: x.id_idoso || x.idoso_id || x.id,
        nome: x.nome ?? x.nome_idoso ?? x.nome_completo ?? null,
        foto_usuario: x.foto_usuario ?? x.foto ?? null,
      }));
      setIdosos(normalized);
    } catch (err) {
      // falha silenciosa por enquanto
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({ refresh: fetchIdosos }), []);

  useEffect(() => {
    fetchIdosos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDesvincular = async (id_idoso: string) => {
    const input = prompt('Para confirmar a desvinculação, digite: desvincular');
    if (input === null) return; // cancelado
    if ((input || '').trim().toLowerCase() !== 'desvincular') {
      toast.error('Confirmação incorreta. Digite exatamente: desvincular');
      return;
    }
    try {
      await makeRequest(`/api/vinculos/${id_idoso}`, { method: 'DELETE' });
      setIdosos(prev => prev.filter(i => i.id_idoso !== id_idoso));
      toast.success('Idoso desvinculado com sucesso.');
    } catch (err) {
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
              <Image src={i.foto_usuario || '/foto_padrao.png'} alt={i.nome || 'Idoso'} width={44} height={44} style={{ borderRadius: '9999px', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.nome || 'Sem nome'}</div>
                <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.id_idoso}</div>
              </div>
              <button onClick={() => handleDesvincular(i.id_idoso)} style={{ background: '#ef4444', color: 'white', padding: '8px 12px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>
                Desvincular
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const GerenciarIdososVinculados = forwardRef(GerenciarIdososVinculadosImpl);
export default GerenciarIdososVinculados;
