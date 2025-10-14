'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { Header } from '@/components/headers/HeaderDashboard';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AddMedicamentoForm } from '@/components/forms/AddMedicamentoForm';
import { Modal } from '@/components/Modal';
import MedicamentoCard from '@/components/MedicamentoCard';
import { useCrudOperations } from '@/hooks/useCrudOperations';

// Estilos
import styles from './page.module.css';

type Medicamento = {
  id: string;
  nome: string;
  dosagem?: string;
  frequencia?: any;
  quantidade?: number;
  created_at: string;
};

export default function Remedios() {
  // Hooks e estados
  const { user } = useAuth();
  const router = useRouter();

  // Usar o hook CRUD personalizado
  const {
    items: medicamentos,
    loading,
    error,
    addModal,
    editModal,
    createItem,
    updateItem,
    deleteItem,
    editItem,
  } = useCrudOperations<Medicamento>({
    endpoint: '/api/medicamentos',
    onError: {
      create: (error) => alert(`Erro ao criar medicamento: ${error}`),
      update: (error) => alert(`Erro ao atualizar medicamento: ${error}`),
      delete: (error) => alert(`Erro ao excluir medicamento: ${error}`),
    },
  });

  // Funções de menu
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // Handlers para formulários
  const handleSaveMedicamento = async (
    nome: string,
    dosagem: string | null,
    frequencia: any,
    quantidade: number
  ) => {
    await createItem({
      nome,
      dosagem,
      frequencia,
      quantidade,
      created_at: new Date().toISOString(),
    } as Omit<Medicamento, 'id'>);
  };

  const handleUpdateMedicamento = async (
    nome: string,
    dosagem: string | null,
    frequencia: any,
    quantidade: number
  ) => {
    if (!editModal.item) return;

    await updateItem(editModal.item.id, {
      nome,
      dosagem,
      frequencia,
      quantidade,
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
    if (medicamentos.length > 0) {
      return (
        <div className={styles.gridContainer}>
          {medicamentos.map((medicamento) => (
            <MedicamentoCard
              key={medicamento.id}
              medicamento={medicamento}
              onEdit={editItem}
              onDelete={deleteItem}
            />
          ))}
        </div>
      );
    }
    return (
      <div className={styles.emptyState}>
        <p>Nenhum medicamento encontrado.</p>
        <p>Clique em "Adicionar Medicamento" acima para começar.</p>
      </div>
    );
  };

  return (
    <main className={styles.main}>
      <Header isMenuOpen={isMenuOpen} onMenuToggle={toggleMenu} />
      <Sidebar isOpen={isMenuOpen} onClose={closeMenu} />

      <div className={`${isMenuOpen ? styles.contentPushed : ''} ${styles.mainContent}`}>
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <h1 className={styles.content_title}>Remédios</h1>
          </div>

          <section className={styles.content_info}>
            {!loading && !error && (
              <div className={styles.actionsContainer}>
                <button className={styles.addButton} onClick={addModal.open}>
                  <span className={styles.addIcon}>+</span>
                  Adicionar Medicamento
                </button>
              </div>
            )}

            {renderContent()}
          </section>
        </div>
      </div>

      <Modal isOpen={addModal.isOpen} onClose={addModal.close} title="Adicionar medicamento">
        <AddMedicamentoForm onSave={handleSaveMedicamento} onCancel={addModal.close} />
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={editModal.close} title="Editar medicamento">
        {editModal.item && (
          <AddMedicamentoForm
            onSave={handleUpdateMedicamento}
            onCancel={editModal.close}
            medicamento={{
              id: editModal.item.id,
              nome: editModal.item.nome,
              dosagem: editModal.item.dosagem ?? null,
              quantidade: editModal.item.quantidade ?? 0,
              frequencia: editModal.item.frequencia ?? null,
            } as any}
          />
        )}
      </Modal>
    </main>
  );
}
