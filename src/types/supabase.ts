export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      compromissos: {
        Row: {
          id: string
          perfil_id: string
          titulo: string
          descricao: string | null
          data_hora: string
          local: string | null
          tipo: 'consulta' | 'exame' | 'procedimento' | 'outros' | null
          lembrete_minutos: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          perfil_id: string
          titulo: string
          descricao?: string | null
          data_hora: string
          local?: string | null
          tipo?: 'consulta' | 'exame' | 'procedimento' | 'outros' | null
          lembrete_minutos?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          perfil_id?: string
          titulo?: string
          descricao?: string | null
          data_hora?: string
          local?: string | null
          tipo?: 'consulta' | 'exame' | 'procedimento' | 'outros' | null
          lembrete_minutos?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      historico_eventos: {
        Row: {
          id: number
          created_at: string
          perfil_id: string
          tipo_evento: string
          evento_id: number
          data_prevista: string
          status: string
          horario_programado: string | null
          bem_estar_registrado: string | null
          id_evento_origem: string | null
        }
        Insert: {
          id?: never
          created_at?: string
          perfil_id: string
          tipo_evento: string
          evento_id: number
          data_prevista: string
          status?: string
          horario_programado?: string | null
          bem_estar_registrado?: string | null
          id_evento_origem?: string | null
        }
        Update: {
          id?: never
          created_at?: string
          perfil_id?: string
          tipo_evento?: string
          evento_id?: number
          data_prevista?: string
          status?: string
          horario_programado?: string | null
          bem_estar_registrado?: string | null
          id_evento_origem?: string | null
        }
      }
      medicamentos: {
        Row: {
          id: number
          created_at: string
          nome: string | null
          user_id: string | null
          dosagem: string | null
          frequencia: Json | null
          quantidade: number | null
          concluido: boolean | null
          data_agendada: string | null
          via: string | null
        }
        Insert: {
          id?: never
          created_at?: string
          nome?: string | null
          user_id?: string | null
          dosagem?: string | null
          frequencia?: Json | null
          quantidade?: number | null
          concluido?: boolean | null
          data_agendada?: string | null
          via?: string | null
        }
        Update: {
          id?: never
          created_at?: string
          nome?: string | null
          user_id?: string | null
          dosagem?: string | null
          frequencia?: Json | null
          quantidade?: number | null
          concluido?: boolean | null
          data_agendada?: string | null
          via?: string | null
        }
      }
      metricas_saude: {
        Row: {
          id: string
          perfil_id: string
          tipo: 'pressao_arterial' | 'peso' | 'glicemia' | 'exercicio' | 'humor'
          valor: Json
          unidade: string | null
          data_hora: string
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          perfil_id: string
          tipo: 'pressao_arterial' | 'peso' | 'glicemia' | 'exercicio' | 'humor'
          valor: Json
          unidade?: string | null
          data_hora: string
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          perfil_id?: string
          tipo?: 'pressao_arterial' | 'peso' | 'glicemia' | 'exercicio' | 'humor'
          valor?: Json
          unidade?: string | null
          data_hora?: string
          observacoes?: string | null
          created_at?: string
        }
      }
      notificacoes: {
        Row: {
          id: string
          perfil_id: string
          tipo: 'medicamento' | 'rotina' | 'compromisso' | 'sistema'
          titulo: string
          mensagem: string
          data_hora: string
          lida: boolean
          dados: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          perfil_id: string
          tipo: 'medicamento' | 'rotina' | 'compromisso' | 'sistema'
          titulo: string
          mensagem: string
          data_hora: string
          lida?: boolean
          dados?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          perfil_id?: string
          tipo?: 'medicamento' | 'rotina' | 'compromisso' | 'sistema'
          titulo?: string
          mensagem?: string
          data_hora?: string
          lida?: boolean
          dados?: Json | null
          created_at?: string
        }
      }
      ocr_gerenciamento: {
        Row: {
          id: number
          created_at: string
          user_id: string | null
          image_url: string | null
          status: string | null
          result_json: Json | null
        }
        Insert: {
          id?: never
          created_at?: string
          user_id?: string | null
          image_url?: string | null
          status?: string | null
          result_json?: Json | null
        }
        Update: {
          id?: never
          created_at?: string
          user_id?: string | null
          image_url?: string | null
          status?: string | null
          result_json?: Json | null
        }
      }
      perfis: {
        Row: {
          id: string
          created_at: string
          nome: string | null
          tipo: string | null
          codigo_vinculacao_expira_em: string | null
          foto_usuario: string | null
          user_id: string
          telefone: string | null
          data_nascimento: string | null
          codigo_vinculacao: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          created_at?: string
          nome?: string | null
          tipo?: string | null
          codigo_vinculacao_expira_em?: string | null
          foto_usuario?: string | null
          user_id: string
          telefone?: string | null
          data_nascimento?: string | null
          codigo_vinculacao?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          nome?: string | null
          tipo?: string | null
          codigo_vinculacao_expira_em?: string | null
          foto_usuario?: string | null
          user_id?: string
          telefone?: string | null
          data_nascimento?: string | null
          codigo_vinculacao?: string | null
          updated_at?: string | null
        }
      }
      receitas: {
        Row: {
          id: number
          created_at: string
          perfil_id: string
          nome_medico: string | null
          data_receita: string | null
          arquivo_url: string
        }
        Insert: {
          id?: never
          created_at?: string
          perfil_id: string
          nome_medico?: string | null
          data_receita?: string | null
          arquivo_url: string
        }
        Update: {
          id?: never
          created_at?: string
          perfil_id?: string
          nome_medico?: string | null
          data_receita?: string | null
          arquivo_url?: string
        }
      }
      rotinas: {
        Row: {
          id: number
          created_at: string
          titulo: string | null
          user_id: string | null
          descricao: string | null
          concluido: boolean | null
          data: string | null
          frequencia: Json | null
        }
        Insert: {
          id?: never
          created_at?: string
          titulo?: string | null
          user_id?: string | null
          descricao?: string | null
          concluido?: boolean | null
          data?: string | null
          frequencia?: Json | null
        }
        Update: {
          id?: never
          created_at?: string
          titulo?: string | null
          user_id?: string | null
          descricao?: string | null
          concluido?: boolean | null
          data?: string | null
          frequencia?: Json | null
        }
      }
      user_integrations: {
        Row: {
          id: string
          user_id: string
          provider: string
          amazon_user_id: string | null
          access_token: string | null
          refresh_token: string | null
          expires_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          amazon_user_id?: string | null
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          amazon_user_id?: string | null
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      vinculos_familiares: {
        Row: {
          created_at: string
          id_idoso: string
          id_familiar: string
        }
        Insert: {
          created_at?: string
          id_idoso: string
          id_familiar: string
        }
        Update: {
          created_at?: string
          id_idoso?: string
          id_familiar?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];