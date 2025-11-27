'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { useAuth } from '@/contexts/AuthContext';
import { useIdoso } from '@/contexts/IdosoContext';
import { useProfileContext } from '@/contexts/ProfileContext';
import { FullScreenLoader } from '@/components/features/FullScreenLoader';
import { AddMedicamentoForm } from '@/components/features/forms/AddMedicamentoForm';
import { Modal } from '@/components/features/Modal';
import MedicamentoCard from '@/components/features/MedicamentoCard';
import { ValidarOcrMedicamentos } from '@/components/features/ValidarOcrMedicamentos';
import { OcrProcessingOverlay } from '@/components/features/OcrProcessingOverlay';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/features/Toast';
import { MedicamentosService } from '@/lib/supabase/services';
import { listarEventosDoDia, atualizarStatusEvento, criarOuAtualizarEvento } from '@/lib/supabase/services/historicoEventos';

// Estilos
import styles from './page.module.css';

type Medicamento = {
  id: number;
  nome: string | null;
  dosagem?: string | null;
  frequencia?: any;
  quantidade?: number | null;
  created_at: string;
  user_id?: string | null;
};

// Assinatura de dados de atualização sem 'id' e 'created_at'
type UpdateMedicamentoData = Omit<Medicamento, 'id' | 'created_at'>;

export default function Remedios() {
  // Hooks e estados
  const { user } = useAuth();
  const router = useRouter();
  const { idosoSelecionadoId, listaIdososVinculados } = useIdoso();
  const { profile } = useProfileContext();
  const isFamiliar = user?.user_metadata?.account_type === 'familiar';
  // idosoSelecionadoId é o id do perfil, que agora é o mesmo que o user_id após nossa correção
  // Como o id do perfil agora é igual ao user_id, podemos usar diretamente
  const targetUserId = isFamiliar ? idosoSelecionadoId : user?.id;
  const targetProfileId = isFamiliar ? idosoSelecionadoId : profile?.id;
  const selectedElderName = useMemo(() => (
    listaIdososVinculados.find((i) => i.id === idosoSelecionadoId)?.nome || null
  ), [listaIdososVinculados, idosoSelecionadoId]);

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMedicamento, setEditingMedicamento] = useState<Medicamento | null>(null);

  const [photoModal, setPhotoModal] = useState({
    isOpen: false,
    open: () => setPhotoModal(prev => ({ ...prev, isOpen: true })),
    close: () => setPhotoModal(prev => ({ ...prev, isOpen: false })),
  });

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Estado do overlay de processamento OCR
  const [ocrOverlay, setOcrOverlay] = useState<{
    isVisible: boolean;
    status: 'uploading' | 'processing' | 'analyzing' | 'validating' | 'success' | 'error';
    errorMessage?: string;
  }>({
    isVisible: false,
    status: 'uploading',
  });

  const [validacaoModal, setValidacaoModal] = useState<{
    isOpen: boolean;
    ocrId: number | null;
    imageUrl: string | null;
    medicamentos: any[];
  }>({
    isOpen: false,
    ocrId: null,
    imageUrl: null,
    medicamentos: [],
  });

  const [eventosDoDia, setEventosDoDia] = useState<Array<{ id: number; tipo_evento: string; evento_id: number; status: string }>>([]);
  const [marking, setMarking] = useState<Record<number, boolean>>({});

  // Carregar medicamentos
  const fetchMedicamentos = React.useCallback(async () => {
    if (!targetUserId) {
      if (isFamiliar) {
        setMedicamentos([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await MedicamentosService.listarMedicamentos(targetUserId);
      setMedicamentos(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar medicamentos';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isFamiliar]);

  React.useEffect(() => {
    fetchMedicamentos();
  }, [fetchMedicamentos]);

  // Ouve botões do Header
  React.useEffect(() => {
    const onAddMedicamento = () => setAddModalOpen(true);
    const onAddMedicamentoFoto = () => photoModal.open();
    window.addEventListener('caremind:add-medicamento', onAddMedicamento as EventListener);
    window.addEventListener('caremind:add-medicamento-foto', onAddMedicamentoFoto as EventListener);
    return () => {
      window.removeEventListener('caremind:add-medicamento', onAddMedicamento as EventListener);
      window.removeEventListener('caremind:add-medicamento-foto', onAddMedicamentoFoto as EventListener);
    };
  }, [photoModal]);

  // Carregar eventos do dia
  React.useEffect(() => {
    const loadAgenda = async () => {
      if (!targetProfileId) return;
      if (isFamiliar && !targetProfileId) return;

      try {
        const hoje = new Date();
        const eventos = await listarEventosDoDia(targetProfileId, hoje);
        setEventosDoDia(
          eventos.map(e => ({
            id: e.id,
            tipo_evento: e.tipo_evento,
            evento_id: e.evento_id,
            status: e.status
          }))
        );
      } catch (e) {
        // ignora erros silenciosamente
        console.error('Erro ao carregar agenda:', e);
      }
    };
    loadAgenda();
  }, [targetProfileId, isFamiliar]);

  const handleSaveMedicamento = async (
    nome: string,
    dosagem: string | null,
    frequencia: any,
    quantidade: number
  ) => {
    if (isFamiliar && !targetUserId) {
      toast.error('Selecione um idoso no menu superior antes de adicionar medicamentos.');
      return;
    }
    if (!targetUserId) {
      toast.error('Usuário não identificado.');
      return;
    }

    try {
      // Garantir que frequencia seja um objeto válido
      // Criar um novo objeto limpo sem propriedades undefined
      let frequenciaLimpa: any = null;
      if (frequencia) {
        frequenciaLimpa = {};
        if (frequencia.tipo) frequenciaLimpa.tipo = frequencia.tipo;
        if ('horarios' in frequencia && Array.isArray(frequencia.horarios)) {
          frequenciaLimpa.horarios = frequencia.horarios;
        }
        if ('intervalo_horas' in frequencia && frequencia.intervalo_horas !== undefined) {
          frequenciaLimpa.intervalo_horas = frequencia.intervalo_horas;
        }
        if ('inicio' in frequencia && frequencia.inicio) {
          frequenciaLimpa.inicio = frequencia.inicio;
        }
        if ('intervalo_dias' in frequencia && frequencia.intervalo_dias !== undefined) {
          frequenciaLimpa.intervalo_dias = frequencia.intervalo_dias;
        }
        if ('horario' in frequencia && frequencia.horario) {
          frequenciaLimpa.horario = frequencia.horario;
        }
        if ('dias_da_semana' in frequencia && Array.isArray(frequencia.dias_da_semana)) {
          frequenciaLimpa.dias_da_semana = frequencia.dias_da_semana;
        }
      }

      // Garantir que strings vazias sejam null
      const novoMedicamento = await MedicamentosService.criarMedicamento({
        nome: nome?.trim() || null,
        dosagem: dosagem?.trim() || null,
        frequencia: frequenciaLimpa,
        quantidade: quantidade || null,
        user_id: targetUserId, // Para compatibilidade com o serviço
        perfil_id: targetProfileId || undefined,
      });
      setMedicamentos(prev => [novoMedicamento, ...prev]);
      toast.success('Medicamento criado com sucesso');
      setAddModalOpen(false);
      await fetchMedicamentos(); // Recarrega para garantir sincronização
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar medicamento';
      
      // Verificar se é erro específico de ambiguidade
      if (errorMessage.includes('data_prevista') && errorMessage.includes('ambiguous')) {
        const userFriendlyMessage = 'Ocorreu um erro ao criar medicamento com múltiplos horários. Isso é um problema de configuração do banco de dados que já foi identificado. Por favor:\n\n1. Tente novamente com um único horário por enquanto\n2. Se precisar usar múltiplos horários, contate o suporte técnico\n3. O problema será corrigido em breve em uma atualização';
        
        toast.error('Erro ao criar medicamento com múltiplos horários');
        alert(userFriendlyMessage);
      } else {
        toast.error(errorMessage);
        alert(`Erro ao criar medicamento: ${errorMessage}`);
      }
    }
  };

  const handleUpdateMedicamento = async (
    nome: string,
    dosagem: string | null,
    frequencia: any,
    quantidade: number
  ) => {
    if (!editingMedicamento) return;

    try {
      // Garantir que frequencia seja um objeto válido
      // Criar um novo objeto limpo sem propriedades undefined
      let frequenciaLimpa: any = null;
      if (frequencia) {
        frequenciaLimpa = {};
        if (frequencia.tipo) frequenciaLimpa.tipo = frequencia.tipo;
        if ('horarios' in frequencia && Array.isArray(frequencia.horarios)) {
          frequenciaLimpa.horarios = frequencia.horarios;
        }
        if ('intervalo_horas' in frequencia && frequencia.intervalo_horas !== undefined) {
          frequenciaLimpa.intervalo_horas = frequencia.intervalo_horas;
        }
        if ('inicio' in frequencia && frequencia.inicio) {
          frequenciaLimpa.inicio = frequencia.inicio;
        }
        if ('intervalo_dias' in frequencia && frequencia.intervalo_dias !== undefined) {
          frequenciaLimpa.intervalo_dias = frequencia.intervalo_dias;
        }
        if ('horario' in frequencia && frequencia.horario) {
          frequenciaLimpa.horario = frequencia.horario;
        }
        if ('dias_da_semana' in frequencia && Array.isArray(frequencia.dias_da_semana)) {
          frequenciaLimpa.dias_da_semana = frequencia.dias_da_semana;
        }
      }

      // Garantir que strings vazias sejam null
      const medicamentoAtualizado = await MedicamentosService.atualizarMedicamento(
        editingMedicamento.id,
        {
          nome: nome?.trim() || null,
          dosagem: dosagem?.trim() || null,
          frequencia: frequenciaLimpa,
          quantidade: quantidade || null,
        }
      );
      setMedicamentos(prev => prev.map(m => m.id === editingMedicamento.id ? medicamentoAtualizado : m));
      toast.success('Medicamento atualizado com sucesso');
      setEditModalOpen(false);
      setEditingMedicamento(null);
      await fetchMedicamentos(); // Recarrega para garantir sincronização
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar medicamento';
      toast.error(errorMessage);
      alert(`Erro ao atualizar medicamento: ${errorMessage}`);
    }
  };

  const handleDeleteMedicamento = async (id: number) => {
    const confirmed = await toast.confirm('Tem certeza que deseja excluir este medicamento?');
    if (!confirmed) return;

    try {
      await MedicamentosService.deletarMedicamento(id);
      setMedicamentos(prev => prev.filter(m => m.id !== id));
      toast.success('Medicamento excluído com sucesso');
      await fetchMedicamentos(); // Recarrega para garantir sincronização
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir medicamento';
      toast.error(errorMessage);
    }
  };

  const handleEditMedicamento = (medicamento: Medicamento) => {
    setEditingMedicamento(medicamento);
    setEditModalOpen(true);
  };

  // Memoiza o objeto medicamento para o formulário
  const medicamentoFormData = useMemo(() => {
    if (!editingMedicamento) return undefined;
    return {
      id: String(editingMedicamento.id),
      nome: editingMedicamento.nome || '',
      dosagem: editingMedicamento.dosagem || null,
      quantidade: editingMedicamento.quantidade || 0,
      frequencia: editingMedicamento.frequencia || null,
    };
  }, [editingMedicamento]);

  const hasPendingForMedicamento = (medId: number) =>
    eventosDoDia.some(e => e.tipo_evento === 'medicamento' && e.evento_id === medId && e.status === 'pendente');

  const handleMarkMedicamentoDone = async (medId: number) => {
    if (!targetProfileId) return;
    
    const ev = eventosDoDia.find(e => e.tipo_evento === 'medicamento' && e.evento_id === medId && e.status === 'pendente');
    
    setMarking(prev => ({ ...prev, [medId]: true }));
    const prevEventos = eventosDoDia;
    
    // Atualização otimista
    setEventosDoDia(prev => {
      if (ev) {
        return prev.map(e => e.id === ev.id ? { ...e, status: 'confirmado' } : e);
      }
      return prev;
    });
    
    try {
      if (!ev) {
        // Se não existe evento, cria um novo usando a função de criar/atualizar
        await criarOuAtualizarEvento(targetProfileId, 'medicamento', medId, 'confirmado');
      } else {
        // Atualiza o evento existente
        await atualizarStatusEvento(ev.id, 'confirmado');
      }
      
      // Recarrega os medicamentos para atualizar a quantidade
      await fetchMedicamentos();
      
      // Recarrega eventos do dia para sincronizar
      if (targetProfileId) {
        const hoje = new Date();
        const eventos = await listarEventosDoDia(targetProfileId, hoje);
        setEventosDoDia(
          eventos.map(e => ({
            id: e.id,
            tipo_evento: e.tipo_evento,
            evento_id: e.evento_id,
            status: e.status
          }))
        );
      }
      
      toast.success('Medicamento marcado como tomado');
    } catch (err) {
      setEventosDoDia(prevEventos);
      const errorMessage = err instanceof Error ? err.message : 'Falha ao atualizar evento';
      toast.error(errorMessage);
      console.error('Erro ao marcar medicamento como tomado:', err);
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

    // Fechar modal de foto e mostrar overlay
    photoModal.close();
    setOcrOverlay({ isVisible: true, status: 'uploading' });
    setPhotoError(null);
    setPhotoUploading(true);

    const supabase = createClient();

    try {
      // Validar se o perfil existe antes de criar o job
      const userIdToUse = targetUserId || user.id;
      const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('id')
        .eq('user_id', userIdToUse)
        .maybeSingle();

      if (perfilError || !perfil) {
        setOcrOverlay({ isVisible: true, status: 'error', errorMessage: 'Perfil não encontrado. Verifique se o usuário possui um perfil cadastrado.' });
        setPhotoUploading(false);
        return;
      }

      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receitas-medicas')
        .upload(fileName, file);

      if (uploadError) {
        setOcrOverlay({ isVisible: true, status: 'error', errorMessage: `Erro ao fazer upload: ${uploadError.message}` });
        return;
      }

      setOcrOverlay({ isVisible: true, status: 'processing' });
      
      const { data: publicUrlData } = supabase.storage
        .from('receitas-medicas')
        .getPublicUrl(fileName);
      if (!publicUrlData) {
        setOcrOverlay({ isVisible: true, status: 'error', errorMessage: 'Erro ao obter URL pública' });
        return;
      }
      const imageUrl = publicUrlData.publicUrl;

      const { data: inserted, error: insertError } = await supabase
        .from('ocr_gerenciamento')
        .insert({
          user_id: userIdToUse,
          image_url: imageUrl,
          status: 'PENDENTE',
        })
        .select('id')
        .single();

      if (insertError) {
        setOcrOverlay({ isVisible: true, status: 'error', errorMessage: `Erro ao salvar no banco: ${insertError.message}` });
        return;
      }

      setOcrOverlay({ isVisible: true, status: 'analyzing' });

      // Polling de status do OCR
      if (inserted?.id) {
        const ocrId = Number(inserted.id);
        const start = Date.now();
        const timeoutMs = 10 * 60 * 1000; // 10 minutos
        const interval = 3000; // 3s para feedback mais rápido
        
        const poll = async () => {
          try {
            const { data, error } = await supabase
              .from('ocr_gerenciamento')
              .select('status, result_json, image_url')
              .eq('id', ocrId)
              .single();
              
            if (error) {
              if (Date.now() - start < timeoutMs) {
                setTimeout(poll, interval);
              } else {
                setOcrOverlay({ isVisible: true, status: 'error', errorMessage: 'Tempo esgotado aguardando processamento da receita.' });
              }
              return;
            }
            
            const status = (data as any)?.status;
            
            // Aguardando validação: abrir tela de validação
            if (status === 'AGUARDANDO_VALIDACAO') {
              const resultJson = (data as any)?.result_json;
              const medicamentos = resultJson?.medicamentos || resultJson?.medicamentos_extraidos_qwen || [];
              const imgUrl = (data as any)?.image_url || '';

              setOcrOverlay({ isVisible: true, status: 'validating' });
              
              // Pequeno delay para mostrar o status antes de abrir modal
              setTimeout(() => {
                setOcrOverlay({ isVisible: false, status: 'uploading' });
                
                if (medicamentos.length > 0 && imgUrl) {
                  setValidacaoModal({
                    isOpen: true,
                    ocrId: ocrId,
                    imageUrl: imgUrl,
                    medicamentos,
                  });
                } else {
                  toast.error('Nenhum medicamento encontrado na receita. Tente novamente com uma foto mais clara.');
                }
              }, 800);
              return;
            }
            
            // Sucesso: PROCESSADO ou PROCESSADO_PARCIALMENTE
            if (status === 'PROCESSADO' || status === 'PROCESSADO_PARCIALMENTE') {
              setOcrOverlay({ isVisible: true, status: 'success' });
              await fetchMedicamentos();
              setTimeout(() => {
                setOcrOverlay({ isVisible: false, status: 'uploading' });
              }, 1500);
              return;
            }
            
            // Erros
            if (status === 'ERRO_PROCESSAMENTO' || status === 'ERRO_DATABASE') {
              const errMsg = 'Não foi possível encontrar medicamento na receita.';
              setOcrOverlay({ isVisible: true, status: 'error', errorMessage: errMsg });
              return;
            }
            
            if (Date.now() - start >= timeoutMs) {
              setOcrOverlay({ isVisible: true, status: 'error', errorMessage: 'Tempo esgotado aguardando processamento da receita.' });
              return;
            }
            
            setTimeout(poll, interval);
          } catch (e) {
            if (Date.now() - start < timeoutMs) {
              setTimeout(poll, interval);
            } else {
              const errMsg = e instanceof Error ? e.message : 'Erro inesperado';
              setOcrOverlay({ isVisible: true, status: 'error', errorMessage: errMsg });
            }
          }
        };
        
        setTimeout(poll, interval);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Erro inesperado';
      setOcrOverlay({ isVisible: true, status: 'error', errorMessage: errMsg });
    } finally {
      setPhotoUploading(false);
    }
  };

  // Renderiza o conteúdo
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
              medicamento={medicamento as any}
              onEdit={() => handleEditMedicamento(medicamento)}
              onDelete={() => handleDeleteMedicamento(medicamento.id)}
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
            <button className={styles.addButton} onClick={() => setAddModalOpen(true)}>
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

      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Adicionar medicamento">
        <AddMedicamentoForm onSave={handleSaveMedicamento} onCancel={() => setAddModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingMedicamento(null);
        }}
        title="Editar medicamento"
      >
        {editingMedicamento && medicamentoFormData && (
          <AddMedicamentoForm
            key={`form-${editingMedicamento.id}`}
            onSave={handleUpdateMedicamento}
            onCancel={() => {
              setEditModalOpen(false);
              setEditingMedicamento(null);
            }}
            medicamento={medicamentoFormData}
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

      <Modal
        isOpen={validacaoModal.isOpen}
        onClose={() => {
          setValidacaoModal({
            isOpen: false,
            ocrId: null,
            imageUrl: null,
            medicamentos: [],
          });
        }}
        title="Validar Leitura OCR"
      >
        {validacaoModal.ocrId && validacaoModal.imageUrl && targetUserId && (
          <ValidarOcrMedicamentos
            ocrId={validacaoModal.ocrId}
            imageUrl={validacaoModal.imageUrl}
            medicamentos={validacaoModal.medicamentos}
            userId={targetUserId}
            perfilId={targetProfileId || undefined}
            onConfirm={async () => {
              setValidacaoModal({
                isOpen: false,
                ocrId: null,
                imageUrl: null,
                medicamentos: [],
              });
              await fetchMedicamentos();
            }}
            onCancel={() => {
              setValidacaoModal({
                isOpen: false,
                ocrId: null,
                imageUrl: null,
                medicamentos: [],
              });
            }}
          />
        )}
      </Modal>

      {/* Overlay de processamento OCR */}
      <OcrProcessingOverlay
        isVisible={ocrOverlay.isVisible}
        status={ocrOverlay.status}
        errorMessage={ocrOverlay.errorMessage}
        onClose={() => setOcrOverlay({ isVisible: false, status: 'uploading' })}
      />
    </main>
  );
}