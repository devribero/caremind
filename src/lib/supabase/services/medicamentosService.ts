
import { createClient } from '../client';
import { Database } from '../../../types/database.types';

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

export type Medicamento = Omit<Database['public']['Tables']['medicamentos']['Row'], 'frequencia'> & {
  frequencia: Frequencia | null;
};

export type MedicamentoInsert = Omit<Database['public']['Tables']['medicamentos']['Insert'], 'frequencia' | 'perfil_id'> & {
  frequencia?: Frequencia | null;
  user_id?: string; // Mantido para compatibilidade, mas não será salvo no banco
  perfil_id?: string;
};

export type MedicamentoUpdate = Omit<Database['public']['Tables']['medicamentos']['Update'], 'frequencia'> & {
  frequencia?: Frequencia | null;
};

const TABLE_NAME = 'medicamentos';

export const MedicamentosService = {
  async listarMedicamentos(userId: string): Promise<Medicamento[]> {
    const supabase = createClient();
    
    // Obter perfil_id do usuário
    const { data: perfil } = await supabase
      .from('perfis')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    const perfilId = perfil?.id;
    
    // Usar apenas perfil_id (a tabela medicamentos não tem mais coluna user_id)
    const query = supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (perfilId) {
      query.eq('perfil_id', perfilId);
    } else {
      // Se não encontrar perfil, retorna array vazio
      return [];
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as Medicamento[];
  },

  async buscarMedicamentoPorId(id: number): Promise<Medicamento> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Medicamento;
  },

  async criarMedicamento(medicamento: MedicamentoInsert): Promise<Medicamento> {
    const supabase = createClient();
    
    // Validação básica
    if (!medicamento.nome?.trim()) {
      throw new Error('Nome do medicamento é obrigatório');
    }
    
    // Se não tem perfil_id, buscar do user_id
    if (!medicamento.perfil_id && medicamento.user_id) {
      const { data: perfil } = await supabase
        .from('perfis')
        .select('id')
        .eq('user_id', medicamento.user_id)
        .maybeSingle();
      
      if (perfil) {
        medicamento.perfil_id = perfil.id;
      } else {
        throw new Error('Perfil não encontrado para o usuário');
      }
    }
    
    if (!medicamento.perfil_id) {
      throw new Error('Perfil é obrigatório para criar medicamento');
    }
    
    // Removes user_id do objeto antes de inserir (a coluna não existe mais)
    const { user_id, ...medicamentoToInsert } = medicamento;
    
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(medicamentoToInsert)
        .select()
        .single();
      
      if (error) {
        console.error('Erro Supabase ao criar medicamento:', error);
        if (error.code === '23505') {
          throw new Error('Medicamento já existe');
        } else if (error.code === '23503') {
          throw new Error('Referência inválida (perfil não existe)');
        } else if (error.code === '42501') {
          throw new Error('Sem permissão para criar medicamento');
        }
        // Verificar se é erro de ambiguidade de coluna
        if (error.message && error.message.includes('column reference "data_prevista" is ambiguous')) {
          console.warn('Erro de ambiguidade detectado, tentando abordagem alternativa...');
          // Tentar criar sem trigger temporariamente
          const { data: dataFallback, error: fallbackError } = await supabase
            .rpc('criar_medicamento_sem_trigger', {
              p_nome: medicamentoToInsert.nome,
              p_perfil_id: medicamentoToInsert.perfil_id,
              p_dosagem: medicamentoToInsert.dosagem,
              p_frequencia: medicamentoToInsert.frequencia,
              p_quantidade: medicamentoToInsert.quantidade
            });
          
          if (fallbackError) {
            throw new Error(`Erro ao criar medicamento (ambiguidade no banco): ${error.message}. Por favor, contate o suporte técnico.`);
          }
          
          return dataFallback as Medicamento;
        }
        throw new Error(error.message || 'Erro ao salvar no banco de dados');
      }
      
      return data as Medicamento;
    } catch (err) {
      // Se o erro for sobre ambiguidade, fornecer uma mensagem mais clara
      if (err instanceof Error && err.message.includes('data_prevista') && err.message.includes('ambiguous')) {
        throw new Error('Erro de configuração do banco de dados ao criar medicamento. Este problema ocorre quando há múltiplos horários. Por favor, tente novamente ou contate o suporte.');
      }
      throw err;
    }
  },

  async atualizarMedicamento(id: number, updates: MedicamentoUpdate): Promise<Medicamento> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Medicamento;
  },

  async deletarMedicamento(id: number): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async marcarComoTomado(medicamentoId: number): Promise<Medicamento> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('marcar_medicamento_tomado', {
      medicamento_id: medicamentoId,
    });
    if (error) throw error;
    return data as Medicamento;
  },
};
