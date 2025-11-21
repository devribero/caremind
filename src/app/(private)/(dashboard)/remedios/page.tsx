'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { useAuth } from '@/contexts/AuthContext';
import { useIdoso } from '@/contexts/IdosoContext';
import { useProfile } from '@/hooks/useProfile';
import { FullScreenLoader } from '@/components/features/FullScreenLoader';
import { AddMedicamentoForm } from '@/components/features/forms/AddMedicamentoForm';
import { Modal } from '@/components/features/Modal';
import MedicamentoCard from '@/components/features/MedicamentoCard';
import { ValidarOcrMedicamentos } from '@/components/features/ValidarOcrMedicamentos';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/features/Toast';
import { MedicamentosService } from '@/lib/supabase/services';
import { listarEventosDoDia, atualizarStatusEvento } from '@/lib/supabase/services/historicoEventos';

// Estilos
import styles from './page.module.css';

type Medicamento = {
  id: number;
  nome: string;
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
  const { profile } = useProfile();
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
        user_id: targetUserId,
      });
      setMedicamentos(prev => [novoMedicamento, ...prev]);
      toast.success('Medicamento criado com sucesso');
      setAddModalOpen(false);
      await fetchMedicamentos(); // Recarrega para garantir sincronização
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar medicamento';
      toast.error(errorMessage);
      alert(`Erro ao criar medicamento: ${errorMessage}`);
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
    const ev = eventosDoDia.find(e => e.tipo_evento === 'medicamento' && e.evento_id === medId && e.status === 'pendente');
    if (!ev) return;
    setMarking(prev => ({ ...prev, [medId]: true }));
    const prevEventos = eventosDoDia;
    setEventosDoDia(prev => prev.map(e => e.id === ev.id ? { ...e, status: 'confirmado' } : e));
    try {
      await atualizarStatusEvento(ev.id, 'confirmado');
      // Recarrega os medicamentos para atualizar a quantidade
      await fetchMedicamentos();
      toast.success('Medicamento marcado como tomado');
    } catch (err) {
      setEventosDoDia(prevEventos);
      const errorMessage = err instanceof Error ? err.message : 'Falha ao atualizar evento';
      toast.error(errorMessage);
      alert(errorMessage);
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
              .select('status, error_message, result_json, image_url')
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
            // Aguardando validação: abrir tela de validação
            if (status === 'AGUARDANDO_VALIDACAO') {
              const resultJson = (data as any)?.result_json;
              const medicamentos = resultJson?.medicamentos || [];
              const imageUrl = (data as any)?.image_url || '';
              
              if (medicamentos.length > 0 && imageUrl) {
                setValidacaoModal({
                  isOpen: true,
                  ocrId: Number(ocrId),
                  imageUrl,
                  medicamentos,
                });
                photoModal.close();
                return; // fim do polling - aguardando validação do usuário
              } else {
                toast.error('Erro: dados do OCR não encontrados');
                return;
              }
            }
            // Sucesso: PROCESSADO ou PROCESSADO_PARCIALMENTE
            if (status === 'PROCESSADO' || status === 'PROCESSADO_PARCIALMENTE') {
              toast.success('Receita processada. Atualizando medicamentos...');
              await fetchMedicamentos();
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
              medicamento={medicamento}
              onEdit={handleEditMedicamento}
              onDelete={handleDeleteMedicamento}
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
    </main>
  );
}