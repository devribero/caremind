'use client';

import React from 'react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { ClientAreaHeader } from '@/components/ClientAreaHeader';
import { ClientSidebar } from '@/components/ClientSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AddRotinaForm } from '@/components/forms/AddRotinaForm';
import { Modal } from '@/components/Modal';
import RotinaCard from '@/components/RotinasCard';
import { useCrudOperations } from '@/hooks/useCrudOperations';

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

  // Funções da barra lateral (colapsar/expandir)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistentState<boolean>('ui.sidebar.collapsed', false);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

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
      <ClientAreaHeader />
      <ClientSidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />

      <div
        className={`${styles.mainContent}`}
        style={{
          marginLeft: isSidebarCollapsed ? 80 : 280,
          transition: 'margin-left 0.25s ease',
          paddingTop: 16,
          position: 'relative',
          zIndex: 2,
        }}
      >
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
              descricao: editModal.item.descricao ?? null,
              frequencia: editModal.item.frequencia ?? null,
            } as any}
          />
        )}
      </Modal>
    </main>
  );
}
