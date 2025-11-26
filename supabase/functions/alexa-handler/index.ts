// supabase/functions/alexa-handler/index.ts
// VERSÃO 7: Resumo do dia com fuso horário GMT-3 robusto

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Calcula o início e fim do dia atual no fuso horário GMT-3 (Brasil)
 * Retorna timestamps em ISO (UTC) para usar nas queries do Supabase
 */
function getHojeGMT3(): { inicioDia: string; fimDia: string } {
  const agora = new Date();
  
  // Offset GMT-3 em milissegundos (3 horas = 3 * 60 * 60 * 1000)
  const offsetGMT3 = 3 * 60 * 60 * 1000;
  
  // Hora atual em GMT-3
  const agoraGMT3 = new Date(agora.getTime() - offsetGMT3);
  
  // Início do dia em GMT-3 (00:00:00.000)
  const inicioDiaGMT3 = new Date(Date.UTC(
    agoraGMT3.getUTCFullYear(),
    agoraGMT3.getUTCMonth(),
    agoraGMT3.getUTCDate(),
    0, 0, 0, 0
  ));
  
  // Fim do dia em GMT-3 (23:59:59.999)
  const fimDiaGMT3 = new Date(Date.UTC(
    agoraGMT3.getUTCFullYear(),
    agoraGMT3.getUTCMonth(),
    agoraGMT3.getUTCDate(),
    23, 59, 59, 999
  ));
  
  // Converte de volta para UTC (adiciona o offset de 3 horas)
  const inicioDiaUTC = new Date(inicioDiaGMT3.getTime() + offsetGMT3);
  const fimDiaUTC = new Date(fimDiaGMT3.getTime() + offsetGMT3);
  
  return {
    inicioDia: inicioDiaUTC.toISOString(),
    fimDia: fimDiaUTC.toISOString()
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
 * Gera o resumo do dia para um perfil específico
 * Consulta historico_eventos para o dia atual (GMT-3)
 */
async function gerarResumoDoDia(
  supabaseClient: SupabaseClient, 
  perfilId: string, 
  nome: string
): Promise<string> {
  try {
    const { inicioDia, fimDia } = getHojeGMT3();
    
    console.log(`[gerarResumoDoDia] Buscando eventos de ${inicioDia} até ${fimDia} para ${nome}`);

    // Busca todos os eventos do dia para o perfil
    const { data: eventos, error } = await supabaseClient
      .from('historico_eventos')
      .select('id, titulo, status, data_prevista, tipo_evento')
      .eq('perfil_id', perfilId)
      .gte('data_prevista', inicioDia)
      .lte('data_prevista', fimDia)
      .order('data_prevista', { ascending: true });

    if (error) {
      console.error('[gerarResumoDoDia] Erro ao buscar eventos:', error.message);
      return `Olá ${nome}. Não consegui verificar suas tarefas de hoje.`;
    }

    // Se não houver eventos hoje
    if (!eventos || eventos.length === 0) {
      return `Olá ${nome}. Não há nada agendado para hoje.`;
    }

    // Separa eventos por status
    const confirmados = eventos.filter((e: any) => e.status === 'confirmado');
    const pendentes = eventos.filter((e: any) => e.status === 'pendente');
    
    const qtdConfirmados = confirmados.length;
    const qtdPendentes = pendentes.length;

    // Se tudo estiver confirmado
    if (qtdPendentes === 0 && qtdConfirmados > 0) {
      const tarefasPalavra = qtdConfirmados === 1 ? 'tarefa' : 'tarefas';
      return `Olá ${nome}. Parabéns! Você já completou todas as ${qtdConfirmados} ${tarefasPalavra} de hoje.`;
    }

    // Se houver pendências
    if (qtdPendentes > 0) {
      // Lista os títulos dos pendentes (máximo 3 para não ficar muito longo)
      const titulosPendentes = pendentes
        .slice(0, 3)
        .map((e: any) => e.titulo || 'Tarefa')
        .join(', ');
      
      const maisItens = qtdPendentes > 3 ? ` e mais ${qtdPendentes - 3}` : '';
      
      if (qtdConfirmados > 0) {
        const feitasPalavra = qtdConfirmados === 1 ? 'feita' : 'feitas';
        const faltamPalavra = qtdPendentes === 1 ? 'falta' : 'faltam';
        return `Olá ${nome}. Você já fez ${qtdConfirmados} ${feitasPalavra} hoje, mas ainda ${faltamPalavra} ${qtdPendentes}: ${titulosPendentes}${maisItens}.`;
      } else {
        const faltamPalavra = qtdPendentes === 1 ? 'falta' : 'faltam';
        const tarefaPalavra = qtdPendentes === 1 ? 'tarefa' : 'tarefas';
        return `Olá ${nome}. Ainda ${faltamPalavra} ${qtdPendentes} ${tarefaPalavra} para hoje: ${titulosPendentes}${maisItens}.`;
      }
    }

    // Fallback
    return `Olá ${nome}. Hoje há ${eventos.length} eventos programados.`;
  } catch (err) {
    console.error('[gerarResumoDoDia] Erro:', err);
    return `Olá ${nome}. Ocorreu um erro ao buscar suas tarefas.`;
  }
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

console.log('[FUNCTION:START] alexa-handler v7 (GMT-3 robusto) inicializada');

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

    if (!amazonAccessToken) {
      return new Response(
        JSON.stringify(buildAlexaResponse('Por favor, vincule sua conta do Caremind no app Alexa.')),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- 1. IDENTIFICAÇÃO DOS IDOSOS (via vínculos) ---
    let perfisEncontrados = sessionAttributes.perfis_cache;

    if (!perfisEncontrados) {
      console.log(`[${requestId}] Cache vazio - Buscando perfis...`);

      // A) Quem é o usuário Amazon?
      const amazonProfileRes = await fetch("https://api.amazon.com/user/profile", {
        headers: { Authorization: `Bearer ${amazonAccessToken}` }
      });

      if (!amazonProfileRes.ok) {
        console.log(`[${requestId}] ❌ Token Amazon inválido`);
        return new Response(
          JSON.stringify(buildAlexaResponse('Sessão expirada. Revincule a skill.')),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      const amazonProfile = await amazonProfileRes.json();
      const amazonUserId = amazonProfile.user_id;
      console.log(`[${requestId}] Amazon User ID: ${amazonUserId.slice(0, 20)}...`);

      // B) Busca o user_id do Cuidador na tabela user_integrations
      const { data: integracao, error: intError } = await supabaseAdmin
        .from('user_integrations')
        .select('user_id')
        .eq('provider', 'amazon_alexa')
        .eq('amazon_user_id', amazonUserId)
        .single();

      if (intError || !integracao) {
        console.log(`[${requestId}] ❌ Integração não encontrada`);
        return new Response(
          JSON.stringify(buildAlexaResponse('Conta Caremind não encontrada. Conecte pelo site.')),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      const idCuidador = integracao.user_id;
      console.log(`[${requestId}] ID Cuidador (Supabase): ${idCuidador}`);

      // C) Busca os vínculos na tabela vinculos_familiares (id_familiar -> id_idoso)
      console.log(`[${requestId}] Buscando vínculos para cuidador: ${idCuidador}`);

      const { data: vinculos, error: erroVinculos } = await supabaseAdmin
        .from('vinculos_familiares')
        .select('id_idoso')
        .eq('id_familiar', idCuidador);

      if (erroVinculos) {
        console.error(`[${requestId}] ❌ Erro ao buscar vínculos:`, erroVinculos.message);
      }

      let listaPerfis: any[] = [];

      if (vinculos && vinculos.length > 0) {
        console.log(`[${requestId}] ✅ Encontrados ${vinculos.length} vínculos`);

        // Extrai os IDs dos idosos
        const idsIdosos = vinculos.map((v: any) => v.id_idoso);
        console.log(`[${requestId}] IDs dos idosos:`, idsIdosos);

        // D) Busca os nomes na tabela perfis
        const { data: dadosIdosos, error: erroPerfis } = await supabaseAdmin
          .from('perfis')
          .select('id, nome')
          .in('id', idsIdosos);

        if (erroPerfis) {
          console.error(`[${requestId}] ❌ Erro ao buscar perfis:`, erroPerfis.message);
        }

        listaPerfis = dadosIdosos || [];
        console.log(`[${requestId}] Perfis encontrados:`, listaPerfis.map(p => p.nome));
      } else {
        console.log(`[${requestId}] ⚠️ Nenhum vínculo encontrado, tentando perfil próprio...`);

        // Fallback: tenta ver se o próprio usuário tem um perfil
        const { data: meuPerfil } = await supabaseAdmin
          .from('perfis')
          .select('id, nome')
          .eq('user_id', idCuidador);

        if (meuPerfil && meuPerfil.length > 0) {
          listaPerfis = meuPerfil;
          console.log(`[${requestId}] ✅ Perfil próprio encontrado:`, listaPerfis.map(p => p.nome));
        }
      }

      if (listaPerfis.length === 0) {
        console.log(`[${requestId}] ❌ Nenhum idoso encontrado`);
        return new Response(
          JSON.stringify(buildAlexaResponse('Não encontrei idosos vinculados à sua conta.')),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      perfisEncontrados = listaPerfis;
      sessionAttributes.perfis_cache = listaPerfis;
    } else {
      console.log(`[${requestId}] 📦 Usando cache (${perfisEncontrados.length} perfis)`);
    }

    // --- 2. LÓGICA DE INTENÇÕES ---

    const requestType = body.request.type;
    const intentName = body.request.intent?.name;
    let speechText = 'Não entendi.';

    // --> ABERTURA (LaunchRequest)
    if (requestType === 'LaunchRequest') {
      console.log(`[${requestId}] 🚀 LaunchRequest - ${perfisEncontrados.length} perfis`);

      if (perfisEncontrados.length === 1) {
        // Seleciona automaticamente o único perfil
        const perfil = perfisEncontrados[0];
        sessionAttributes.perfil_atual = perfil;
        
        // Gera resumo do dia
        speechText = await gerarResumoDoDia(supabaseAdmin, perfil.id, perfil.nome);
        console.log(`[${requestId}] 📊 Resumo gerado para ${perfil.nome}`);
      } else {
        // Lista os nomes para o usuário escolher
        const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
        sessionAttributes.aguardando_selecao = true;
        speechText = `Olá! Encontrei ${perfisEncontrados.length} perfis: ${nomes}. Qual deles você quer acessar?`;
      }
      
      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> SELEÇÃO DE PERFIL (SelecionarPerfilIntent)
    if (intentName === 'SelecionarPerfilIntent') {
      const nomeFalado = body.request.intent.slots?.nome?.value;
      console.log(`[${requestId}] 👤 SelecionarPerfilIntent - Nome: "${nomeFalado}"`);

      if (!nomeFalado) {
        return new Response(
          JSON.stringify(buildAlexaResponse('Não entendi o nome. Por favor, repita.', sessionAttributes)),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      const perfilEscolhido = perfisEncontrados.find((p: any) =>
        p.nome.toLowerCase().includes(nomeFalado.toLowerCase())
      );

      if (perfilEscolhido) {
        sessionAttributes.perfil_atual = perfilEscolhido;
        sessionAttributes.aguardando_selecao = false;
        
        // Gera resumo do dia para o perfil selecionado
        speechText = await gerarResumoDoDia(supabaseAdmin, perfilEscolhido.id, perfilEscolhido.nome);
        console.log(`[${requestId}] ✅ Perfil selecionado: ${perfilEscolhido.nome} - Resumo gerado`);
      } else {
        const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
        speechText = `Não encontrei ${nomeFalado}. Os perfis disponíveis são: ${nomes}. Qual deles?`;
        console.log(`[${requestId}] ❌ Perfil não encontrado: "${nomeFalado}"`);
      }

      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> CONFIRMAÇÃO DE EVENTO (ConfirmarEventoIntent)
    if (intentName === 'ConfirmarEventoIntent') {
      console.log(`[${requestId}] ✅ ConfirmarEventoIntent`);

      let perfilAtual = sessionAttributes.perfil_atual;

      // Auto-seleção se só tem 1 perfil
      if (!perfilAtual && perfisEncontrados.length === 1) {
        perfilAtual = perfisEncontrados[0];
        sessionAttributes.perfil_atual = perfilAtual;
        console.log(`[${requestId}] Auto-selecionado: ${perfilAtual.nome}`);
      }

      if (!perfilAtual) {
        sessionAttributes.aguardando_selecao = true;
        const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
        console.log(`[${requestId}] ⚠️ Aguardando seleção de perfil`);
        return new Response(
          JSON.stringify(buildAlexaResponse(`Para qual idoso? Diga o nome: ${nomes}.`, sessionAttributes)),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Busca o evento pendente mais antigo de HOJE (GMT-3)
      const { inicioDia, fimDia } = getHojeGMT3();
      console.log(`[${requestId}] Buscando eventos pendentes de HOJE (${inicioDia} a ${fimDia}) para: ${perfilAtual.nome}`);

      const { data: evento, error: eventoError } = await supabaseAdmin
        .from('historico_eventos')
        .select('*')
        .eq('perfil_id', perfilAtual.id)
        .eq('status', 'pendente')
        .gte('data_prevista', inicioDia)
        .lte('data_prevista', fimDia)
        .order('data_prevista', { ascending: true })
        .limit(1)
        .single();

      if (eventoError || !evento) {
        console.log(`[${requestId}] ℹ️ Nenhum evento pendente hoje`);
        speechText = `${perfilAtual.nome} não tem nenhuma tarefa pendente para hoje. Parabéns!`;
      } else {
        console.log(`[${requestId}] 📋 Evento encontrado: ${evento.titulo} (${evento.tipo_evento})`);

        // Se for medicamento, decrementa o estoque
        if (evento.tipo_evento === 'medicamento' && evento.evento_id) {
          const { data: med } = await supabaseAdmin
            .from('medicamentos')
            .select('quantidade')
            .eq('id', evento.evento_id)
            .single();

          if (med && med.quantidade !== null && med.quantidade > 0) {
            await supabaseAdmin
              .from('medicamentos')
              .update({ quantidade: med.quantidade - 1 })
              .eq('id', evento.evento_id);
            console.log(`[${requestId}] 💊 Estoque: ${med.quantidade} → ${med.quantidade - 1}`);
          }
        }

        // Atualiza status para confirmado
        const { error: updateError } = await supabaseAdmin
          .from('historico_eventos')
          .update({
            status: 'confirmado',
            horario_programado: new Date().toISOString()
          })
          .eq('id', evento.id);

        if (updateError) {
          console.error(`[${requestId}] ❌ Erro ao confirmar:`, updateError.message);
          speechText = 'Tive um problema ao confirmar. Tente novamente.';
        } else {
          console.log(`[${requestId}] ✅ Evento confirmado!`);
          const horaEvento = formatarHoraGMT3(evento.data_prevista);
          speechText = `Pronto! Marquei "${evento.titulo}" das ${horaEvento} como confirmado para ${perfilAtual.nome}.`;
        }
      }

      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> INTENTS PADRÃO DA AMAZON
    if (intentName === 'AMAZON.HelpIntent') {
      console.log(`[${requestId}] ❓ HelpIntent`);
      speechText = 'Você pode dizer o nome do idoso para ver o resumo do dia, ou dizer "já tomei" para confirmar uma tarefa.';
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
      console.log(`[${requestId}] 👋 Stop/CancelIntent`);
      speechText = 'Até mais! Cuide-se.';
      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, {}, true)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else if (intentName === 'AMAZON.FallbackIntent') {
      console.log(`[${requestId}] 🔄 FallbackIntent`);
      speechText = 'Não entendi. Tente dizer "abrir care mind" ou o nome do idoso.';
    } else if (speechText === 'Não entendi.') {
      console.log(`[${requestId}] ⚠️ Intent desconhecida:`, intentName);
      speechText = 'Não reconheci esse comando. Diga "ajuda" para ver o que posso fazer.';
    }

    return new Response(
      JSON.stringify(buildAlexaResponse(speechText, sessionAttributes)),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ERRO FATAL]', error);
    return new Response(
      JSON.stringify(buildAlexaResponse('Desculpe, ocorreu um erro técnico. Tente novamente.')),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
});

