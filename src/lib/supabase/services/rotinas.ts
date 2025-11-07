import { createClient } from '../client';
import { Database } from '@/types/supabase';

type Rotina = Database['public']['Tables']['rotinas']['Row'];
type InsertRotina = Database['public']['Tables']['rotinas']['Insert'];
type UpdateRotina = Database['public']['Tables']['rotinas']['Update'];

export const RotinasService = {
  async listarRotinas(userId: string): Promise<Rotina[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('rotinas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar rotinas:', error);
      throw error;
    }

    return data || [];
  },

  async buscarRotina(id: number): Promise<Rotina | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('rotinas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar rotina:', error);
      throw error;
    }

    return data;
  },

  async criarRotina(rotina: InsertRotina): Promise<Rotina> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('rotinas')
      .insert(rotina)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar rotina:', error);
      throw error;
    }

    return data;
  },

  async atualizarRotina(id: number, atualizacoes: UpdateRotina): Promise<Rotina> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('rotinas')
      .update(atualizacoes)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar rotina:', error);
      throw error;
    }

    return data;
  },

  async excluirRotina(id: number): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('rotinas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir rotina:', error);
      throw error;
    }
  },

  async marcarComoConcluida(id: number): Promise<Rotina> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('rotinas')
      .update({ concluido: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao marcar rotina como concluída:', error);
      throw error;
    }

    return data;
  },

  async listarProximas(userId: string, limite: number = 5): Promise<Rotina[]> {
    const agora = new Date();
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('rotinas')
      .select('*')
      .eq('user_id', userId)
      .gte('data', agora.toISOString())
      .order('data', { ascending: true })
      .limit(limite);

    if (error) {
      console.error('Erro ao listar próximas rotinas:', error);
      throw error;
    }

    return data || [];
  },

  async listarRotinasDiarias(userId: string, data: Date): Promise<Rotina[]> {
    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);
    
    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 999);

    const supabase = createClient();
    const { data: rotinas, error } = await supabase
      .from('rotinas')
      .select('*')
      .eq('user_id', userId)
      .lte('data', fimDia.toISOString())
      .order('data', { ascending: true });

    if (error) {
      console.error('Erro ao listar rotinas diárias:', error);
      throw error;
    }

    // Filtra as rotinas que devem ocorrer no dia especificado
    return (rotinas || []).filter(rotina => {
      if (!rotina.data) return false;
      
      const rotinaDate = new Date(rotina.data);
      return rotinaDate >= inicioDia && rotinaDate <= fimDia;
    });
  }
};
