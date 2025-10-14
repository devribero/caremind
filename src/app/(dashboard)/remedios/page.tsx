'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
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

// Assinatura de dados de atualização sem 'id' e 'created_at'
type UpdateMedicamentoData = Omit<Medicamento, 'id' | 'created_at'>;

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

    // CORREÇÃO CRÍTICA: Chamada do updateItem.
    // Presumindo que 'updateItem' espera o ID E os dados.
    // Se o hook 'useCrudOperations' estiver definido corretamente, esta chamada
    // deve estar em conformidade com 'updateItem(id, data)'.
    await updateItem(editModal.item.id, {
      nome,
      dosagem,
      frequencia,
      quantidade,
    } as UpdateMedicamentoData); // Tipagem mais clara para o payload
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
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <h1 className={styles.content_title}>Remédios</h1>
        </div>

        <section className={styles.content_info}>
          {!loading && !error && (
            <div className={styles.actionsContainer}>
              <button className={styles.addButton} onClick={() => addModal.open()}>
                <span className={styles.addIcon}>+</span>
                Adicionar Medicamento
              </button>
            </div>
          )}

          {renderContent()}
        </section>
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
              dosagem: editModal.item.dosagem ?? '',
              quantidade: editModal.item.quantidade ?? 0,
              frequencia: editModal.item.frequencia ?? null,
            }}
          />
        )}
      </Modal>
    </main>
  );
}