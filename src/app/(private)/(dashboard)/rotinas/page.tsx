'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// Componentes e hooks
import { useAuth } from '@/contexts/AuthContext';
import { useProfileContext } from '@/contexts/ProfileContext';
import { FullScreenLoader } from '@/components/features/FullScreenLoader';
import { AddRotinaForm } from '@/components/features/forms/AddRotinaForm';
import { Modal } from '@/components/features/Modal';
import RotinaCard from '@/components/features/RotinasCard';
import { createClient } from '@/lib/supabase/client';
import { useIdoso } from '@/contexts/IdosoContext';
import { toast } from '@/components/features/Toast';
import { RotinasService } from '@/lib/supabase/services';
import { listarEventosDoDia, atualizarStatusEvento, criarOuAtualizarEvento } from '@/lib/supabase/services/historicoEventos';
import { Tables } from '@/types/supabase';

// Tipos
type RotinaDB = Tables<'rotinas'>;
type Rotina = RotinaDB;
type Frequencia = any; // Json type from Supabase

export default function Rotinas() {
  // Hooks e estados
  const { user } = useAuth();
  const router = useRouter();
  const { profile } = useProfileContext();
  const { idosoSelecionadoId, listaIdososVinculados } = useIdoso();
  const isFamiliar = user?.user_metadata?.account_type === 'familiar';
  const targetUserId = isFamiliar ? idosoSelecionadoId : user?.id;
  const targetPerfilId = isFamiliar ? idosoSelecionadoId : profile?.id;
  
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventosDoDia, setEventosDoDia] = useState<Array<{ id: string; tipo_evento: string; evento_id: string; status: string }>>([]);
  const [marking, setMarking] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  
  // Estados para modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRotina, setEditingRotina] = useState<Rotina | null>(null);
  
  const selectedElderName = useMemo(() => (
    listaIdososVinculados.find((i) => i.id === idosoSelecionadoId)?.nome || null
  ), [listaIdososVinculados, idosoSelecionadoId]);

  // Carregar rotinas e eventos do dia
  useEffect(() => {
    const carregarDados = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        if (isFamiliar && !targetUserId) {
          setRotinas([]);
          return;
        }

        // Carrega rotinas
        const rotinasData = await RotinasService.listarRotinas(targetUserId || user.id);
        setRotinas(rotinasData);

        // Carrega eventos do dia (precisa do perfil_id, não user_id)
        const hoje = new Date();
        const perfilIdParaEventos = isFamiliar ? idosoSelecionadoId : profile?.id;
        if (!perfilIdParaEventos) {
          setEventosDoDia([]);
          return;
        }
        const eventos = await listarEventosDoDia(perfilIdParaEventos, hoje);
        setEventosDoDia(
          eventos.map(e => ({
            id: e.id.toString(),
            tipo_evento: e.tipo_evento,
            evento_id: e.evento_id.toString(),
            status: e.status
          }))
        );
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Não foi possível carregar as rotinas');
        toast.error('Não foi possível carregar as rotinas');
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [user?.id, targetUserId, isFamiliar, profile?.id, idosoSelecionadoId]);

  // Função de refresh local para recarregar rotinas
  const refreshRotinas = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (isFamiliar && !targetUserId) {
        setRotinas([]);
        return;
      }

      // Carrega rotinas
      const rotinasData = await RotinasService.listarRotinas(targetUserId || user.id);
      setRotinas(rotinasData);

      // Carrega eventos do dia (precisa do perfil_id, não user_id)
      const hoje = new Date();
      const perfilIdParaEventos = isFamiliar ? idosoSelecionadoId : profile?.id;
      if (!perfilIdParaEventos) {
        setEventosDoDia([]);
        return;
      }
      const eventos = await listarEventosDoDia(perfilIdParaEventos, hoje);
      setEventosDoDia(
        eventos.map(e => ({
          id: e.id.toString(),
          tipo_evento: e.tipo_evento,
          evento_id: e.evento_id.toString(),
          status: e.status
        }))
      );
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Não foi possível carregar as rotinas');
      toast.error('Não foi possível carregar as rotinas');
    } finally {
      setLoading(false);
    }
  };

  // Ouve botões do Header
  useEffect(() => {
    const onAddRotina = () => setIsAddModalOpen(true);
    window.addEventListener('caremind:add-rotina', onAddRotina as EventListener);
    return () => {
      window.removeEventListener('caremind:add-rotina', onAddRotina as EventListener);
    };
  }, []);

  // Handlers para formulários
  const handleSaveRotina = async (titulo: string, descricao: string | null, frequencia: Frequencia) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    
    if (isFamiliar && !targetUserId) {
      toast.error('Selecione um idoso no menu superior antes de adicionar rotinas.');
      return;
    }

    try {
      // Garantir que frequencia seja um objeto válido
      let frequenciaLimpa: any = null;
      if (frequencia && typeof frequencia === 'object' && !Array.isArray(frequencia)) {
        frequenciaLimpa = {};
        const freqObj = frequencia as Record<string, any>;
        if (freqObj.tipo) frequenciaLimpa.tipo = freqObj.tipo;
        if (freqObj.horarios && Array.isArray(freqObj.horarios)) {
          frequenciaLimpa.horarios = freqObj.horarios;
        }
        if (freqObj.intervalo_horas !== undefined) {
          frequenciaLimpa.intervalo_horas = freqObj.intervalo_horas;
        }
        if (freqObj.inicio) {
          frequenciaLimpa.inicio = freqObj.inicio;
        }
        if (freqObj.intervalo_dias !== undefined) {
          frequenciaLimpa.intervalo_dias = freqObj.intervalo_dias;
        }
        if (freqObj.horario) {
          frequenciaLimpa.horario = freqObj.horario;
        }
        if (freqObj.dias_da_semana && Array.isArray(freqObj.dias_da_semana)) {
          frequenciaLimpa.dias_da_semana = freqObj.dias_da_semana;
        }
      }
      
      // Garantir que strings vazias sejam null
      await RotinasService.criarRotina({
        titulo: titulo?.trim() || null,
        descricao: descricao?.trim() || null,
        frequencia: frequenciaLimpa,
        user_id: targetUserId || user.id,
      });
      
      toast.success('Rotina criada com sucesso');
      await refreshRotinas();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar rotina:', error);
      toast.error('Não foi possível criar a rotina');
    }
  };

  const handleUpdateRotina = async (titulo: string, descricao: string | null, frequencia: Frequencia) => {
    if (!editingRotina) return;

    try {
      // Garantir que frequencia seja um objeto válido
      let frequenciaLimpa: any = null;
      if (frequencia && typeof frequencia === 'object' && !Array.isArray(frequencia)) {
        frequenciaLimpa = {};
        const freqObj = frequencia as Record<string, any>;
        if (freqObj.tipo) frequenciaLimpa.tipo = freqObj.tipo;
        if (freqObj.horarios && Array.isArray(freqObj.horarios)) {
          frequenciaLimpa.horarios = freqObj.horarios;
        }
        if (freqObj.intervalo_horas !== undefined) {
          frequenciaLimpa.intervalo_horas = freqObj.intervalo_horas;
        }
        if (freqObj.inicio) {
          frequenciaLimpa.inicio = freqObj.inicio;
        }
        if (freqObj.intervalo_dias !== undefined) {
          frequenciaLimpa.intervalo_dias = freqObj.intervalo_dias;
        }
        if (freqObj.horario) {
          frequenciaLimpa.horario = freqObj.horario;
        }
        if (freqObj.dias_da_semana && Array.isArray(freqObj.dias_da_semana)) {
          frequenciaLimpa.dias_da_semana = freqObj.dias_da_semana;
        }
      }
      
      await RotinasService.atualizarRotina(editingRotina.id, {
        titulo: titulo?.trim() || undefined,
        descricao: descricao?.trim() || undefined,
        frequencia: frequenciaLimpa,
      });
      
      toast.success('Rotina atualizada com sucesso');
      await refreshRotinas();
      setEditingRotina(null);
    } catch (error) {
      console.error('Erro ao atualizar rotina:', error);
      toast.error('Não foi possível atualizar a rotina');
    }
  };

  const handleDeleteRotina = async (id: string | number) => {
    const confirmed = await toast.confirm('Tem certeza que deseja excluir esta rotina?');
    if (!confirmed) {
      return;
    }

    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    setDeleting(prev => ({ ...prev, [numId]: true }));
    
    try {
      await RotinasService.deletarRotina(numId);
      toast.success('Rotina excluída com sucesso');
      await refreshRotinas();
    } catch (error) {
      console.error('Erro ao excluir rotina:', error);
      toast.error('Não foi possível excluir a rotina');
    } finally {
      setDeleting(prev => ({ ...prev, [numId]: false }));
    }
  };

  const handleEditRotina = (rotina: Rotina) => {
    setEditingRotina(rotina);
    setIsAddModalOpen(true);
  };

  const hasPendingForRotina = (rotinaId: number) =>
    eventosDoDia.some(e => e.tipo_evento === 'rotina' && Number(e.evento_id) === rotinaId && e.status === 'pendente');

  const handleMarkRotinaDone = async (rotinaId: number) => {
    if (!targetPerfilId) return;
    
    const ev = eventosDoDia.find(e => e.tipo_evento === 'rotina' && Number(e.evento_id) === rotinaId && e.status === 'pendente');
    if (!ev) {
      // Se não existe evento, cria um novo usando a função de criar/atualizar
      setMarking(prev => ({ ...prev, [rotinaId]: true }));
      try {
        await criarOuAtualizarEvento(targetPerfilId, 'rotina', rotinaId, 'confirmado');
        await refreshRotinas(); // Recarrega para sincronizar
      } catch (err) {
        console.error('Erro ao marcar rotina como concluída:', err);
        toast.error('Falha ao atualizar o status da rotina');
      } finally {
        setMarking(prev => ({ ...prev, [rotinaId]: false }));
      }
      return;
    }
    
    setMarking(prev => ({ ...prev, [rotinaId]: true }));
    const prevEventos = [...eventosDoDia];
    
    try {
      // Atualiza o status do evento para confirmado usando a função genérica
      await atualizarStatusEvento(Number(ev.id), 'confirmado');
      
      // Atualiza a UI
      setEventosDoDia(prev => 
        prev.map(e => 
          e.id === ev.id ? { ...e, status: 'confirmado' } : e
        )
      );
      
      // Recarrega dados para sincronizar
      await refreshRotinas();
    } catch (err) {
      console.error('Erro ao marcar rotina como concluída:', err);
      setEventosDoDia(prevEventos);
      toast.error('Falha ao atualizar o status da rotina');
    } finally {
      setMarking(prev => ({ ...prev, [rotinaId]: false }));
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    const supabase = createClient();

    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receitas-medicas')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('receitas-medicas')
        .getPublicUrl(fileName);
        
      if (!publicUrlData) {
        throw new Error('Não foi possível obter a URL pública da imagem');
      }
      
      const imageUrl = publicUrlData.publicUrl;
      const { error: insertError } = await supabase
        .from('ocr_gerenciamento')
        .insert({
          user_id: targetUserId || user.id,
          image_url: imageUrl,
          status: 'PENDENTE',
        });

      if (insertError) throw insertError;
      
      toast.success('Foto enviada! Processando receita...');
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error(`Erro ao enviar foto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Renderiza o conteúdo
  const renderContent = () => {
    if (isFamiliar && !targetUserId) {
      return (
        <div className={styles.emptyState}>
          <p>Selecione um idoso no menu superior para visualizar as rotinas.</p>
        </div>
      );
    }
    if (loading && rotinas.length === 0) {
      return <FullScreenLoader />;
    }

    if (error) {
      return (
        <div className={styles.container}>
          <div className={styles.error}>
            {error}
          </div>
        </div>
      );
    }
    if (rotinas.length > 0) {
      return (
        <div className={styles.gridContainer}>
          {rotinas.map((rotina) => (
            <RotinaCard
              key={rotina.id}
              rotina={{
                ...rotina,
                frequencia: rotina.frequencia as any, // Conversão para o tipo esperado pelo componente RotinaCard
              }}
              onEdit={handleEditRotina}
              onDelete={handleDeleteRotina}
              hasPendingToday={hasPendingForRotina(rotina.id)}
              isMarking={!!marking[rotina.id]}
              isDeleting={!!deleting[rotina.id]}
              onMarkAsDone={() => handleMarkRotinaDone(rotina.id)}
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
          <h1 className={styles.content_title}>{selectedElderName ? `Rotinas de ${selectedElderName}` : 'Rotinas'}</h1>
        </div>

        {!loading && !error && !(isFamiliar && !targetUserId) && (
          <div className={styles.actionsContainer}>
            <button 
              className={styles.addButton} 
              onClick={() => setIsAddModalOpen(true)}
            >
              <span className={styles.addIcon}>+</span>
              Adicionar Rotina
            </button>
          </div>
        )}
        <section className={styles.content_info}>
          {renderContent()}
        </section>
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title={editingRotina ? 'Editar rotina' : 'Adicionar rotina'}
      >
        <AddRotinaForm 
          onSave={editingRotina ? handleUpdateRotina : handleSaveRotina} 
          onCancel={() => {
            setIsAddModalOpen(false);
            setEditingRotina(null);
          }}
          rotina={editingRotina ? {
            id: editingRotina.id.toString(),
            titulo: editingRotina.titulo || '',
            descricao: editingRotina.descricao || '',
            frequencia: editingRotina.frequencia as any
          } : undefined}
        />
      </Modal>
    </main>
  );
}
