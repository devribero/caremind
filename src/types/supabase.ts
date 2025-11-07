export type Compromisso = {
  id: string;
  perfil_id: string;
  titulo: string;
  descricao: string | null;
  data_hora: string;
  local: string | null;
  tipo: 'consulta' | 'exame' | 'procedimento' | 'outros';
  lembrete_minutos: number;
  created_at: string;
  updated_at: string;
};

export type HistoricoEvento = {
  id: number;
  created_at: string;
  perfil_id: string;
  tipo_evento: string;
  evento_id: number;
  data_prevista: string;
  status: string;
  horario_confirmacao: string | null;
  bem_estar_registrado: string | null;
  lembrete_disparado: boolean;
  falha_notificada: boolean;
  titulo: string | null;
  descricao: string | null;
};

export type Medicamento = {
  id: number;
  created_at: string;
  nome: string | null;
  user_id: string | null;
  dosagem: string | null;
  frequencia: any; // JSONB
  quantidade: number | null;
  concluido: boolean;
  data_agendada: string | null;
  via: string | null;
};

export type Perfil = {
  id: string;
  created_at: string;
  nome: string | null;
  tipo: string | null;
  codigo_vinculacao_expira_em: string | null;
  foto_usuario: string | null;
  user_id: string;
  telefone: string | null;
  data_nascimento: string | null;
  codigo_vinculacao: string | null;
  updated_at: string | null;
};

export type Rotina = {
  data_agendada: any;
  id: number;
  created_at: string;
  titulo: string | null;
  user_id: string | null;
  descricao: string | null;
  concluido: boolean;
  data: string | null;
  frequencia: any; // JSONB
};

export type VinculoFamiliar = {
  created_at: string;
  id_idoso: string;
  id_familiar: string;
};

export type Database = {
  public: {
    Tables: {
      compromissos: {
        Row: Compromisso;
        Insert: Omit<Compromisso, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Compromisso, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      historico_eventos: {
        Row: HistoricoEvento;
        Insert: Omit<HistoricoEvento, 'id' | 'created_at'>;
        Update: Partial<Omit<HistoricoEvento, 'id' | 'created_at'>>;
      };
      medicamentos: {
        Row: Medicamento;
        Insert: Omit<Medicamento, 'id' | 'created_at'>;
        Update: Partial<Omit<Medicamento, 'id' | 'created_at'>>;
      };
      perfis: {
        Row: Perfil;
        Insert: Omit<Perfil, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Perfil, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      rotinas: {
        Row: Rotina;
        Insert: Omit<Rotina, 'id' | 'created_at'>;
        Update: Partial<Omit<Rotina, 'id' | 'created_at'>>;
      };
      vinculos_familiares: {
        Row: VinculoFamiliar;
        Insert: VinculoFamiliar;
        Update: Partial<VinculoFamiliar>;
      };
    };
  };
};
