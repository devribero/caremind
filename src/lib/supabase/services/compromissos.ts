import { createClient } from '../client';
import { Database } from '@/types/supabase';

type Compromisso = Database['public']['Tables']['compromissos']['Row'];
type InsertCompromisso = Database['public']['Tables']['compromissos']['Insert'];
type UpdateCompromisso = Database['public']['Tables']['compromissos']['Update'];

export const CompromissosService = {
  async listarCompromissos(perfilId: string): Promise<Compromisso[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('compromissos')
      .select('*')
      .eq('perfil_id', perfilId)
      .order('data_hora', { ascending: true });

    if (error) {
      console.error('Erro ao listar compromissos:', error);
      throw error;
    }

    return data || [];
  },

  async buscarCompromisso(id: string): Promise<Compromisso | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('compromissos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar compromisso:', error);
      throw error;
    }

    return data;
  },

  async criarCompromisso(compromisso: InsertCompromisso): Promise<Compromisso> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('compromissos')
      .insert(compromisso)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar compromisso:', error);
      throw error;
    }

    return data;
  },

  async atualizarCompromisso(id: string, atualizacoes: UpdateCompromisso): Promise<Compromisso> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('compromissos')
      .update({
        ...atualizacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar compromisso:', error);
      throw error;
    }

    return data;
  },

  async excluirCompromisso(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('compromissos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir compromisso:', error);
      throw error;
    }
  },

  async listarPorPeriodo(perfilId: string, inicio: Date, fim: Date): Promise<Compromisso[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('compromissos')
      .select('*')
      .eq('perfil_id', perfilId)
      .gte('data_hora', inicio.toISOString())
      .lte('data_hora', fim.toISOString())
      .order('data_hora', { ascending: true });

    if (error) {
      console.error('Erro ao listar compromissos por período:', error);
      throw error;
    }

    return data || [];
  }
};
