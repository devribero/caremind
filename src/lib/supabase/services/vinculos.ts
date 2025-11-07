import { createClient } from '../client';
import { Database } from '@/types/supabase';

type VinculoFamiliar = Database['public']['Tables']['vinculos_familiares']['Row'];
type InsertVinculoFamiliar = Database['public']['Tables']['vinculos_familiares']['Insert'];
type UpdateVinculoFamiliar = Database['public']['Tables']['vinculos_familiares']['Update'];

export const VinculosService = {
  async listarVinculosPorIdoso(idosoId: string): Promise<VinculoFamiliar[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vinculos_familiares')
      .select('*')
      .eq('id_idoso', idosoId);

    if (error) {
      console.error('Erro ao listar vínculos do idoso:', error);
      throw error;
    }

    return data || [];
  },

  async listarVinculosPorFamiliar(familiarId: string): Promise<VinculoFamiliar[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vinculos_familiares')
      .select('*')
      .eq('id_familiar', familiarId);

    if (error) {
      console.error('Erro ao listar vínculos do familiar:', error);
      throw error;
    }

    return data || [];
  },

  async criarVinculo(vinculo: InsertVinculoFamiliar): Promise<VinculoFamiliar> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vinculos_familiares')
      .insert(vinculo)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar vínculo familiar:', error);
      throw error;
    }

    return data;
  },

  async removerVinculo(idosoId: string, familiarId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('vinculos_familiares')
      .delete()
      .eq('id_idoso', idosoId)
      .eq('id_familiar', familiarId);

    if (error) {
      console.error('Erro ao remover vínculo familiar:', error);
      throw error;
    }
  },

  async verificarVinculo(idosoId: string, familiarId: string): Promise<boolean> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vinculos_familiares')
      .select('*')
      .eq('id_idoso', idosoId)
      .eq('id_familiar', familiarId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao verificar vínculo familiar:', error);
      throw error;
    }

    return !!data;
  },

  async listarIdososVinculados(familiarId: string): Promise<string[]> {
    const vinculos = await this.listarVinculosPorFamiliar(familiarId);
    return vinculos.map(v => v.id_idoso);
  },

  async listarFamiliaresVinculados(idosoId: string): Promise<string[]> {
    const vinculos = await this.listarVinculosPorIdoso(idosoId);
    return vinculos.map(v => v.id_familiar);
  }
};
