import { createClient } from '../client';
import { Database } from '@/types/supabase';
import { Medicamento as MedicamentoUtils } from '@/lib/utils/medicamento';

type Medicamento = Database['public']['Tables']['medicamentos']['Row'] & {
  frequencia?: MedicamentoUtils['frequencia'];
};
type InsertMedicamento = Database['public']['Tables']['medicamentos']['Insert'];
type UpdateMedicamento = Database['public']['Tables']['medicamentos']['Update'];

export const MedicamentosService = {
  async listarMedicamentos(userId: string): Promise<Medicamento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar medicamentos:', error);
      throw error;
    }

    return data || [];
  },

  async buscarMedicamento(id: number): Promise<Medicamento | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar medicamento:', error);
      throw error;
    }

    return data;
  },

  async criarMedicamento(medicamento: InsertMedicamento): Promise<Medicamento> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('medicamentos')
      .insert(medicamento)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar medicamento:', error);
      throw error;
    }

    return data;
  },

  async atualizarMedicamento(
    id: number,
    atualizacoes: UpdateMedicamento
  ): Promise<Medicamento> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('medicamentos')
      .update(atualizacoes)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar medicamento:', error);
      throw error;
    }

    return data;
  },

  async excluirMedicamento(id: number): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('medicamentos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir medicamento:', error);
      throw error;
    }
  },

  async marcarComoConcluido(id: number): Promise<Medicamento> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('medicamentos')
      .update({ concluido: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao marcar medicamento como concluído:', error);
      throw error;
    }

    return data;
  },

  async listarProximos(userId: string, limite: number = 5): Promise<Medicamento[]> {
    const agora = new Date();
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('user_id', userId)
      .gte('data_agendada', agora.toISOString())
      .order('data_agendada', { ascending: true })
      .limit(limite);

    if (error) {
      console.error('Erro ao listar próximos medicamentos:', error);
      throw error;
    }

    return data || [];
  }
};
