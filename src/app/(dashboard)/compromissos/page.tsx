'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIdoso } from '@/contexts/IdosoContext';
import { useCrudOperations } from '@/hooks/useCrudOperations';
import { Modal } from '@/components/Modal';
import { AddEditCompromissoForm, type Compromisso } from '@/components/modals/AddEditCompromissoModal';
import { toast } from '@/components/Toast';
import styles from '../rotinas/page.module.css';

export default function CompromissosPage() {
  const { user } = useAuth();
  const { idosoSelecionadoId, listaIdososVinculados } = useIdoso();
  const isFamiliar = user?.user_metadata?.account_type === 'familiar';
  const targetUserId = isFamiliar ? idosoSelecionadoId : user?.id;

  const selectedElderName = useMemo(() => (
    listaIdososVinculados.find((i) => i.id === idosoSelecionadoId)?.nome || null
  ), [listaIdososVinculados, idosoSelecionadoId]);

  type CompItem = Required<Compromisso> & { id: string };

  const endpoint = targetUserId ? `/api/compromissos?user_id=${encodeURIComponent(targetUserId)}` : '/api/compromissos';

  const onSuccess = React.useMemo(() => ({
    create: () => toast.success('Compromisso criado com sucesso'),
    update: () => toast.success('Compromisso atualizado com sucesso'),
    delete: () => toast.success('Compromisso excluído com sucesso'),
  }), []);

  const onError = React.useMemo(() => ({
    read: (m: string) => toast.error(m),
    create: (m: string) => toast.error(m),
    update: (m: string) => toast.error(m),
    delete: (m: string) => toast.error(m),
  }), []);

  const crudConfig = React.useMemo(() => ({
    endpoint,
    onSuccess,
    onError,
  }), [endpoint, onSuccess, onError]);

  const {
    items,
    loading,
    error,
    addModal,
    editModal,
    createItem,
    updateItem,
    deleteItem,
    editItem,
    fetchItems,
    setItems,
  } = useCrudOperations<CompItem>(crudConfig);

  React.useEffect(() => {
    // Evita chamadas desnecessárias em loop: apenas limpa a lista se familiar sem idoso selecionado.
    if (isFamiliar && !targetUserId) {
      setItems([] as any);
    }
    // Quando targetUserId existir, o hook interno chamará fetch ao mudar o endpoint.
  }, [isFamiliar, targetUserId, setItems]);

  const handleCreate = async (data: Compromisso) => {
    if (isFamiliar && !targetUserId) {
      toast.info('Selecione um idoso no menu superior antes de adicionar compromissos.');
      return;
    }
    const payload: any = {
      ...data,
      ...(targetUserId ? { user_id: targetUserId } : {}),
      // normalizar datetime-local para ISO se vier em formato local
    };
    if (payload.data_hora && !/Z$/.test(payload.data_hora)) {
      const asDate = new Date(payload.data_hora);
      if (!isNaN(asDate.getTime())) payload.data_hora = asDate.toISOString();
    }
    await createItem(payload as any);
  };

  const handleUpdate = async (data: Compromisso) => {
    if (!editModal.item) return;
    const payload: any = { ...data };
    if (payload.data_hora && !/Z$/.test(payload.data_hora)) {
      const asDate = new Date(payload.data_hora);
      if (!isNaN(asDate.getTime())) payload.data_hora = asDate.toISOString();
    }
    await updateItem(editModal.item.id, payload);
  };

  const renderList = () => {
    if (isFamiliar && !targetUserId) {
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
                  <button onClick={() => editItem(c)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f3f4f6', color: 'black' }}>Editar</button>
                  <button onClick={() => deleteItem(c.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c' }}>Excluir</button>
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
          <h1 className={styles.content_title}>{selectedElderName ? `Compromissos de ${selectedElderName}` : 'Compromissos'}</h1>
        </div>

        {!loading && !error && !(isFamiliar && !targetUserId) && (
          <div className={styles.actionsContainer}>
            <button className={styles.addButton} onClick={() => addModal.open()}>
              <span className={styles.addIcon}>+</span>
              Adicionar Compromisso
            </button>
          </div>
        )}

        <section className={styles.content_info}>{renderList()}</section>
      </div>

      <Modal isOpen={addModal.isOpen} onClose={addModal.close} title="Adicionar compromisso">
        <AddEditCompromissoForm onSave={handleCreate} onCancel={addModal.close} />
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={editModal.close} title="Editar compromisso">
        {editModal.item && (
          <AddEditCompromissoForm
            onSave={handleUpdate}
            onCancel={editModal.close}
            compromisso={{
              id: editModal.item.id,
              titulo: editModal.item.titulo,
              descricao: editModal.item.descricao ?? '',
              data_hora: editModal.item.data_hora ?? '',
              local: editModal.item.local ?? '',
              tipo: (editModal.item.tipo as any) || 'consulta',
              lembrete_minutos: editModal.item.lembrete_minutos ?? 60,
            }}
          />
        )}
      </Modal>
    </main>
  );
}
