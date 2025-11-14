'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AddRotinaForm } from '@/components/forms/AddRotinaForm';
import { Modal } from '@/components/Modal';
import RotinaCard from '@/components/RotinasCard';
import { useCrudOperations } from '@/hooks/useCrudOperations';
import { createClient } from '@/lib/supabase/client';
import { useIdoso } from '@/contexts/IdosoContext';
import { useAuthRequest } from '@/hooks/useAuthRequest';
import { toast } from '@/components/Toast';

// Estilos
import styles from './page.module.css';

type Rotina = { 
  id: string;
  titulo: string;
  descricao?: string;
  frequencia?: any;
  created_at: string;
};

export default function Rotinas() {
  // Hooks e estados
  const { user } = useAuth();
  const router = useRouter();
  const { idosoSelecionadoId, listaIdososVinculados } = useIdoso();
  const isFamiliar = user?.user_metadata?.account_type === 'familiar';
  const targetUserId = isFamiliar ? idosoSelecionadoId : user?.id;
  const selectedElderName = useMemo(() => (
    listaIdososVinculados.find((i) => i.id === idosoSelecionadoId)?.nome || null
  ), [listaIdososVinculados, idosoSelecionadoId]);
  const [photoModal, setPhotoModal] = useState({
    isOpen: false,
    open: () => setPhotoModal(prev => ({ ...prev, isOpen: true })),
    close: () => setPhotoModal(prev => ({ ...prev, isOpen: false })),
  });

  const { makeRequest } = useAuthRequest();
  const [eventosDoDia, setEventosDoDia] = useState<Array<{ id: string; tipo_evento: string; evento_id: string; status: string }>>([]);
  const [marking, setMarking] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // Usar o hook CRUD personalizado
  const {
    items: rotinas,
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
  } = useCrudOperations<Rotina>({
    endpoint: targetUserId ? `/api/rotinas?idoso_id=${encodeURIComponent(targetUserId)}` : '/api/rotinas',
    onError: {
      create: (error) => toast.error(`Erro ao criar rotina: ${error}`),
      update: (error) => toast.error(`Erro ao atualizar rotina: ${error}`),
      delete: (error) => toast.error(`Erro ao excluir rotina: ${error}`),
    },
    onSuccess: {
      create: () => toast.success('Rotina criada com sucesso'),
      update: () => toast.success('Rotina atualizada com sucesso'),
    },
  });

  React.useEffect(() => {
    if (isFamiliar) {
      if (targetUserId) {
        fetchItems();
      } else {
        setItems([] as any);
      }
    } else {
      fetchItems();
    }
  }, [isFamiliar, targetUserId, fetchItems, setItems]);

  // Ouve botões do Header
  React.useEffect(() => {
    const onAddRotina = () => addModal.open();
    window.addEventListener('caremind:add-rotina', onAddRotina as EventListener);
    return () => {
      window.removeEventListener('caremind:add-rotina', onAddRotina as EventListener);
    };
  }, [addModal]);

  React.useEffect(() => {
    const loadAgenda = async () => {
      if (!user) return;
      if (isFamiliar && !targetUserId) return;
      const today = new Date().toISOString().slice(0, 10);
      const params = targetUserId ? `?idoso_id=${encodeURIComponent(targetUserId)}&data=${encodeURIComponent(today)}` : `?data=${encodeURIComponent(today)}`;
      try {
        const data = await makeRequest<Array<any>>(`/api/agenda${params}`, { method: 'GET' });
        setEventosDoDia((data || []).map(e => ({ id: e.id, tipo_evento: e.tipo_evento, evento_id: e.evento_id, status: e.status })));
      } catch (e) {
        // ignora falha de agenda
      }
    };
    loadAgenda();
  }, [user, isFamiliar, targetUserId, makeRequest]);

  // Handlers para formulários
  const handleSaveRotina = async (
    titulo: string,
    descricao: string | null,
    frequencia: any
  ) => {
    if (isFamiliar && !targetUserId) {
      toast.error('Selecione um idoso no menu superior antes de adicionar rotinas.');
      return;
    }
    await createItem({
      titulo,
      descricao: descricao ?? undefined,
      frequencia,
      created_at: new Date().toISOString(),
      ...(targetUserId ? { user_id: targetUserId } : {}),
    } as unknown as Omit<Rotina, 'id'>);
  };

  const handleUpdateRotina = async (
    titulo: string,
    descricao: string | null,
    frequencia: any
  ) => {
    if (!editModal.item) return;

    await updateItem(editModal.item.id, {
      titulo,
      descricao: descricao ?? undefined,
      frequencia,
    });
  };

  const hasPendingForRotina = (rotinaId: string) =>
    eventosDoDia.some(e => e.tipo_evento === 'rotina' && e.evento_id === rotinaId && e.status === 'pendente');

  const handleMarkRotinaDone = async (rotinaId: string) => {
    const ev = eventosDoDia.find(e => e.tipo_evento === 'rotina' && e.evento_id === rotinaId && e.status === 'pendente');
    if (!ev) return;
    setMarking(prev => ({ ...prev, [rotinaId]: true }));
    const prevEventos = eventosDoDia;
    setEventosDoDia(prev => prev.map(e => e.id === ev.id ? { ...e, status: 'confirmado' } : e));
    try {
      await makeRequest(`/api/historico_eventos/${ev.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'confirmado' }),
      });
    } catch (err) {
      setEventosDoDia(prevEventos);
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar evento');
    } finally {
      setMarking(prev => ({ ...prev, [rotinaId]: false }));
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    const supabase = createClient();

    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('receitas-medicas').upload(fileName, file);

    if (error) {
      toast.error(`Erro ao fazer upload: ${error.message}`);
      console.error('Upload error:', error);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('receitas-medicas').getPublicUrl(fileName);
    if (!publicUrlData) {
      toast.error('Erro ao obter URL pública');
      return;
    }
    const imageUrl = publicUrlData.publicUrl;
    const { error: insertError } = await supabase.from('ocr_gerenciamento').insert({
      user_id: targetUserId || user.id,
      image_url: imageUrl,
      status: 'PENDENTE',
    });

    if (insertError) throw insertError;
    
    toast.success('Foto enviada! Processando receita...');
    photoModal.close();
  };

  // Render content
  const renderContent = () => {
    if (isFamiliar && !targetUserId) {
      return (
        <div className={styles.emptyState}>
          <p>Selecione um idoso no menu superior para visualizar as rotinas.</p>
        </div>
      );
    }
    if (loading) {
      return <FullScreenLoader />;
    }
    if (error) {
      return <p className={styles.errorText}>Erro: {error}</p>;
    }
    if (rotinas.length > 0) {
      return (
        <div className={styles.gridContainer}>
          {rotinas.map((rotina) => (
            <RotinaCard
              key={rotina.id}
              rotina={rotina}
              onEdit={editItem}
              onDelete={(id) => {
                setDeleting(prev => ({ ...prev, [id]: true }));
                deleteItem(id).finally(() => {
                  setDeleting(prev => ({ ...prev, [id]: false }));
                });
              }}
              hasPendingToday={hasPendingForRotina(rotina.id)}
              isMarking={!!marking[rotina.id]}
              isDeleting={!!deleting[rotina.id]}
              onMarkAsDone={() => handleMarkRotinaDone(rotina.id)}
            />
          ))}
        </div>
      );
    }
    return (
      <div className={styles.emptyState}>
        <p>Nenhuma rotina encontrada.</p>
        <p>Clique em "Adicionar Rotina" acima para começar.</p>
      </div>
    );
  };

  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <h1 className={styles.content_title}>{selectedElderName ? `Rotinas de ${selectedElderName}` : 'Rotinas'}</h1>
        </div>

        {!loading && !error && !(isFamiliar && !targetUserId) && (
          <div className={styles.actionsContainer}>
            <button className={styles.addButton} onClick={() => addModal.open()}>
              <span className={styles.addIcon}>+</span>
              Adicionar Rotina
            </button>
          </div>
        )}
        <section className={styles.content_info}>
          {renderContent()}
        </section>
      </div>

      <Modal isOpen={addModal.isOpen} onClose={addModal.close} title="Adicionar rotina">
        <AddRotinaForm onSave={handleSaveRotina} onCancel={addModal.close} />
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={editModal.close} title="Editar rotina">
        {editModal.item && (
          <AddRotinaForm
            onSave={handleUpdateRotina}
            onCancel={editModal.close}
            rotina={{
              id: editModal.item.id,
              titulo: editModal.item.titulo,
              descricao: editModal.item.descricao ?? '',
            }}
          />
        )}
      </Modal>
    </main>
  );
}
