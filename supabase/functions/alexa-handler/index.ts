// supabase/functions/alexa-handler/index.ts
// VERSÃO ULTIMATE: Interceptação inteligente + Feedback próximo passo + GMT-3

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Palavras que indicam confirmação (não são nomes de pessoas)
const PALAVRAS_CONFIRMACAO = [
  'tomei', 'já tomei', 'pronto', 'feito', 'sim', 'ok', 'confirmado', 
  'confirmar', 'confirma', 'fiz', 'já fiz', 'certo', 'beleza', 'pode', 
  'tá bom', 'ta bom', 'pode confirmar', 'confirmo'
];

/**
 * Verifica se uma frase contém palavras de confirmação
 */
function ehPalavraDeConfirmacao(texto: string): boolean {
  if (!texto) return false;
  const textoLower = texto.toLowerCase().trim();
  return PALAVRAS_CONFIRMACAO.some(p => textoLower.includes(p));
}

/**
 * Calcula o início e fim do dia atual no fuso horário GMT-3 (Brasil)
 * Retorna timestamps em ISO (UTC) para usar nas queries do Supabase
 */
function getHojeGMT3(): { inicioDia: string; fimDia: string; agoraUTC: string } {
  const agora = new Date();
  const offsetGMT3 = 3 * 60 * 60 * 1000;
  const agoraGMT3 = new Date(agora.getTime() - offsetGMT3);
  
  const inicioDiaGMT3 = new Date(Date.UTC(
    agoraGMT3.getUTCFullYear(),
    agoraGMT3.getUTCMonth(),
    agoraGMT3.getUTCDate(),
    0, 0, 0, 0
  ));
  
  const fimDiaGMT3 = new Date(Date.UTC(
    agoraGMT3.getUTCFullYear(),
    agoraGMT3.getUTCMonth(),
    agoraGMT3.getUTCDate(),
    23, 59, 59, 999
  ));
  
  const inicioDiaUTC = new Date(inicioDiaGMT3.getTime() + offsetGMT3);
  const fimDiaUTC = new Date(fimDiaGMT3.getTime() + offsetGMT3);
  
  return {
    inicioDia: inicioDiaUTC.toISOString(),
    fimDia: fimDiaUTC.toISOString(),
    agoraUTC: agora.toISOString()
  };
}

/**
 * Formata hora de um timestamp UTC para exibição em GMT-3
 */
function formatarHoraGMT3(isoString: string): string {
  const data = new Date(isoString);
  const offsetGMT3 = 3 * 60 * 60 * 1000;
  const dataGMT3 = new Date(data.getTime() - offsetGMT3);
  
  const horas = dataGMT3.getUTCHours().toString().padStart(2, '0');
  const minutos = dataGMT3.getUTCMinutes().toString().padStart(2, '0');
  
  return `${horas}:${minutos}`;
}

/**
 * Busca o próximo evento pendente do dia (para feedback encadeado)
 */
async function buscarProximoPendente(
  supabaseClient: SupabaseClient, 
  perfilId: string,
  excluirEventoId?: number
): Promise<{ titulo: string; hora: string } | null> {
  const { inicioDia, fimDia } = getHojeGMT3();
  
  let query = supabaseClient
    .from('historico_eventos')
    .select('id, titulo, data_prevista')
    .eq('perfil_id', perfilId)
    .eq('status', 'pendente')
    .gte('data_prevista', inicioDia)
    .lte('data_prevista', fimDia)
    .order('data_prevista', { ascending: true })
    .limit(1);
  
  if (excluirEventoId) {
    query = query.neq('id', excluirEventoId);
  }
  
  const { data, error } = await query.single();
  
  if (error || !data) return null;
  
  return {
    titulo: data.titulo || 'Tarefa',
    hora: formatarHoraGMT3(data.data_prevista)
  };
}

/**
 * Gera o resumo do dia para um perfil específico
 * Separa atrasados dos futuros para melhor UX
 */
async function gerarResumoDoDia(
  supabaseClient: SupabaseClient, 
  perfilId: string, 
  nome: string
): Promise<string> {
  try {
    const { inicioDia, fimDia, agoraUTC } = getHojeGMT3();
    
    console.log(`[gerarResumoDoDia] Buscando eventos de ${inicioDia} até ${fimDia} para ${nome}`);

    const { data: eventos, error } = await supabaseClient
      .from('historico_eventos')
      .select('id, titulo, status, data_prevista, tipo_evento')
      .eq('perfil_id', perfilId)
      .gte('data_prevista', inicioDia)
      .lte('data_prevista', fimDia)
      .order('data_prevista', { ascending: true });

    if (error) {
      console.error('[gerarResumoDoDia] Erro:', error.message);
      return `Olá ${nome}. Não consegui verificar suas tarefas.`;
    }

    if (!eventos || eventos.length === 0) {
      return `Olá ${nome}. Não há nada agendado para hoje. Aproveite o dia!`;
    }

    const confirmados = eventos.filter((e: any) => e.status === 'confirmado');
    const pendentes = eventos.filter((e: any) => e.status === 'pendente');
    
    // Separa pendentes em atrasados e futuros
    const atrasados = pendentes.filter((e: any) => new Date(e.data_prevista) < new Date(agoraUTC));
    const futuros = pendentes.filter((e: any) => new Date(e.data_prevista) >= new Date(agoraUTC));

    const qtdConfirmados = confirmados.length;
    const qtdAtrasados = atrasados.length;
    const qtdFuturos = futuros.length;

    // Tudo confirmado
    if (pendentes.length === 0 && qtdConfirmados > 0) {
      return `Olá ${nome}. Parabéns! Você completou todas as ${qtdConfirmados} tarefas de hoje!`;
    }

    let resposta = `Olá ${nome}. `;

    // Alerta de atrasados primeiro (prioridade)
    if (qtdAtrasados > 0) {
      const titulosAtrasados = atrasados.slice(0, 2).map((e: any) => e.titulo || 'Tarefa').join(' e ');
      const maisAtrasados = qtdAtrasados > 2 ? ` e mais ${qtdAtrasados - 2}` : '';
      resposta += `Atenção! Você tem ${qtdAtrasados} ${qtdAtrasados === 1 ? 'item atrasado' : 'itens atrasados'}: ${titulosAtrasados}${maisAtrasados}. `;
    }

    // Status geral
    if (qtdConfirmados > 0) {
      resposta += `Já fez ${qtdConfirmados} ${qtdConfirmados === 1 ? 'tarefa' : 'tarefas'}. `;
    }

    // Próximos futuros
    if (qtdFuturos > 0 && qtdAtrasados === 0) {
      const proximo = futuros[0];
      const horaProximo = formatarHoraGMT3(proximo.data_prevista);
      resposta += `O próximo é ${proximo.titulo || 'Tarefa'} às ${horaProximo}.`;
    } else if (qtdFuturos > 0) {
      resposta += `Ainda ${qtdFuturos === 1 ? 'falta' : 'faltam'} ${qtdFuturos} para mais tarde.`;
    }

    return resposta.trim();
  } catch (err) {
    console.error('[gerarResumoDoDia] Erro:', err);
    return `Olá ${nome}. Ocorreu um erro ao buscar suas tarefas.`;
  }
}

/**
 * Executa a lógica de confirmação de evento
 * Suporta confirmação específica (por nome) ou genérica (mais antigo)
 */
async function executarConfirmacao(
  supabaseClient: SupabaseClient,
  perfilAtual: any,
  sessionAttributes: any,
  requestId: string,
  nomeEventoSlot?: string // Slot opcional do nome do evento (ex: "Dipirona")
): Promise<string> {
  const { inicioDia, fimDia, agoraUTC } = getHojeGMT3();
  
  const nomeEvento = nomeEventoSlot?.trim() || '';
  const buscaEspecifica = nomeEvento.length > 0;
  
  console.log(`[${requestId}] Buscando eventos para: ${perfilAtual.nome} ${buscaEspecifica ? `(específico: "${nomeEvento}")` : '(mais antigo)'}`);

  let evento: any = null;
  let eventoError: any = null;

  if (buscaEspecifica) {
    // CENÁRIO A: Usuário falou o nome do evento (ex: "já tomei a Dipirona")
    const { data, error } = await supabaseClient
      .from('historico_eventos')
      .select('*')
      .eq('perfil_id', perfilAtual.id)
      .eq('status', 'pendente')
      .gte('data_prevista', inicioDia)
      .lte('data_prevista', fimDia)
      .ilike('titulo', `%${nomeEvento}%`)
      .order('data_prevista', { ascending: true })
      .limit(1)
      .single();
    
    evento = data;
    eventoError = error;

    // Se não encontrou o evento específico, sugere alternativa
    if (eventoError || !evento) {
      console.log(`[${requestId}] ❌ Evento "${nomeEvento}" não encontrado`);
      
      // Busca o próximo pendente para sugerir
      const proximoDisponivel = await buscarProximoPendente(supabaseClient, perfilAtual.id);
      
      if (proximoDisponivel) {
        return `Não encontrei "${nomeEvento}" pendente para hoje. Você quis dizer ${proximoDisponivel.titulo} das ${proximoDisponivel.hora}?`;
      } else {
        return `Não encontrei "${nomeEvento}" pendente para hoje. Não há mais tarefas pendentes!`;
      }
    }
  } else {
    // CENÁRIO B: Usuário não falou nome (ex: "já tomei") - pega o mais antigo
    const { data, error } = await supabaseClient
      .from('historico_eventos')
      .select('*')
      .eq('perfil_id', perfilAtual.id)
      .eq('status', 'pendente')
      .gte('data_prevista', inicioDia)
      .lte('data_prevista', fimDia)
      .order('data_prevista', { ascending: true })
      .limit(1)
      .single();
    
    evento = data;
    eventoError = error;
  }

  if (eventoError || !evento) {
    console.log(`[${requestId}] ℹ️ Nenhum evento pendente hoje`);
    return `${perfilAtual.nome} não tem nenhuma tarefa pendente para hoje. Parabéns!`;
  }

  const horaEvento = formatarHoraGMT3(evento.data_prevista);
  const ehFuturo = new Date(evento.data_prevista) > new Date(agoraUTC);
  
  console.log(`[${requestId}] 📋 Evento: ${evento.titulo} às ${horaEvento} (${ehFuturo ? 'futuro' : 'atrasado/atual'})`);

  // Se for medicamento, decrementa estoque
  if (evento.tipo_evento === 'medicamento' && evento.evento_id) {
    const { data: med } = await supabaseClient
      .from('medicamentos')
      .select('quantidade')
      .eq('id', evento.evento_id)
      .single();

    if (med && med.quantidade !== null && med.quantidade > 0) {
      await supabaseClient
        .from('medicamentos')
        .update({ quantidade: med.quantidade - 1 })
        .eq('id', evento.evento_id);
      console.log(`[${requestId}] 💊 Estoque: ${med.quantidade} → ${med.quantidade - 1}`);
    }
  }

  // Atualiza status para confirmado
  const { error: updateError } = await supabaseClient
    .from('historico_eventos')
    .update({
      status: 'confirmado',
      horario_programado: new Date().toISOString()
    })
    .eq('id', evento.id);

  if (updateError) {
    console.error(`[${requestId}] ❌ Erro ao confirmar:`, updateError.message);
    return 'Tive um problema ao confirmar. Tente novamente.';
  }

  console.log(`[${requestId}] ✅ Evento confirmado!`);

  // Monta resposta com feedback do próximo passo
  let resposta = `Confirmado! ${evento.titulo} das ${horaEvento} foi marcado.`;

  // Busca próximo pendente para encadeamento
  const proximo = await buscarProximoPendente(supabaseClient, perfilAtual.id, evento.id);
  
  if (proximo) {
    resposta += ` O próximo é ${proximo.titulo} às ${proximo.hora}.`;
  } else {
    resposta += ` Não há mais nada pendente para hoje!`;
  }

  return resposta;
}

function buildAlexaResponse(speechText: string, sessionAttributes: any = {}, shouldEndSession = false) {
  return {
    version: '1.0',
    sessionAttributes: sessionAttributes,
    response: {
      outputSpeech: { type: 'PlainText', text: speechText },
      shouldEndSession: shouldEndSession
    }
  };
}

console.log('[FUNCTION:START] alexa-handler ULTIMATE inicializada');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');

  try {
    const body = await req.json();
    const amazonAccessToken = body.session?.user?.accessToken;
    let sessionAttributes = body.session?.attributes || {};

    const requestId = crypto.randomUUID().slice(0, 8);
    console.log(`\n[${requestId}] ─────── REQUISIÇÃO ALEXA ───────`);
    console.log(`[${requestId}] Request Type: ${body.request?.type}`);
    console.log(`[${requestId}] Intent: ${body.request?.intent?.name || 'N/A'}`);
    console.log(`[${requestId}] Session Attributes:`, JSON.stringify(sessionAttributes));

    if (!amazonAccessToken) {
      return new Response(
        JSON.stringify(buildAlexaResponse('Por favor, vincule sua conta do Caremind no app Alexa.', sessionAttributes)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- 1. IDENTIFICAÇÃO DOS IDOSOS (via vínculos) ---
    let perfisEncontrados = sessionAttributes.perfis_cache;

    if (!perfisEncontrados) {
      console.log(`[${requestId}] Cache vazio - Buscando perfis...`);

      const amazonProfileRes = await fetch("https://api.amazon.com/user/profile", {
        headers: { Authorization: `Bearer ${amazonAccessToken}` }
      });

      if (!amazonProfileRes.ok) {
        console.log(`[${requestId}] ❌ Token Amazon inválido`);
        return new Response(
          JSON.stringify(buildAlexaResponse('Sessão expirada. Revincule a skill.', sessionAttributes)),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      const amazonProfile = await amazonProfileRes.json();
      const amazonUserId = amazonProfile.user_id;
      console.log(`[${requestId}] Amazon User ID: ${amazonUserId.slice(0, 20)}...`);

      const { data: integracao, error: intError } = await supabaseAdmin
        .from('user_integrations')
        .select('user_id')
        .eq('provider', 'amazon_alexa')
        .eq('amazon_user_id', amazonUserId)
        .single();

      if (intError || !integracao) {
        console.log(`[${requestId}] ❌ Integração não encontrada`);
        return new Response(
          JSON.stringify(buildAlexaResponse('Conta Caremind não encontrada. Conecte pelo site.', sessionAttributes)),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      const idCuidador = integracao.user_id;
      console.log(`[${requestId}] ID Cuidador: ${idCuidador}`);

      const { data: vinculos, error: erroVinculos } = await supabaseAdmin
        .from('vinculos_familiares')
        .select('id_idoso')
        .eq('id_familiar', idCuidador);

      if (erroVinculos) {
        console.error(`[${requestId}] ❌ Erro vínculos:`, erroVinculos.message);
      }

      let listaPerfis: any[] = [];

      if (vinculos && vinculos.length > 0) {
        console.log(`[${requestId}] ✅ ${vinculos.length} vínculos encontrados`);
        const idsIdosos = vinculos.map((v: any) => v.id_idoso);

        const { data: dadosIdosos, error: erroPerfis } = await supabaseAdmin
          .from('perfis')
          .select('id, nome')
          .in('id', idsIdosos);

        if (erroPerfis) {
          console.error(`[${requestId}] ❌ Erro perfis:`, erroPerfis.message);
        }

        listaPerfis = dadosIdosos || [];
        console.log(`[${requestId}] Perfis:`, listaPerfis.map(p => p.nome));
      } else {
        console.log(`[${requestId}] ⚠️ Sem vínculos, tentando perfil próprio...`);
        const { data: meuPerfil } = await supabaseAdmin
          .from('perfis')
          .select('id, nome')
          .eq('user_id', idCuidador);

        if (meuPerfil && meuPerfil.length > 0) {
          listaPerfis = meuPerfil;
          console.log(`[${requestId}] ✅ Perfil próprio:`, listaPerfis.map(p => p.nome));
        }
      }

      if (listaPerfis.length === 0) {
        console.log(`[${requestId}] ❌ Nenhum idoso encontrado`);
        return new Response(
          JSON.stringify(buildAlexaResponse('Não encontrei idosos vinculados à sua conta.', sessionAttributes)),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      perfisEncontrados = listaPerfis;
      sessionAttributes.perfis_cache = listaPerfis;
    } else {
      console.log(`[${requestId}] 📦 Cache: ${perfisEncontrados.length} perfis`);
    }

    // --- 2. LÓGICA DE INTENÇÕES ---
    const requestType = body.request.type;
    const intentName = body.request.intent?.name;
    const slotNome = body.request.intent?.slots?.nome?.value || '';
    let speechText = 'Não entendi.';

    // --> ABERTURA (LaunchRequest)
    if (requestType === 'LaunchRequest') {
      console.log(`[${requestId}] 🚀 LaunchRequest - ${perfisEncontrados.length} perfis`);

      if (perfisEncontrados.length === 1) {
        const perfil = perfisEncontrados[0];
        sessionAttributes.perfil_atual = perfil;
        speechText = await gerarResumoDoDia(supabaseAdmin, perfil.id, perfil.nome);
        console.log(`[${requestId}] 📊 Resumo gerado para ${perfil.nome}`);
      } else {
        const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
        sessionAttributes.aguardando_selecao = true;
        speechText = `Olá! Encontrei ${perfisEncontrados.length} perfis: ${nomes}. Qual você quer acessar?`;
      }
      
      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> SELEÇÃO DE PERFIL (com interceptação de confirmação)
    if (intentName === 'SelecionarPerfilIntent') {
      console.log(`[${requestId}] 👤 SelecionarPerfilIntent - Slot: "${slotNome}"`);

      // REDE DE SEGURANÇA: Intercepta palavras de confirmação
      if (ehPalavraDeConfirmacao(slotNome)) {
        console.log(`[${requestId}] 🔄 INTERCEPTADO! "${slotNome}" é confirmação, não nome.`);
        
        // Usa perfil da sessão ou auto-seleciona se só tem 1
        let perfilAtual = sessionAttributes.perfil_atual;
        if (!perfilAtual && perfisEncontrados.length === 1) {
          perfilAtual = perfisEncontrados[0];
          sessionAttributes.perfil_atual = perfilAtual;
          console.log(`[${requestId}] Auto-selecionado: ${perfilAtual.nome}`);
        }

        if (!perfilAtual) {
          const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
          sessionAttributes.aguardando_selecao = true;
          speechText = `Para qual idoso você quer confirmar? ${nomes}.`;
        } else {
          speechText = await executarConfirmacao(supabaseAdmin, perfilAtual, sessionAttributes, requestId);
        }

        return new Response(
          JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fluxo normal: busca perfil pelo nome
      if (!slotNome) {
        return new Response(
          JSON.stringify(buildAlexaResponse('Não entendi o nome. Por favor, repita.', sessionAttributes)),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      const perfilEscolhido = perfisEncontrados.find((p: any) =>
        p.nome.toLowerCase().includes(slotNome.toLowerCase())
      );

      if (perfilEscolhido) {
        sessionAttributes.perfil_atual = perfilEscolhido;
        sessionAttributes.aguardando_selecao = false;
        speechText = await gerarResumoDoDia(supabaseAdmin, perfilEscolhido.id, perfilEscolhido.nome);
        console.log(`[${requestId}] ✅ Perfil selecionado: ${perfilEscolhido.nome}`);
      } else {
        const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
        speechText = `Não encontrei ${slotNome}. Os perfis são: ${nomes}. Qual deles?`;
        console.log(`[${requestId}] ❌ Perfil não encontrado: "${slotNome}"`);
      }

      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> CONFIRMAÇÃO DE EVENTO
    if (intentName === 'ConfirmarEventoIntent') {
      // Extrai o slot nomeEvento (ex: "já tomei a Dipirona" -> "Dipirona")
      const slotNomeEvento = body.request.intent?.slots?.nomeEvento?.value || '';
      console.log(`[${requestId}] ✅ ConfirmarEventoIntent - nomeEvento: "${slotNomeEvento || '(vazio)'}"`);

      // Hierarquia: sessão > auto-seleção > perguntar
      let perfilAtual = sessionAttributes.perfil_atual;
      
      if (!perfilAtual && perfisEncontrados.length === 1) {
        perfilAtual = perfisEncontrados[0];
        sessionAttributes.perfil_atual = perfilAtual;
        console.log(`[${requestId}] Auto-selecionado: ${perfilAtual.nome}`);
      }

      if (!perfilAtual) {
        const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
        sessionAttributes.aguardando_selecao = true;
        console.log(`[${requestId}] ⚠️ Aguardando seleção`);
        return new Response(
          JSON.stringify(buildAlexaResponse(`Para qual idoso? Diga o nome: ${nomes}.`, sessionAttributes)),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Passa o slot nomeEvento para a função de confirmação
      speechText = await executarConfirmacao(supabaseAdmin, perfilAtual, sessionAttributes, requestId, slotNomeEvento);

      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> INTENTS PADRÃO DA AMAZON
    if (intentName === 'AMAZON.HelpIntent') {
      console.log(`[${requestId}] ❓ HelpIntent`);
      speechText = 'Você pode dizer o nome do idoso para ver o resumo, ou dizer "tomei" para confirmar uma tarefa.';
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
      console.log(`[${requestId}] 👋 Stop/Cancel`);
      return new Response(
        JSON.stringify(buildAlexaResponse('Até mais! Cuide-se.', {}, true)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else if (intentName === 'AMAZON.FallbackIntent') {
      console.log(`[${requestId}] 🔄 Fallback`);
      speechText = 'Não entendi. Diga "abrir care mind" ou o nome do idoso.';
    } else if (speechText === 'Não entendi.') {
      console.log(`[${requestId}] ⚠️ Intent desconhecida:`, intentName);
      speechText = 'Não reconheci esse comando. Diga "ajuda" para ver opções.';
    }

    return new Response(
      JSON.stringify(buildAlexaResponse(speechText, sessionAttributes)),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ERRO FATAL]', error);
    return new Response(
      JSON.stringify(buildAlexaResponse('Desculpe, ocorreu um erro. Tente novamente.')),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
});
