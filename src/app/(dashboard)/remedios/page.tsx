'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AddMedicamentoForm } from '@/components/forms/AddMedicamentoForm';
import { Modal } from '@/components/Modal';
import MedicamentoCard from '@/components/MedicamentoCard';
import { useCrudOperations } from '@/hooks/useCrudOperations';
import { createClient } from '@/lib/supabase/client';

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
  const [photoModal, setPhotoModal] = useState({
    isOpen: false,
    open: () => setPhotoModal(prev => ({ ...prev, isOpen: true })),
    close: () => setPhotoModal(prev => ({ ...prev, isOpen: false })),
  });

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
      status: 'pending',
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
          <h1 className={styles.content_title}>Medicamentos</h1>
        </div>

        <section className={styles.content_info}>
          {!loading && !error && (
            <div className={styles.actionsContainer}>
              <button className={styles.addButton} onClick={() => addModal.open()}>
                <span className={styles.addIcon}>+</span>
                Adicionar Medicamento
              </button>
              <button className={styles.addButton} onClick={() => photoModal.open()}>
                <span className={styles.addIcon}>+</span>
                Adicionar por Foto
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

      <Modal isOpen={photoModal.isOpen} onClose={photoModal.close} title="Adicionar por Foto">
        <div className={styles.photoModalContent}>
          <p className={styles.photoDescription}>Escolha uma opção para adicionar a foto da receita:</p>
          <label className={styles.photoOption}>
            <div className={styles.photoIcon}>📁</div>
            <span className={styles.photoOptionLabel}>Selecionar do dispositivo</span>
            <input type="file" accept="image/*" className={styles.photoInput} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoUpload(file);
            }} />
          </label>
          <label className={styles.photoOption}>
            <div className={styles.photoIcon}>📷</div>
            <span className={styles.photoOptionLabel}>Tirar foto com câmera</span>
            <input type="file" accept="image/*" capture="environment" className={styles.photoInput} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoUpload(file);
            }} />
          </label>
        </div>
      </Modal>
    </main>
  );
}