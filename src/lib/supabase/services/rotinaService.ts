import { createClient } from '../client';

export type FrequenciaDiaria = {
  tipo: 'diario';
  horarios: string[];
};

export type FrequenciaIntervalo = {
  tipo: 'intervalo';
  intervalo_horas: number;
  inicio: string;
};

export type FrequenciaDiasAlternados = {
  tipo: 'dias_alternados';
  intervalo_dias: number;
  horario: string;
};

export type FrequenciaSemanal = {
  tipo: 'semanal';
  dias_da_semana: number[];
  horario: string;
};

export type Frequencia = FrequenciaDiaria | FrequenciaIntervalo | FrequenciaDiasAlternados | FrequenciaSemanal;

export interface Rotina {
  id: number;
  created_at: string;
  titulo: string;
  descricao?: string;
  frequencia: Frequencia;
  user_id: string;
}

export type RotinaInsert = Omit<Rotina, 'id' | 'created_at'>;
export type RotinaUpdate = Partial<Omit<RotinaInsert, 'user_id'>>;

const TABLE_NAME = 'rotinas';

// Exporta o objeto RotinasService seguindo o padrão dos outros serviços
export const RotinasService = {
  async listarRotinas(userId: string): Promise<Rotina[]> {
    const supabase = createClient();
    
    // Obter perfil_id do usuário
    const { data: perfil } = await supabase
      .from('perfis')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    const perfilId = perfil?.id;
    
    // Usar perfil_id se disponível, senão usar user_id (compatibilidade durante transição)
    const query = supabase
      .from('rotinas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (perfilId) {
      query.or(`perfil_id.eq.${perfilId},user_id.eq.${userId}`);
    } else {
      query.eq('user_id', userId);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar rotinas:', error);
      throw error;
    }

    return data as Rotina[];
  },

  async buscarRotinaPorId(id: number): Promise<Rotina | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('rotinas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar rotina:', error);
      throw error;
    }

    return data as Rotina;
  },

  async criarRotina(rotina: Omit<RotinaInsert, 'id' | 'created_at'>): Promise<Rotina> {
    const supabase = createClient();
    
    // Se não tem perfil_id, buscar do user_id
    if (!(rotina as any).perfil_id && rotina.user_id) {
      const { data: perfil } = await supabase
        .from('perfis')
        .select('id')
        .eq('user_id', rotina.user_id)
        .maybeSingle();
      
      if (perfil) {
        (rotina as any).perfil_id = perfil.id;
      }
    }
    
    const { data, error } = await supabase
      .from('rotinas')
      .insert(rotina)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar rotina:', error);
      throw error;
    }

    return data as Rotina;
  },

  async atualizarRotina(id: number, atualizacoes: RotinaUpdate): Promise<Rotina> {
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

    return data as Rotina;
  },

  async deletarRotina(id: number): Promise<void> {
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

  async marcarRotinaConcluida(rotinaId: number, perfilId: string): Promise<void> {
    const supabase = createClient();
    
    // Primeiro, verifica se já existe um evento hoje para esta rotina
    const hoje = new Date();
    const inicioDia = new Date(hoje);
    inicioDia.setHours(0, 0, 0, 0);
    
    const fimDia = new Date(hoje);
    fimDia.setHours(23, 59, 59, 999);

    const { data: eventosExistentes } = await supabase
      .from('historico_eventos')
      .select('id')
      .eq('tipo_evento', 'rotina')
      .eq('evento_id', rotinaId)
      .eq('perfil_id', perfilId)
      .gte('data_prevista', inicioDia.toISOString())
      .lte('data_prevista', fimDia.toISOString());

    if (eventosExistentes && eventosExistentes.length > 0) {
      // Atualiza o evento existente
      const { error } = await supabase
        .from('historico_eventos')
        .update({ 
          status: 'confirmado',
          horario_programado: new Date().toISOString()
        })
        .eq('id', eventosExistentes[0].id);

      if (error) throw error;
    } else {
      // Cria um novo evento
      const { error } = await supabase
        .from('historico_eventos')
        .insert({
          tipo_evento: 'rotina',
          evento_id: rotinaId,
          perfil_id: perfilId,
          status: 'confirmado',
          data_prevista: new Date().toISOString(),
          horario_programado: new Date().toISOString()
        });

      if (error) throw error;
    }
  },
};

