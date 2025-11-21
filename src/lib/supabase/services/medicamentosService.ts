
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

export type MedicamentoInsert = Omit<Database['public']['Tables']['medicamentos']['Insert'], 'frequencia' | 'user_id' | 'perfil_id'> & {
  frequencia?: Frequencia | null;
  user_id: string;
  perfil_id?: string;
};

export type MedicamentoUpdate = Omit<Database['public']['Tables']['medicamentos']['Update'], 'frequencia' | 'user_id'> & {
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
    
    // Usar perfil_id se disponível, senão usar user_id (compatibilidade durante transição)
    const query = supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (perfilId) {
      query.or(`perfil_id.eq.${perfilId},user_id.eq.${userId}`);
    } else {
      query.eq('user_id', userId);
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
    
    // Se não tem perfil_id, buscar do user_id
    if (!medicamento.perfil_id && medicamento.user_id) {
      const { data: perfil } = await supabase
        .from('perfis')
        .select('id')
        .eq('user_id', medicamento.user_id)
        .maybeSingle();
      
      if (perfil) {
        (medicamento as any).perfil_id = perfil.id;
      }
    }
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(medicamento)
      .select()
      .single();
    if (error) throw error;
    return data as Medicamento;
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
