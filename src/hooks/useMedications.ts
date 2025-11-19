import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIdoso } from '@/contexts/IdosoContext';
import { toast } from '@/components/features/Toast';
import { MedicamentosService } from '@/lib/supabase/services';
import { Tables } from '@/types/supabase';

type Medicamento = Tables<'medicamentos'>;
type MedicamentoInsert = Tables<'medicamentos'>['Insert'];
type MedicamentoUpdate = Tables<'medicamentos'>['Update'];


export function useMedications() {
  const { user } = useAuth();
  const { idosoSelecionadoId } = useIdoso();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFamiliar = user?.user_metadata?.account_type === 'familiar';
  const targetUserId = isFamiliar ? idosoSelecionadoId : user?.id;

  const fetchMedicamentos = useCallback(async () => {
    if (!targetUserId) {
      setMedicamentos([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await MedicamentosService.listarMedicamentos(targetUserId);
      setMedicamentos(data);
    } catch (err) {
      console.error('Erro ao buscar medicamentos:', err);
      setError('Erro ao carregar medicamentos');
      toast.error('Não foi possível carregar os medicamentos');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  const addMedicamento = useCallback(async (medicamento: Omit<MedicamentoInsert, 'user_id'>) => {
    if (!targetUserId) throw new Error('Usuário não autenticado');
    
    try {
      const newMedicamento = await MedicamentosService.criarMedicamento({
        ...medicamento,
        user_id: targetUserId,
      });
      
      setMedicamentos(prev => [newMedicamento, ...prev]);
      toast.success('Medicamento adicionado com sucesso');
      return newMedicamento;
    } catch (err) {
      console.error('Erro ao adicionar medicamento:', err);
      toast.error('Erro ao adicionar medicamento');
      throw err;
    }
  }, [targetUserId]);

  const editMedicamento = useCallback(async (id: number, updates: Omit<MedicamentoUpdate, 'user_id'>) => {
    try {
      const updatedMedicamento = await MedicamentosService.atualizarMedicamento(id, updates);
      
      setMedicamentos(prev => 
        prev.map(med => med.id === id ? updatedMedicamento : med)
      );
      
      toast.success('Medicamento atualizado com sucesso');
      return updatedMedicamento;
    } catch (err) {
      console.error('Erro ao atualizar medicamento:', err);
      toast.error('Erro ao atualizar medicamento');
      throw err;
    }
  }, []);

  const removeMedicamento = useCallback(async (id: number) => {
    try {
      await MedicamentosService.deletarMedicamento(id);
      
      setMedicamentos(prev => prev.filter(med => med.id !== id));
      toast.success('Medicamento removido com sucesso');
      return true;
    } catch (err) {
      console.error('Erro ao remover medicamento:', err);
      toast.error('Erro ao remover medicamento');
      throw err;
    }
  }, []);

  const markAsTaken = useCallback(async (id: number) => {
    try {
      const updatedMedicamento = await MedicamentosService.marcarComoTomado(id);
      
      // A RPC pode não retornar o objeto completo, então talvez seja melhor refazer o fetch
      // ou atualizar o estado localmente de forma otimista.
      // Por simplicidade, vamos atualizar apenas o campo `ultima_vez_tomado`.
      setMedicamentos(prev => 
        prev.map(med => med.id === id ? { ...med, ultima_vez_tomado: new Date().toISOString(), concluido: true } : med)
      );
      
      toast.success('Medicamento marcado como tomado');
      // O retorno da RPC é o que será retornado aqui
      return updatedMedicamento;
    } catch (err) {
      console.error('Erro ao marcar medicamento como tomado:', err);
      toast.error('Erro ao marcar medicamento como tomado');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchMedicamentos();
  }, [fetchMedicamentos]);

  return {
    medicamentos,
    loading,
    error,
    addMedicamento,
    editMedicamento,
    removeMedicamento,
    markAsTaken,
    refresh: fetchMedicamentos,
  };
}

export type { Medicamento, MedicamentoInsert, MedicamentoUpdate };
