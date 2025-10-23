"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { useAuthRequest } from '@/hooks/useAuthRequest';

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
      const data = await makeRequest<IdosoItem[]>("/api/vinculos/idosos");
      setIdosos(data || []);
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
    const ok = confirm('Tem certeza que deseja desvincular este idoso?');
    if (!ok) return;
    try {
      await makeRequest(`/api/vinculos/${id_idoso}`, { method: 'DELETE' });
      setIdosos(prev => prev.filter(i => i.id_idoso !== id_idoso));
    } catch (err) {
      // opcional: mostrar toast de erro
    }
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Idosos Vinculados</h2>
      {loading ? (
        <div>Carregando...</div>
      ) : idosos.length === 0 ? (
        <div>Nenhum idoso vinculado ainda.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {idosos.map((i) => (
            <div key={i.id_idoso} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <Image src={i.foto_usuario || '/foto_padrao.png'} alt={i.nome || 'Idoso'} width={44} height={44} style={{ borderRadius: '9999px', objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{i.nome || 'Sem nome'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{i.id_idoso}</div>
              </div>
              <button onClick={() => handleDesvincular(i.id_idoso)} style={{ background: '#ef4444', color: 'white', padding: '8px 10px', borderRadius: 8, fontWeight: 600 }}>
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
