'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { useAuth } from '@/contexts/AuthContext';
import { useIdoso } from '@/contexts/IdosoContext';
import { FullScreenLoader } from '@/components/features/FullScreenLoader';
import { AddMedicamentoForm } from '@/components/features/forms/AddMedicamentoForm';
import { Modal } from '@/components/features/Modal';
import MedicamentoCard from '@/components/features/MedicamentoCard';
import { useCrudOperations } from '@/hooks/useCrudOperations';
import { createClient } from '@/lib/supabase/client';
import { useAuthRequest } from '@/hooks/useAuthRequest';
import { toast } from '@/components/features/Toast';

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

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const { makeRequest } = useAuthRequest();
  const [eventosDoDia, setEventosDoDia] = useState<Array<{ id: string; tipo_evento: string; evento_id: string; status: string }>>([]);
  const [marking, setMarking] = useState<Record<string, boolean>>({});

  // Usar o hook CRUD personalizado
  const {
    items: medicamentos,
    loading,
    error,
    addModal,
    editModal,
    createItem,
    updateItem,
    editItem,
    deleteItem,
    fetchItems,
    setItems,
  } = useCrudOperations<Medicamento>({
    endpoint: targetUserId ? `/api/medicamentos?idoso_id=${encodeURIComponent(targetUserId)}` : '/api/medicamentos',
    onError: {
      create: (error) => alert(`Erro ao criar medicamento: ${error}`),
      update: (error) => alert(`Erro ao atualizar medicamento: ${error}`),
      delete: (error) => alert(`Erro ao excluir medicamento: ${error}`),
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
    const onAddMedicamento = () => addModal.open();
    const onAddMedicamentoFoto = () => photoModal.open();
    window.addEventListener('caremind:add-medicamento', onAddMedicamento as EventListener);
    window.addEventListener('caremind:add-medicamento-foto', onAddMedicamentoFoto as EventListener);
    return () => {
      window.removeEventListener('caremind:add-medicamento', onAddMedicamento as EventListener);
      window.removeEventListener('caremind:add-medicamento-foto', onAddMedicamentoFoto as EventListener);
    };
  }, [addModal, photoModal]);

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
        // ignora
      }
    };
    loadAgenda();
  }, [user, isFamiliar, targetUserId, makeRequest]);

  const handleSaveMedicamento = async (
    nome: string,
    dosagem: string | null,
    frequencia: any,
    quantidade: number
  ) => {
    if (isFamiliar && !targetUserId) {
      alert('Selecione um idoso no menu superior antes de adicionar medicamentos.');
      return;
    }
    await createItem({
      nome,
      dosagem,
      frequencia,
      quantidade,
      created_at: new Date().toISOString(),
      ...(targetUserId ? { user_id: targetUserId } : {}),
    } as unknown as Omit<Medicamento, 'id'>);
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

  const hasPendingForMedicamento = (medId: string) =>
    eventosDoDia.some(e => e.tipo_evento === 'medicamento' && e.evento_id === medId && e.status === 'pendente');

  const handleMarkMedicamentoDone = async (medId: string) => {
    const ev = eventosDoDia.find(e => e.tipo_evento === 'medicamento' && e.evento_id === medId && e.status === 'pendente');
    if (!ev) return;
    setMarking(prev => ({ ...prev, [medId]: true }));
    const prevEventos = eventosDoDia;
    setEventosDoDia(prev => prev.map(e => e.id === ev.id ? { ...e, status: 'confirmado' } : e));
    try {
      await makeRequest(`/api/historico_eventos/${ev.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'confirmado' }),
      });
    } catch (err) {
      setEventosDoDia(prevEventos);
      alert(err instanceof Error ? err.message : 'Falha ao atualizar evento');
    } finally {
      setMarking(prev => ({ ...prev, [medId]: false }));
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }
    if (isFamiliar && !targetUserId) {
      toast.error('Selecione um idoso no menu superior antes de adicionar por foto.');
      return;
    }

    setPhotoError(null);
    setPhotoStatus('Enviando foto...');
    toast.info('Enviando foto...');
    setPhotoUploading(true);

    const supabase = createClient();

    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receitas-medicas')
        .upload(fileName, file);

      if (uploadError) {
        setPhotoError(`Erro ao fazer upload: ${uploadError.message}`);
        toast.error(`Erro ao fazer upload: ${uploadError.message}`);
        return;
      }

      setPhotoStatus('Gerando link público...');
      const { data: publicUrlData } = supabase.storage
        .from('receitas-medicas')
        .getPublicUrl(fileName);
      if (!publicUrlData) {
        setPhotoError('Erro ao obter URL pública');
        toast.error('Erro ao obter URL pública');
        return;
      }
      const imageUrl = publicUrlData.publicUrl;

      setPhotoStatus('Registrando processamento...');
      const { data: inserted, error: insertError } = await supabase
        .from('ocr_gerenciamento')
        .insert({
          // Quando familiar, garantir que use o id do idoso selecionado
          user_id: targetUserId || user.id,
          image_url: imageUrl,
          status: 'PENDENTE',
        })
        .select('id')
        .single();

      if (insertError) {
        setPhotoError(`Erro ao salvar no banco: ${insertError.message}`);
        toast.error(`Erro ao salvar no banco: ${insertError.message}`);
        return;
      }

      setPhotoStatus('Foto enviada! Processando receita...');
      toast.success('Foto enviada! Processando receita...');
      photoModal.close();
      setPhotoStatus(null);

      // Polling de status do OCR
      if (inserted?.id) {
        const ocrId = inserted.id as string;
        const start = Date.now();
        const timeoutMs = 10 * 60 * 1000; // 10 minutos
        const interval = 5000; // 5s
        let notifiedStatusError = false;
        const poll = async () => {
          try {
            const { data, error } = await supabase
              .from('ocr_gerenciamento')
              .select('status, error_message')
              .eq('id', ocrId)
              .single();
            if (error) {
              // Falha temporária ao consultar status: avisar uma vez e continuar tentando
              if (!notifiedStatusError) {
                toast.info('Aguardando processamento da receita...');
                notifiedStatusError = true;
              }
              if (Date.now() - start < timeoutMs) {
                setTimeout(poll, interval);
              } else {
                toast.error('Tempo esgotado aguardando processamento da receita.');
              }
              return;
            }
            const status = (data as any)?.status;
            // Sucesso: PROCESSADO ou PROCESSADO_PARCIALMENTE
            if (status === 'PROCESSADO' || status === 'PROCESSADO_PARCIALMENTE') {
              toast.success('Receita processada. Atualizando medicamentos...');
              await fetchItems();
              return; // fim do polling
            }
            // Erros: ERRO_PROCESSAMENTO (ex.: não encontrou medicamentos) ou ERRO_DATABASE
            if (status === 'ERRO_PROCESSAMENTO' || status === 'ERRO_DATABASE') {
              const errMsg = (data as any)?.error_message || 'Não foi possível encontrar medicamento na receita.';
              toast.error(`Falha no processamento: ${errMsg}`);
              return; // fim do polling
            }
            if (Date.now() - start >= timeoutMs) {
              toast.error('Tempo esgotado aguardando processamento da receita.');
              return;
            }
            setTimeout(poll, interval);
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : 'Erro inesperado no polling';
            // Erro inesperado: continuar tentando até timeout
            toast.info('Aguardando processamento da receita...');
            if (Date.now() - start < timeoutMs) {
              setTimeout(poll, interval);
            } else {
              toast.error(`Tempo esgotado: ${errMsg}`);
            }
          }
        };
        setTimeout(poll, interval);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Erro inesperado';
      setPhotoError(errMsg);
      toast.error(`Erro: ${errMsg}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Render content
  const renderContent = () => {
    if (isFamiliar && !targetUserId) {
      return (
        <div className={styles.emptyState}>
          <p>Selecione um idoso no menu superior para visualizar os medicamentos.</p>
        </div>
      );
    }
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
              hasPendingToday={hasPendingForMedicamento(medicamento.id)}
              isMarking={!!marking[medicamento.id]}
              onMarkAsDone={() => handleMarkMedicamentoDone(medicamento.id)}
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
          <h1 className={styles.content_title}>
            {selectedElderName ? `Medicamentos de ${selectedElderName}` : 'Medicamentos'}
          </h1>
        </div>

        {!loading && !error && !(isFamiliar && !targetUserId) && (
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

        <section className={styles.content_info}>
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
          {photoStatus && (
            <p className={styles.photoDescription}>{photoStatus}</p>
          )}
          {photoError && (
            <p className={styles.errorText}>Erro: {photoError}</p>
          )}
          <fieldset disabled={photoUploading} style={{ border: 'none', padding: 0, margin: 0 }}>
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
          </fieldset>
        </div>
      </Modal>
    </main>
  );
}