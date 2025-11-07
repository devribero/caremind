import { createClient } from '../client';
import { Database } from '@/types/supabase';

type Perfil = Database['public']['Tables']['perfis']['Row'];
type InsertPerfil = Database['public']['Tables']['perfis']['Insert'];
type UpdatePerfil = Database['public']['Tables']['perfis']['Update'];

export const PerfisService = {
  async buscarPerfilPorId(id: string): Promise<Perfil | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil por ID:', error);
      throw error;
    }

    return data;
  },

  async buscarPerfilPorUserId(userId: string): Promise<Perfil | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil por user_id:', error);
      throw error;
    }

    return data;
  },

  async criarPerfil(perfil: InsertPerfil): Promise<Perfil> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfis')
      .insert(perfil)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar perfil:', error);
      throw error;
    }

    return data;
  },

  async atualizarPerfil(id: string, atualizacoes: UpdatePerfil): Promise<Perfil> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfis')
      .update({
        ...atualizacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }

    return data;
  },

  async atualizarFotoPerfil(id: string, fotoUrl: string): Promise<Perfil> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfis')
      .update({
        foto_usuario: fotoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar foto do perfil:', error);
      throw error;
    }

    return data;
  },

  async buscarPorCodigoVinculacao(codigo: string): Promise<Perfil | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('codigo_vinculacao', codigo)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil por código de vinculação:', error);
      throw error;
    }

    return data;
  },

  async gerarCodigoVinculacao(id: string): Promise<Perfil> {
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiracao = new Date();
    expiracao.setHours(expiracao.getHours() + 24); // Expira em 24 horas

    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfis')
      .update({
        codigo_vinculacao: codigo,
        codigo_vinculacao_expira_em: expiracao.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao gerar código de vinculação:', error);
      throw error;
    }

    return data;
  },

  async removerCodigoVinculacao(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('perfis')
      .update({
        codigo_vinculacao: null,
        codigo_vinculacao_expira_em: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover código de vinculação:', error);
      throw error;
    }
  }
};
