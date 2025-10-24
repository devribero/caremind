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
      create: (error) => alert(`Erro ao criar rotina: ${error}`),
      update: (error) => alert(`Erro ao atualizar rotina: ${error}`),
      delete: (error) => alert(`Erro ao excluir rotina: ${error}`),
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

  // Handlers para formulários
  const handleSaveRotina = async (
    titulo: string,
    descricao: string | null,
    frequencia: any
  ) => {
    if (isFamiliar && !targetUserId) {
      alert('Selecione um idoso no menu superior antes de adicionar rotinas.');
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

  const handlePhotoUpload = async (file: File) => {
    if (!user) {
      alert('Usuário não autenticado');
      return;
    }

    const supabase = createClient();

    const fileName = `${user.id}/${Date.now()}_${file.name}`;

    console.log('Tentando upload:', fileName);

    const { data, error } = await supabase.storage.from('receitas-medicas').upload(fileName, file);

    if (error) {
      alert(`Erro ao fazer upload: ${error.message}`);
      console.error('Upload error:', error);
      return;
    }

    console.log('Upload sucesso, obtendo URL pública');

    const { data: publicUrlData } = supabase.storage.from('receitas-medicas').getPublicUrl(fileName);
    if (!publicUrlData) {
      alert('Erro ao obter URL pública');
      return;
    }
    const imageUrl = publicUrlData.publicUrl;

    console.log('URL:', imageUrl);
    console.log('User ID:', user.id);

    const { error: insertError } = await supabase.from('ocr_gerenciamento').insert({
      user_id: user.id,
      image_url: imageUrl,
      status: 'PENDENTE',
    });

    if (insertError) {
      alert(`Erro ao salvar no banco: ${insertError.message}`);
      console.error('Insert error:', insertError);
      return;
    }

    console.log('Insert sucesso');
    alert('Foto enviada com sucesso!');
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
              onDelete={deleteItem}
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

        <section className={styles.content_info}>
          {!loading && !error && !(isFamiliar && !targetUserId) && (
            <div className={styles.actionsContainer}>
              <button className={styles.addButton} onClick={() => addModal.open()}>
                <span className={styles.addIcon}>+</span>
                Adicionar Rotina
              </button>
            </div>
          )}

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
