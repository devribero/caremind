// Tipos de Frequência

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

// Tipo para o formulário de rotina
export type RotinaFormData = {
  id?: string;
  titulo: string;
  descricao: string;
  frequencia: Frequencia;
};

// Tipo para o serviço de rotina
export type RotinaServiceData = {
  id: string;
  created_at: string;
  titulo: string;
  descricao?: string;
  frequencia: Frequencia;
  user_id: string;
};

// Função para converter entre os tipos
export function toServiceData(formData: RotinaFormData, userId: string): Omit<RotinaServiceData, 'id' | 'created_at'> {
  return {
    titulo: formData.titulo,
    descricao: formData.descricao,
    frequencia: formData.frequencia,
    user_id: userId
  };
}

export function toFormData(serviceData: RotinaServiceData): RotinaFormData {
  return {
    id: serviceData.id,
    titulo: serviceData.titulo,
    descricao: serviceData.descricao || '',
    frequencia: serviceData.frequencia
  };
}
