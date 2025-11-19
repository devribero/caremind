'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { CompromissosService } from '@/lib/supabase/services';
import { Modal } from '@/components/features/Modal';
import { AddEditCompromissoForm, type Compromisso } from '@/components/features/modals/AddEditCompromissoModal';
import { toast } from '@/components/features/Toast';
import styles from '../rotinas/page.module.css';
import { Tables } from '@/types/supabase';

type CompItem = Tables<'compromissos'>;

export default function CompromissosPage() {
  const { user } = useAuth();
  const { profile, idosoSelecionadoId, listaIdososVinculados } = useProfile();
  const isFamiliar = profile?.tipo === 'familiar';
  const targetProfileId = isFamiliar ? idosoSelecionadoId : profile?.id;

  const [items, setItems] = useState<CompItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CompItem | null>(null);

  const selectedElderName = useMemo(() => {
    const elderList = listaIdososVinculados ?? [];
    return elderList.find((i) => i.id === idosoSelecionadoId)?.nome_completo || null;
  }, [listaIdososVinculados, idosoSelecionadoId]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!targetProfileId) {
        if (isFamiliar) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await CompromissosService.listarCompromissos(targetProfileId);
        setItems(data);
      } catch (err: any) {
        setError(err.message);
        toast.error('Falha ao carregar compromissos.');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [targetProfileId, isFamiliar]);

  const handleCreate = async (data: Omit<Compromisso, 'id' | 'created_at'>) => {
    if (!targetProfileId) {
      toast.info('Selecione um idoso no menu superior antes de adicionar compromissos.');
      return;
    }
    
    // Garantir que campos obrigatórios estejam preenchidos e limpar strings vazias
    if (!data.titulo || !data.titulo.trim()) {
      toast.error('O título é obrigatório');
      return;
    }
    
    if (!data.data_hora) {
      toast.error('A data e hora são obrigatórias');
      return;
    }
    
    const payload = {
      ...data,
      titulo: data.titulo.trim(),
      descricao: data.descricao?.trim() || null,
      local: data.local?.trim() || null,
      perfil_id: targetProfileId,
    };

    try {
      const newItem = await CompromissosService.criarCompromisso(payload);
      setItems(prev => [...prev, newItem]);
      toast.success('Compromisso criado com sucesso');
      setAddModalOpen(false);
    } catch (err: any) {
      toast.error(`Erro ao criar compromisso: ${err.message}`);
    }
  };

  const handleUpdate = async (data: Partial<Compromisso>) => {
    if (!editingItem) return;

    // Limpar strings vazias
    const updates: Partial<Compromisso> = {};
    if (data.titulo !== undefined) {
      updates.titulo = data.titulo.trim() || editingItem.titulo;
    }
    if (data.descricao !== undefined) {
      updates.descricao = data.descricao?.trim() || null;
    }
    if (data.local !== undefined) {
      updates.local = data.local?.trim() || null;
    }
    if (data.data_hora !== undefined) {
      updates.data_hora = data.data_hora;
    }
    if (data.tipo !== undefined) {
      updates.tipo = data.tipo;
    }
    if (data.lembrete_minutos !== undefined) {
      updates.lembrete_minutos = data.lembrete_minutos;
    }

    try {
      const updatedItem = await CompromissosService.atualizarCompromisso(editingItem.id, updates);
      setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
      toast.success('Compromisso atualizado com sucesso');
      setEditModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      toast.error(`Erro ao atualizar compromisso: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este compromisso?')) return;

    try {
      await CompromissosService.deletarCompromisso(id);
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Compromisso excluído com sucesso');
    } catch (err: any) {
      toast.error(`Erro ao excluir compromisso: ${err.message}`);
    }
  };
  
  const openEditModal = (item: CompItem) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const renderList = () => {
    if (isFamiliar && !targetProfileId) {
      return (
        <div className={styles.emptyState}>
          <p>Selecione um idoso no menu superior para visualizar os compromissos.</p>
        </div>
      );
    }
    if (loading) return <p className={styles.loadingText}>Carregando...</p>;
    if (error) return <p className={styles.errorText}>Erro: {error}</p>;
    if (!items?.length) {
      return (
        <div className={styles.emptyState}>
          <p>Nenhum compromisso encontrado.</p>
          <p>Clique em "Adicionar Compromisso" acima para começar.</p>
        </div>
      );
    }

    return (
      <div className={styles.gridContainer}>
        {items
          .slice()
          .sort((a, b) => (a.data_hora ? new Date(a.data_hora).getTime() : 0) - (b.data_hora ? new Date(b.data_hora).getTime() : 0))
          .map((c) => (
            <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18, color: 'black', }}>{c.titulo}</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEditModal(c)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f3f4f6', color: 'black' }}>Editar</button>
                  <button onClick={() => handleDelete(c.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c' }}>Excluir</button>
                </div>
              </div>
              <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>
                <div><strong>Tipo:</strong> {c.tipo || 'outros'}</div>
                {c.data_hora && <div><strong>Data/Hora:</strong> {new Date(c.data_hora).toLocaleString()}</div>}
                {c.local && <div><strong>Local:</strong> {c.local}</div>}
                {c.descricao && <div style={{ marginTop: 6 }}>{c.descricao}</div>}
              </div>
            </div>
          ))}
      </div>
    );
  };

  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <h1 className={styles.content_title}>{selectedElderName ? `Compromissos de ${selectedElderName}` : 'Meus Compromissos'}</h1>
        </div>

        {!loading && !error && !(isFamiliar && !targetProfileId) && (
          <div className={styles.actionsContainer}>
            <button className={styles.addButton} onClick={() => setAddModalOpen(true)}>
              <span className={styles.addIcon}>+</span>
              Adicionar Compromisso
            </button>
          </div>
        )}

        <section className={styles.content_info}>{renderList()}</section>
      </div>

      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Adicionar compromisso">
        <AddEditCompromissoForm onSave={handleCreate} onCancel={() => setAddModalOpen(false)} />
      </Modal>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar compromisso">
        {editingItem && (
          <AddEditCompromissoForm
            onSave={handleUpdate}
            onCancel={() => setEditModalOpen(false)}
            compromisso={editingItem}
          />
        )}
      </Modal>
    </main>
  );
}
