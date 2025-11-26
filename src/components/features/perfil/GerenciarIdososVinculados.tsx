"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileContext } from '@/contexts/ProfileContext';
import { listarIdososVinculados, deletarVinculo } from '@/lib/supabase/services/vinculos';
import { toast } from '@/components/features/Toast';
import EditIdosoModal from '@/components/features/modals/EditIdosoModal';
import styles from './GerenciarIdososVinculados.module.css';

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

type ViewMode = 'grid' | 'list';

function GerenciarIdososVinculadosImpl(_props: {}, ref: React.Ref<GerenciarIdososVinculadosRef>) {
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const [idosos, setIdosos] = useState<IdosoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIdoso, setEditingIdoso] = useState<IdosoItem | null>(null);
  
  // Visualização: grid ou lista (salva no localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('idososViewMode') as ViewMode;
      return saved === 'list' || saved === 'grid' ? saved : 'grid';
    }
    return 'grid';
  });

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

  // Salvar preferência de visualização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('idososViewMode', viewMode);
    }
  }, [viewMode]);

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    // Formata como (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Idosos Vinculados</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#6b7280' }}>Visualização:</span>
          <button
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? styles.viewButtonActive : styles.viewButton}
            aria-label="Visualização em grade"
            title="Visualização em grade"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="12" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="3" y="12" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="12" y="12" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? styles.viewButtonActive : styles.viewButton}
            aria-label="Visualização em lista"
            title="Visualização em lista"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="14" height="2" rx="1" fill="currentColor"/>
              <rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor"/>
              <rect x="3" y="14" width="14" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
      ) : idosos.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Nenhum idoso vinculado ainda.</div>
      ) : viewMode === 'grid' ? (
        <div className={styles.gridContainer}>
          {idosos.map((i) => (
            <div key={i.id_idoso} className={styles.card}>
              <div className={styles.cardImage}>
                <Image 
                  src={i.foto_usuario || '/icons/foto_padrao.png'} 
                  alt={i.nome || 'Idoso'} 
                  width={80} 
                  height={80} 
                  style={{ borderRadius: '50%', objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardName}>{i.nome || 'Sem nome'}</h3>
                {i.telefone && (
                  <div className={styles.cardInfo}>
                    <span className={styles.cardLabel}>Telefone:</span>
                    <span>{formatPhone(i.telefone)}</span>
                  </div>
                )}
                {i.data_nascimento && (
                  <div className={styles.cardInfo}>
                    <span className={styles.cardLabel}>Nascimento:</span>
                    <span>{formatDate(i.data_nascimento)}</span>
                  </div>
                )}
              </div>
              <div className={styles.cardActions}>
                <button
                  onClick={() => setEditingIdoso(i)}
                  className={styles.btnEdit}
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleDesvincular(i.id_idoso)} 
                  className={styles.btnDesvincular}
                >
                  Desvincular
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.listContainer}>
          {idosos.map((i) => (
            <div key={i.id_idoso} className={styles.listItem}>
              <div className={styles.listImage}>
                <Image 
                  src={i.foto_usuario || '/icons/foto_padrao.png'} 
                  alt={i.nome || 'Idoso'} 
                  width={56} 
                  height={56} 
                  style={{ borderRadius: '50%', objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </div>
              <div className={styles.listContent}>
                <h3 className={styles.listName}>{i.nome || 'Sem nome'}</h3>
                <div className={styles.listDetails}>
                  {i.telefone && (
                    <div className={styles.listDetail}>
                      <span className={styles.listLabel}>Telefone:</span>
                      <span>{formatPhone(i.telefone)}</span>
                    </div>
                  )}
                  {i.data_nascimento && (
                    <div className={styles.listDetail}>
                      <span className={styles.listLabel}>Nascimento:</span>
                      <span>{formatDate(i.data_nascimento)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.listActions}>
                <button
                  onClick={() => setEditingIdoso(i)}
                  className={styles.btnEdit}
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleDesvincular(i.id_idoso)} 
                  className={styles.btnDesvincular}
                >
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
