
import { createClient } from '../client';
import { Tables } from '@/types/supabase';

type Compromisso = Tables<'compromissos'>;

export const CompromissosService = {
  async listarCompromissos(perfilId: string): Promise<Compromisso[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('compromissos')
      .select('*')
      .eq('perfil_id', perfilId);
    if (error) throw error;
    return data;
  },

  async listarCompromissosMultiplos(perfilIds: string[]): Promise<Compromisso[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('compromissos')
      .select('*')
      .in('perfil_id', perfilIds);
    if (error) throw error;
    return data;
  },

  async criarCompromisso(compromisso: Omit<Compromisso, 'id' | 'created_at'>): Promise<Compromisso> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('compromissos')
      .insert(compromisso)
      .single();
    if (error) throw error;
    return data;
  },

  async atualizarCompromisso(id: string, updates: Partial<Compromisso>): Promise<Compromisso> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('compromissos')
      .update(updates)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async deletarCompromisso(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('compromissos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
