import { createClient } from '../client';

type StatusEvento = 'pendente' | 'confirmado' | 'cancelado' | 'atrasado';

export interface HistoricoEvento {
  id: number;
  created_at: string;
  perfil_id: string;
  tipo_evento: string;
  evento_id: number;
  data_prevista: string;
  status: StatusEvento;
  horario_programado: string | null;
  bem_estar_registrado: string | null;
  id_evento_origem: string | null;
  titulo?: string; // Campo opcional que pode vir de views/joins no banco
}

export interface ListarEventosParams {
  perfilId: string;
  dataInicio?: Date;
  dataFim?: Date;
  status?: StatusEvento[];
}

export const listarEventos = async (params: ListarEventosParams): Promise<HistoricoEvento[]> => {
  const { perfilId, dataInicio, dataFim, status } = params;
  const supabase = createClient();
  
  let query = supabase
    .from('historico_eventos')
    .select('*')
    .eq('perfil_id', perfilId);

  if (dataInicio) {
    query = query.gte('data_prevista', dataInicio.toISOString());
  }
  
  if (dataFim) {
    const endOfDay = new Date(dataFim);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte('data_prevista', endOfDay.toISOString());
  }

  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  query = query.order('data_prevista', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao listar eventos:', error);
    throw error;
  }

  return data as HistoricoEvento[];
};

export const listarEventosDoDia = async (perfilId: string, data: Date = new Date()): Promise<HistoricoEvento[]> => {
  const inicioDia = new Date(data);
  inicioDia.setHours(0, 0, 0, 0);
  
  const fimDia = new Date(data);
  fimDia.setHours(23, 59, 59, 999);

  return listarEventos({
    perfilId,
    dataInicio: inicioDia,
    dataFim: fimDia,
    status: ['pendente', 'confirmado']
  });
};

export const atualizarStatusEvento = async (eventoId: number, novoStatus: StatusEvento): Promise<HistoricoEvento> => {
  const supabase = createClient();
  
  // Primeiro, busca o evento para verificar se é medicamento
  const { data: evento, error: eventoError } = await supabase
    .from('historico_eventos')
    .select('tipo_evento, evento_id')
    .eq('id', eventoId)
    .single();

  if (eventoError) {
    console.error('Erro ao buscar evento:', eventoError);
    throw eventoError;
  }

  // Se for medicamento e estiver sendo confirmado, diminui a quantidade
  if (novoStatus === 'confirmado' && evento.tipo_evento === 'medicamento') {
    // Busca o medicamento atual
    const { data: medicamento, error: medError } = await supabase
      .from('medicamentos')
      .select('quantidade')
      .eq('id', evento.evento_id)
      .single();

    if (!medError && medicamento && medicamento.quantidade !== null && medicamento.quantidade > 0) {
      // Diminui a quantidade em 1
      const novaQuantidade = medicamento.quantidade - 1;
      const { error: updateQuantidadeError } = await supabase
        .from('medicamentos')
        .update({ quantidade: novaQuantidade })
        .eq('id', evento.evento_id);

      if (updateQuantidadeError) {
        console.error('Erro ao atualizar quantidade do medicamento:', updateQuantidadeError);
        // Não lança erro aqui, apenas loga, para não impedir a atualização do status
      }
    }
  }

  const atualizacao: Partial<HistoricoEvento> = {
    status: novoStatus,
  };

  if (novoStatus === 'confirmado') {
    atualizacao.horario_programado = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('historico_eventos')
    .update(atualizacao)
    .eq('id', eventoId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar status do evento:', error);
    throw error;
  }

  return data as HistoricoEvento;
};

export const criarEvento = async (evento: Omit<HistoricoEvento, 'id' | 'created_at'>): Promise<HistoricoEvento> => {
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

  return data as HistoricoEvento;
};

/**
 * Cria ou atualiza um evento no histórico. 
 * Se o evento já existe no dia, atualiza o status. Caso contrário, cria um novo.
 */
export const criarOuAtualizarEvento = async (
  perfilId: string,
  tipoEvento: 'medicamento' | 'rotina',
  eventoId: number,
  novoStatus: StatusEvento = 'confirmado',
  dataEvento: Date = new Date()
): Promise<HistoricoEvento> => {
  const supabase = createClient();
  
  // Verifica se já existe um evento hoje para este item
  const inicioDia = new Date(dataEvento);
  inicioDia.setHours(0, 0, 0, 0);
  
  const fimDia = new Date(dataEvento);
  fimDia.setHours(23, 59, 59, 999);

  const { data: eventosExistentes, error: buscaError } = await supabase
    .from('historico_eventos')
    .select('id, tipo_evento, evento_id')
    .eq('tipo_evento', tipoEvento)
    .eq('evento_id', eventoId)
    .eq('perfil_id', perfilId)
    .gte('data_prevista', inicioDia.toISOString())
    .lte('data_prevista', fimDia.toISOString())
    .maybeSingle();

  if (buscaError && buscaError.code !== 'PGRST116') {
    console.error('Erro ao buscar evento existente:', buscaError);
    throw buscaError;
  }

  // Se já existe, atualiza
  if (eventosExistentes) {
    return await atualizarStatusEvento(eventosExistentes.id, novoStatus);
  }

  // Se não existe, cria novo evento
  const novoEvento: Omit<HistoricoEvento, 'id' | 'created_at'> = {
    perfil_id: perfilId,
    tipo_evento: tipoEvento,
    evento_id: eventoId,
    data_prevista: dataEvento.toISOString(),
    status: novoStatus,
    horario_programado: novoStatus === 'confirmado' ? new Date().toISOString() : null,
    bem_estar_registrado: null,
    id_evento_origem: null,
  };

  // Se for medicamento e estiver sendo confirmado, diminui a quantidade
  if (novoStatus === 'confirmado' && tipoEvento === 'medicamento') {
    const { data: medicamento, error: medError } = await supabase
      .from('medicamentos')
      .select('quantidade')
      .eq('id', eventoId)
      .single();

    if (!medError && medicamento && medicamento.quantidade !== null && medicamento.quantidade > 0) {
      const novaQuantidade = medicamento.quantidade - 1;
      const { error: updateQuantidadeError } = await supabase
        .from('medicamentos')
        .update({ quantidade: novaQuantidade })
        .eq('id', eventoId);

      if (updateQuantidadeError) {
        console.error('Erro ao atualizar quantidade do medicamento:', updateQuantidadeError);
        // Não lança erro aqui, apenas loga
      }
    }
  }

  return await criarEvento(novoEvento);
};