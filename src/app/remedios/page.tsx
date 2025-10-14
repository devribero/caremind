'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { usePersistentState } from '@/hooks/usePersistentState';

// Componentes e hooks
import { ClientAreaHeader } from '@/components/ClientAreaHeader';
import { ClientSidebar } from '@/components/ClientSidebar';
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

  // Funções da barra lateral (colapsar/expandir)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistentState<boolean>('ui.sidebar.collapsed', false);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

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

    // 🎯 CORREÇÃO CRÍTICA: Chamada do updateItem.
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
            <h1 className={styles.content_title}>Remédios</h1>
          </div>

          <section className={styles.content_info}>
            {!loading && !error && (
              <div className={styles.actionsContainer}>
                {/* 🎯 CORREÇÃO CRÍTICA: Envolver a função do modal em um callback */}
                <button className={styles.addButton} onClick={() => addModal.open()}>
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
            // CORREÇÃO: Normalizar os dados
            medicamento={{
              id: editModal.item.id,
              nome: editModal.item.nome,
              // Garantindo que dosagem seja string (ou o que o form espera)
              dosagem: editModal.item.dosagem ?? '',
              // Garantindo que quantidade seja number (ou o que o form espera)
              quantidade: editModal.item.quantidade ?? 0,
              // Frequencia pode precisar de tratamento específico, mas forçamos 'any' se a tipagem for complexa
              frequencia: editModal.item.frequencia ?? null,
            }}
          />
        )}
      </Modal>
    </main>
  );
}