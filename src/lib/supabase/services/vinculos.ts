import { createClient } from '../client';

export interface VinculoFamiliar {
  id: string;
  id_idoso: string;
  id_familiar: string;
  aprovado: boolean;
  data_solicitacao: string;
  data_aprovacao?: string | null;
  idoso?: {
    id: string;
    nome: string;
    foto_url?: string | null;
  };
}

const TABLE_NAME = 'vinculos_familiares';

export const listarIdososVinculados = async (familiarId: string): Promise<VinculoFamiliar[]> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id_familiar', familiarId)
    .eq('aprovado', true);

  if (error) {
    console.error('Erro ao listar idosos vinculados:', error);
    throw error;
  }

  // Se necessário, buscar informações adicionais dos idosos
  if (data && data.length > 0) {
    const ids = data.map(v => v.id_idoso);
    const { data: idosos } = await supabase
      .from('perfis')
      .select('id, nome, foto_url')
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
    .upsert({
      id_idoso: idIdoso,
      id_familiar: idFamiliar,
      aprovado: false,
      data_solicitacao: new Date().toISOString()
    });

  if (error) {
    console.error('Erro ao solicitar vínculo:', error);
    throw error;
  }

  return true;
};

export const aprovarVinculo = async (idVinculo: string): Promise<VinculoFamiliar> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      aprovado: true,
      data_aprovacao: new Date().toISOString()
    })
    .eq('id', idVinculo)
    .select()
    .single();

  if (error) {
    console.error('Erro ao aprovar vínculo:', error);
    throw error;
  }

  return data as VinculoFamiliar;
};
