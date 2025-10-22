'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AddRotinaForm } from '@/components/forms/AddRotinaForm';
import { Modal } from '@/components/Modal';
import RotinaCard from '@/components/RotinasCard';
import { useCrudOperations } from '@/hooks/useCrudOperations';
import { createClient } from '@/lib/supabase/client';

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
  } = useCrudOperations<Rotina>({
    endpoint: '/api/rotinas',
    onError: {
      create: (error) => alert(`Erro ao criar rotina: ${error}`),
      update: (error) => alert(`Erro ao atualizar rotina: ${error}`),
      delete: (error) => alert(`Erro ao excluir rotina: ${error}`),
    },
  });

  // Handlers para formulários
  const handleSaveRotina = async (
    titulo: string,
    descricao: string | null,
    frequencia: any
  ) => {
    await createItem({
      titulo,
      descricao: descricao ?? undefined,
      frequencia,
      created_at: new Date().toISOString(),
    } as Omit<Rotina, 'id'>);
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
          <h1 className={styles.content_title}>Rotinas</h1>
        </div>

        <section className={styles.content_info}>
          {!loading && !error && (
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
