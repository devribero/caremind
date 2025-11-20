import { createClient } from '../client';

export interface VinculoFamiliar {
  id_idoso: string;
  id_familiar: string;
  created_at: string;
  idoso?: {
    id: string;
    user_id?: string;
    nome: string;
    foto_usuario?: string | null;
    telefone?: string | null;
    data_nascimento?: string | null;
  };
}

export interface PerfilIdosoBasico {
  id: string;
  nome: string;
  telefone: string | null;
  data_nascimento: string | null;
  foto_usuario: string | null;
}

const TABLE_NAME = 'vinculos_familiares';

export const listarIdososVinculados = async (familiarId: string): Promise<VinculoFamiliar[]> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id_familiar', familiarId);

  if (error) {
    console.error('Erro ao listar idosos vinculados:', error);
    throw error;
  }

  // Se necessário, buscar informações adicionais dos idosos
  if (data && data.length > 0) {
    const ids = data.map(v => v.id_idoso);
    const { data: idosos } = await supabase
      .from('perfis')
      .select('id, user_id, nome, foto_usuario, telefone, data_nascimento')
      .in('id', ids);

    if (idosos) {
      return data.map(vinculo => ({
        ...vinculo,
        idoso: idosos.find(i => i.id === vinculo.id_idoso) || { id: vinculo.id_idoso, nome: 'Idoso não encontrado' }
      }));
    }
  }

  return data as VinculoFamiliar[];
};

interface AtualizarPerfilIdosoInput {
  idosoId: string;
  nome: string;
  telefone?: string | null;
  data_nascimento?: string | null;
  foto_usuario?: string | null;
}

export const atualizarPerfilIdoso = async ({
  idosoId,
  nome,
  telefone,
  data_nascimento,
  foto_usuario,
}: AtualizarPerfilIdosoInput): Promise<PerfilIdosoBasico> => {
  const supabase = createClient();
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    throw new Error('O nome é obrigatório.');
  }

  const { data, error } = await supabase.functions.invoke('atualizar-idoso', {
    body: {
      idosoId,
      nome: nomeLimpo,
      telefone: telefone?.trim() || null,
      data_nascimento: data_nascimento || null,
      foto_usuario: foto_usuario || null,
    },
  });

  if (error) {
    console.error('Erro ao atualizar perfil do idoso:', error);
    throw new Error(error.message || 'Não foi possível salvar as alterações.');
  }

  const perfil = (data as { perfil?: PerfilIdosoBasico })?.perfil;
  if (!perfil) {
    throw new Error('Resposta inválida ao salvar o idoso.');
  }

  return perfil;
};

export const deletarVinculo = async (idIdoso: string, idFamiliar: string): Promise<boolean> => {
  const supabase = createClient();
  
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id_idoso', idIdoso)
    .eq('id_familiar', idFamiliar);

  if (error) {
    console.error('Erro ao deletar vínculo:', error);
    throw error;
  }

  return true;
};

export const solicitarVinculo = async (idIdoso: string, idFamiliar: string): Promise<boolean> => {
  const supabase = createClient();
  
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(
      {
        id_idoso: idIdoso,
        id_familiar: idFamiliar,
      },
      {
        onConflict: 'id_idoso,id_familiar',
        ignoreDuplicates: true,
      }
    );

  if (error) {
    console.error('Erro ao solicitar vínculo:', error);
    throw error;
  }

  return true;
};

