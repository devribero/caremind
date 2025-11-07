import { createClient } from '../client';
import { Database } from '@/types/supabase';

type HistoricoEvento = Database['public']['Tables']['historico_eventos']['Row'];
type InsertHistoricoEvento = Database['public']['Tables']['historico_eventos']['Insert'];
type UpdateHistoricoEvento = Database['public']['Tables']['historico_eventos']['Update'];

export const HistoricoEventosService = {
  async listarEventos(perfilId: string): Promise<HistoricoEvento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('historico_eventos')
      .select('*')
      .eq('perfil_id', perfilId)
      .order('data_prevista', { ascending: false });

    if (error) {
      console.error('Erro ao listar histórico de eventos:', error);
      throw error;
    }

    return data || [];
  },

  async buscarEvento(id: number): Promise<HistoricoEvento | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('historico_eventos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar evento:', error);
      throw error;
    }

    return data;
  },

  async criarEvento(evento: InsertHistoricoEvento): Promise<HistoricoEvento> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('historico_eventos')
      .insert(evento)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar evento:', error);
      throw error;
    }

    return data;
  },

  async atualizarEvento(id: number, atualizacoes: UpdateHistoricoEvento): Promise<HistoricoEvento> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('historico_eventos')
      .update(atualizacoes)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar evento:', error);
      throw error;
    }

    return data;
  },

  async excluirEvento(id: number): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('historico_eventos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir evento:', error);
      throw error;
    }
  },

  async listarPorTipo(perfilId: string, tipo: string): Promise<HistoricoEvento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('historico_eventos')
      .select('*')
      .eq('perfil_id', perfilId)
      .eq('tipo_evento', tipo)
      .order('data_prevista', { ascending: false });

    if (error) {
      console.error('Erro ao listar eventos por tipo:', error);
      throw error;
    }

    return data || [];
  },

  async listarEventosPorData(perfilId: string, data: string): Promise<HistoricoEvento[]> {
    const supabase = createClient();
    const inicioDia = new Date(data);
    const fimDia = new Date(inicioDia);
    fimDia.setDate(fimDia.getDate() + 1);

    const { data: eventos, error } = await supabase
      .from('historico_eventos')
      .select('*')
      .eq('perfil_id', perfilId)
      .gte('data_prevista', inicioDia.toISOString())
      .lt('data_prevista', fimDia.toISOString())
      .order('data_prevista', { ascending: true });

    if (error) {
      console.error('Erro ao listar eventos por data:', error);
      throw error;
    }

    return eventos || [];
  },

  async marcarComoLembreteDisparado(id: number): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('historico_eventos')
      .update({ lembrete_disparado: true })
      .eq('id', id);

    if (error) {
      console.error('Erro ao marcar lembrete como disparado:', error);
      throw error;
    }
  }
};
