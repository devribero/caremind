'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Importação dinâmica do componente Camera para evitar problemas de SSR
const Camera = dynamic(() => import('@/components/Camera'), { ssr: false });

// Componentes e hooks
import { useAuth } from '@/contexts/AuthContext';
import { useIdoso } from '@/contexts/IdosoContext';
import { useProfile } from '@/hooks/useProfile';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AddMedicamentoForm } from '@/components/forms/AddMedicamentoForm';
import { Modal } from '@/components/Modal';
import MedicamentoCard from '@/components/MedicamentoCard';
import { toast } from '@/components/Toast';

// Serviços
import { MedicamentosService } from '@/lib/supabase/services/medicamentos';
import { createClient } from '@/lib/supabase/client';
import type { Medicamento as SupabaseMedicamento, Perfil } from '@/types/supabase';
import type { Medicamento as CardMedicamento } from '@/lib/utils/medicamento';

// Tipo compatível com o MedicamentoCard
type LocalMedicamento = Omit<SupabaseMedicamento, 'frequencia' | 'id'> & {
  id: string;
  frequencia?: any;
};

// Estilos
import styles from './page.module.css';

type UpdateMedicamentoData = Omit<LocalMedicamento, 'id' | 'created_at' | 'user_id'>;

// Tipos para o estado do modal de foto
type PhotoModalState = {
  isOpen: boolean;
  status?: string | null;
  error?: string | null;
};

export default function Remedios() {
  // Hooks e estados
  const { user } = useAuth();
  const router = useRouter();
  const { idosoSelecionadoId, listaIdososVinculados } = useIdoso();
  
  // Obter perfil do usuário
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  
  const isFamiliar = profile?.tipo === 'familiar';
  const supabase = createClient();
  
  // ID do usuário alvo (próprio usuário ou idoso selecionado)
  const targetUserId = isFamiliar && idosoSelecionadoId ? idosoSelecionadoId : user?.id;
  const selectedElder = listaIdososVinculados.find(idoso => idoso.id === idosoSelecionadoId);
  const selectedElderName = selectedElder?.nome;
  
  // Estados de UI
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentMedicamento, setCurrentMedicamento] = useState<SupabaseMedicamento | null>(null);
  
  // Estados de dados
  const [medicamentos, setMedicamentos] = useState<SupabaseMedicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de upload de foto e câmera
  const [photoUploading, setPhotoUploading] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [photoModal, setPhotoModal] = useState<PhotoModalState>({
    isOpen: false,
    status: null,
    error: null
  });
  const [marking, setMarking] = useState<Record<string, boolean>>({});

  // Funções para controle dos modais
  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => setIsAddModalOpen(false);
  const openEditModal = (item: SupabaseMedicamento) => {
    setCurrentMedicamento(item);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentMedicamento(null);
  };

  // Carregar medicamentos
  const fetchMedicamentos = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await MedicamentosService.listarMedicamentos(targetUserId);
      setMedicamentos(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar medicamentos:', err);
      setError('Erro ao carregar medicamentos. Tente novamente mais tarde.');
      toast.error('Erro ao carregar medicamentos');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);
  
  // Efeito para carregar os medicamentos quando o targetUserId mudar
  useEffect(() => {
    if (targetUserId) {
      fetchMedicamentos();
    }
  }, [fetchMedicamentos, targetUserId]);

  // Criar um novo medicamento
  const handleCreateMedicamento = async (medicamentoData: any) => {
    if (!targetUserId) {
      toast.error('Usuário não identificado');
      return;
    }
    
    try {
      const novoMedicamento = await MedicamentosService.criarMedicamento({
        ...medicamentoData,
        user_id: targetUserId
      } as SupabaseMedicamento);
      
      setMedicamentos(prev => [novoMedicamento, ...prev]);
      closeAddModal();
      toast.success('Medicamento adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar medicamento:', error);
      toast.error('Erro ao adicionar medicamento. Tente novamente.');
    }
  };

  // Atualizar um medicamento existente
  const handleUpdateMedicamento = async (id: string, medicamentoData: any) => {
    try {
      const medicamentoAtualizado = await MedicamentosService.atualizarMedicamento(Number(id), medicamentoData);
      
      setMedicamentos(prev => 
        prev.map(med => 
          med.id === Number(id) ? { ...med, ...medicamentoAtualizado } : med
        )
      );
      
      closeEditModal();
      toast.success('Medicamento atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar medicamento:', error);
      toast.error('Erro ao atualizar medicamento. Tente novamente.');
    }
  };

  // Excluir um medicamento
  const handleDeleteMedicamento = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este medicamento?')) return;
    
    try {
      await MedicamentosService.excluirMedicamento(Number(id));
      setMedicamentos(prev => prev.filter(med => med.id !== Number(id)));
      toast.success('Medicamento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir medicamento:', error);
      toast.error('Erro ao excluir medicamento. Tente novamente.');
    }
  };
  
  // Manipulador de envio do formulário
  const handleSubmit = (data: any) => {
    if (currentMedicamento) {
      handleUpdateMedicamento(currentMedicamento.id.toString(), data);
    } else {
      handleCreateMedicamento(data);
    }
  };

  // Marcar como concluído
  const handleMarkAsDone = async (id: string | number) => {
    const idStr = typeof id === 'number' ? id.toString() : id;
    const idNum = typeof id === 'string' ? Number(id) : id;
    
    try {
      setMarking(prev => ({ ...prev, [idStr]: true }));
      
      // Atualiza o medicamento como concluído
      const medicamentoAtualizado = await MedicamentosService.marcarComoConcluido(idNum);
      
      // Atualiza o estado local
      setMedicamentos(prev => 
        prev.map(med => 
          med.id === idNum ? { ...med, ...medicamentoAtualizado, concluido: true } : med
        )
      );
      
      toast.success('Medicamento marcado como tomado!');
    } catch (error) {
      console.error('Erro ao marcar medicamento:', error);
      toast.error('Erro ao marcar medicamento como tomado');
    } finally {
      setMarking(prev => ({ ...prev, [idStr]: false }));
    }
  };
  
  // Função para criar um manipulador de marcação de conclusão
  const createMarkAsDoneHandler = (id: number) => async () => {
    await handleMarkAsDone(id);
  };

  // Upload de foto da receita
  const handlePhotoUpload = async (file: File) => {
    if (!file || !user) return;

    setPhotoUploading(true);
    setPhotoModal(prev => ({ ...prev, error: null, status: 'Enviando imagem...' }));

    try {
      // Upload do arquivo para o storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `receitas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receitas')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: publicUrlData } = await supabase.storage
        .from('receitas')
        .getPublicUrl(filePath);

      setPhotoModal(prev => ({ ...prev, status: 'Processando receita...' }));

      // Chamar a função de processamento
      const { data, error: processError } = await supabase.functions.invoke('processar-receita', {
        body: {
          image_url: publicUrlData.publicUrl,
          user_id: user.id
        }
      });

      if (processError) throw processError;

      // Verificar se a função retornou um ID de processamento
      const processId = data.process_id;
      if (!processId) {
        throw new Error('ID de processamento não retornado');
      }

      // Iniciar polling para verificar o status
      const start = Date.now();
      const timeoutMs = 30000; // 30 segundos
      const interval = 2000; // 2 segundos

      const poll = async () => {
        try {
          const { data: statusData, error: statusError } = await supabase
            .from('processamento_receitas')
            .select('*')
            .eq('id', processId)
            .single();

          if (statusError) throw statusError;

          const { status, data: resultData } = statusData;

          // Sucesso: atualizar a lista de medicamentos
          if (status === 'PROCESSADO' || status === 'PROCESSADO_PARCIALMENTE') {
            setPhotoModal(prev => ({ ...prev, status: 'Receita processada com sucesso!' }));
            await fetchMedicamentos();
            setTimeout(() => {
              setPhotoModal(prev => ({ ...prev, isOpen: false, status: null }));
            }, 2000);
            return;
          }

          // Erro: exibir mensagem
          if (status === 'ERRO_PROCESSAMENTO' || status === 'ERRO_DATABASE') {
            throw new Error(resultData?.error || 'Erro ao processar a receita');
          }

          // Timeout
          if (Date.now() - start > timeoutMs) {
            throw new Error('Tempo excedido ao processar a receita');
          }

          // Continuar polling
          setTimeout(poll, interval);
        } catch (e) {
          throw e;
        }
      };

      await poll();

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Erro inesperado';
      setPhotoModal(prev => ({ ...prev, error: errMsg }));
      toast.error(`Erro: ${errMsg}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Manipulador para imagem capturada da câmera
  const handleImageCaptured = async (imageData: string) => {
    try {
      // Converter a imagem base64 para um arquivo
      const response = await fetch(imageData);
      const blob = await response.blob();
      const file = new File([blob], 'foto-receita.jpg', { type: 'image/jpeg' });
      
      // Usar o mesmo fluxo de upload de foto existente
      await handlePhotoUpload(file);
    } catch (error) {
      console.error('Erro ao processar imagem da câmera:', error);
      toast.error('Erro ao processar a imagem capturada');
    }
  };

  // Ouve botões do Header
  useEffect(() => {
    const onAddMedicamento = () => openAddModal();
    const onAddMedicamentoFoto = () => setCameraModalOpen(true);
    
    window.addEventListener('caremind:add-medicamento', onAddMedicamento as EventListener);
    window.addEventListener('caremind:add-medicamento-foto', onAddMedicamentoFoto as EventListener);
    
    return () => {
      window.removeEventListener('caremind:add-medicamento', onAddMedicamento as EventListener);
      window.removeEventListener('caremind:add-medicamento-foto', onAddMedicamentoFoto as EventListener);
    };
  }, []);

  // Converte o tipo do Supabase para o tipo esperado pelo Card
  const toCardMedicamento = (m: SupabaseMedicamento): any => {
    // Cria um objeto com as propriedades necessárias para o Card
    return {
      id: m.id.toString(),
      nome: m.nome || '',
      data_agendada: m.data_agendada || null,
      frequencia: m.frequencia || undefined,
      ultimaAtualizacao: (m as any).updated_at || null,
      dosagem: m.dosagem || undefined,
      quantidade: m.quantidade || 0,
      concluido: m.concluido || false,
      created_at: m.created_at
    };
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
    
    if (loading || profileLoading) {
      return <FullScreenLoader />;
    }
    
    if (error) {
      return (
        <div className={styles.error}>
          <p>Erro ao carregar medicamentos. Tente novamente mais tarde.</p>
        </div>
      );
    }
    
    if (medicamentos.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>Nenhum medicamento encontrado.</p>
        </div>
      );
    }
    
    return (
      <div className={styles.gridContainer}>
        {medicamentos.map((medicamento) => {
          const cardMedicamento = toCardMedicamento(medicamento);
          return (
            <MedicamentoCard
              key={cardMedicamento.id}
              medicamento={cardMedicamento}
              onEdit={() => {
                setCurrentMedicamento(medicamento);
                setIsEditModalOpen(true);
              }}
              onDelete={() => handleDeleteMedicamento(medicamento.id.toString())}
              hasPendingToday={false}
              isMarking={!!marking[medicamento.id.toString()]}
              onMarkAsDone={createMarkAsDoneHandler(medicamento.id)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Medicamentos{selectedElderName ? ` - ${selectedElderName}` : ''}</h1>
        {( !isFamiliar || (isFamiliar && !!targetUserId) ) && (
          <div className={styles.actions}>
            <button 
              className={styles.addButton}
              onClick={() => setIsAddModalOpen(true)}
            >
              Adicionar Medicamento
            </button>
            <button 
              className={`${styles.addButton} ${styles.photoButton}`}
              onClick={() => setCameraModalOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              Tirar Foto
            </button>
          </div>
        )}
      </div>
      {renderContent()}

      {/* Modal da Câmera */}
      <Modal 
        isOpen={cameraModalOpen} 
        onClose={() => setCameraModalOpen(false)}
        title="Tirar Foto da Receita"
      >
        <div className={styles.cameraModalContent}>
          <Camera 
            onCapture={handleImageCaptured}
            onClose={() => setCameraModalOpen(false)}
          />
        </div>
      </Modal>

      {/* Modal de Confirmação de Upload */}
      <Modal
        isOpen={photoModal.isOpen}
        onClose={() => setPhotoModal(prev => ({ ...prev, isOpen: false }))}
        title={photoModal.status || 'Processando...'}
      >
        <div className={styles.photoModalContent}>
          {photoModal.error ? (
            <div className={styles.errorMessage}>
              <p>{photoModal.error}</p>
              <button 
                className={styles.retryButton}
                onClick={() => setPhotoModal(prev => ({ ...prev, error: null, isOpen: false }))}
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <div className={styles.loadingIndicator}>
              <div className={styles.spinner}></div>
              <p>{photoModal.status || 'Processando...'}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}