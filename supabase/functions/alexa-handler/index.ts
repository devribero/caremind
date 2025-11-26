// supabase/functions/alexa-handler/index.ts
// VERSÃO 6: Resumo do dia + confirmações

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

/**
 * Gera o resumo do dia para um perfil específico
 * Consulta historico_eventos para o dia atual (fuso -03:00)
 */
async function gerarResumoDoDia(supabaseClient: SupabaseClient, perfilId: string): Promise<string> {
  try {
    // Calcula início e fim do dia no fuso horário de Brasília (-03:00)
    const agora = new Date();
    
    // Início do dia em UTC (considerando -03:00)
    const inicioDiaLocal = new Date(agora);
    inicioDiaLocal.setHours(0, 0, 0, 0);
    const inicioDiaUTC = new Date(inicioDiaLocal.getTime() + (3 * 60 * 60 * 1000)); // +3h para compensar -03:00
    
    // Fim do dia em UTC (considerando -03:00)  
    const fimDiaLocal = new Date(agora);
    fimDiaLocal.setHours(23, 59, 59, 999);
    const fimDiaUTC = new Date(fimDiaLocal.getTime() + (3 * 60 * 60 * 1000)); // +3h para compensar -03:00

    // Busca todos os eventos do dia para o perfil
    const { data: eventos, error } = await supabaseClient
      .from('historico_eventos')
      .select('id, titulo, status, data_prevista, tipo_evento')
      .eq('perfil_id', perfilId)
      .gte('data_prevista', inicioDiaUTC.toISOString())
      .lte('data_prevista', fimDiaUTC.toISOString())
      .order('data_prevista', { ascending: true });

    if (error) {
      console.error('[gerarResumoDoDia] Erro ao buscar eventos:', error.message);
      return '';
    }

    // Se não houver eventos hoje
    if (!eventos || eventos.length === 0) {
      return 'Não há nada agendado para hoje.';
    }

    // Conta eventos por status
    const totalEventos = eventos.length;
    const confirmados = eventos.filter((e: any) => e.status === 'confirmado').length;
    const pendentes = eventos.filter((e: any) => e.status === 'pendente').length;

    // Se tudo estiver confirmado
    if (pendentes === 0 && confirmados > 0) {
      const tarefasPalavra = confirmados === 1 ? 'tarefa' : 'tarefas';
      return `Parabéns! Todas as ${confirmados} ${tarefasPalavra} de hoje já foram realizadas.`;
    }

    // Se houver pendências, encontra o próximo evento pendente
    const proximoPendente = eventos.find((e: any) => e.status === 'pendente');
    
    if (proximoPendente) {
      // Formata o horário do próximo evento
      const dataEvento = new Date(proximoPendente.data_prevista);
      const horaLocal = new Date(dataEvento.getTime() - (3 * 60 * 60 * 1000)); // Converte UTC para -03:00
      const horaFormatada = horaLocal.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      const nomeEvento = proximoPendente.titulo || 'Evento';
      const concluidasPalavra = confirmados === 1 ? 'concluída' : 'concluídas';
      const pendentesPalavra = pendentes === 1 ? 'pendente' : 'pendentes';
      
      if (confirmados > 0) {
        return `Resumo para hoje: ${confirmados} ${concluidasPalavra} e ${pendentes} ${pendentesPalavra}. O próximo item é ${nomeEvento} às ${horaFormatada}.`;
      } else {
        return `Resumo para hoje: ${pendentes} ${pendentesPalavra}. O próximo item é ${nomeEvento} às ${horaFormatada}.`;
      }
    }

    // Fallback: apenas mostra contagem
    return `Hoje há ${totalEventos} eventos programados.`;
  } catch (err) {
    console.error('[gerarResumoDoDia] Erro:', err);
    return '';
  }
}

console.log('[FUNCTION:START] alexa-handler v6 (resumo do dia) inicializada');

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

    // --- 1. IDENTIFICAÇÃO DOS IDOSOS ---
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

      // B) Quem é o Familiar/Cuidador no Supabase?
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

      const idFamiliar = integracao.user_id;
      console.log(`[${requestId}] ID Familiar (Supabase): ${idFamiliar}`);

      // C) [CORREÇÃO] Buscar os VÍNCULOS na tabela 'vinculos_familiares'
      console.log(`[${requestId}] Buscando vínculos para familiar: ${idFamiliar}`);

      const { data: vinculos, error: erroVinculos } = await supabaseAdmin
        .from('vinculos_familiares')
        .select('id_idoso')
        .eq('id_familiar', idFamiliar);

      if (erroVinculos) {
        console.error(`[${requestId}] ❌ Erro ao buscar vínculos:`, erroVinculos.message);
      }

      let listaPerfis: any[] = [];

      if (vinculos && vinculos.length > 0) {
        console.log(`[${requestId}] ✅ Encontrados ${vinculos.length} vínculos`);

        // Extrair os IDs dos idosos (ex: [uuid1, uuid2])
        const idsIdosos = vinculos.map((v: any) => v.id_idoso);
        console.log(`[${requestId}] IDs dos idosos:`, idsIdosos);

        // D) Buscar os nomes desses idosos na tabela 'perfis'
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

        // Fallback: Se não tiver vínculos, tenta ver se o próprio usuário tem um perfil
        const { data: meuPerfil } = await supabaseAdmin
          .from('perfis')
          .select('id, nome')
          .eq('user_id', idFamiliar);

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

    // --> ABERTURA
    if (requestType === 'LaunchRequest') {
      console.log(`[${requestId}] 🚀 LaunchRequest - ${perfisEncontrados.length} perfis`);

      if (perfisEncontrados.length === 1) {
        sessionAttributes.perfil_atual = perfisEncontrados[0];
        
        // Gera resumo do dia para o perfil único
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const resumoDia = await gerarResumoDoDia(supabaseAdmin, perfisEncontrados[0].id);
        
        if (resumoDia) {
          speechText = `Olá! Acessando o perfil de ${perfisEncontrados[0].nome}. ${resumoDia} O que deseja fazer?`;
        } else {
          speechText = `Olá! Acessando o perfil de ${perfisEncontrados[0].nome}. O que deseja confirmar?`;
        }
        console.log(`[${requestId}] 📊 Resumo do dia gerado para ${perfisEncontrados[0].nome}`);
      } else {
        const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
        sessionAttributes.aguardando_selecao = true;
        speechText = `Olá! Encontrei: ${nomes}. Qual deles você quer acessar?`;
      }
      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> SELEÇÃO DE PERFIL
    if (intentName === 'SelecionarPerfilIntent') {
      const nomeFalado = body.request.intent.slots?.nome?.value;
      console.log(`[${requestId}] 👤 SelecionarPerfilIntent - Nome: "${nomeFalado}"`);

      if (!nomeFalado) {
        return new Response(
          JSON.stringify(buildAlexaResponse('Não entendi o nome.', sessionAttributes)),
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
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const resumoDia = await gerarResumoDoDia(supabaseAdmin, perfilEscolhido.id);
        
        if (resumoDia) {
          speechText = `Certo, ${perfilEscolhido.nome} selecionado. ${resumoDia}`;
        } else {
          speechText = `Certo, ${perfilEscolhido.nome} selecionado. Pode confirmar dizendo "já tomei".`;
        }
        console.log(`[${requestId}] ✅ Perfil selecionado: ${perfilEscolhido.nome} - Resumo gerado`);
      } else {
        const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
        speechText = `Não achei ${nomeFalado}. Tenho aqui: ${nomes}. Qual deles?`;
        console.log(`[${requestId}] ❌ Perfil não encontrado: "${nomeFalado}"`);
      }

      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> CONFIRMAÇÃO
    if (intentName === 'ConfirmarEventoIntent') {
      console.log(`[${requestId}] ✅ ConfirmarEventoIntent`);

      let perfilAtual = sessionAttributes.perfil_atual;

      // Se não tem perfil selecionado e só tem 1 na lista, seleciona automático
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

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Busca evento pendente para o ID DO IDOSO
      console.log(`[${requestId}] Buscando eventos pendentes para: ${perfilAtual.nome} (${perfilAtual.id})`);

      const { data: evento, error: eventoError } = await supabaseAdmin
        .from('historico_eventos')
        .select('*')
        .eq('perfil_id', perfilAtual.id) // <--- Agora usa o ID do idoso certo
        .eq('status', 'pendente')
        .order('data_prevista', { ascending: true })
        .limit(1)
        .single();

      if (eventoError || !evento) {
        console.log(`[${requestId}] ℹ️ Nenhum evento pendente`);
        speechText = `O perfil de ${perfilAtual.nome} não tem nada pendente agora.`;
      } else {
        console.log(`[${requestId}] 📋 Evento: ${evento.titulo} (${evento.tipo_evento})`);

        // Baixa no estoque se for medicamento
        if (evento.tipo_evento === 'medicamento') {
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

        // Confirma o evento
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
          speechText = `Feito. Marquei ${evento.titulo} como confirmado para ${perfilAtual.nome}.`;
        }
      }

      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // DEBUG & DEFAULT
    if (intentName === 'AMAZON.HelpIntent') {
      console.log(`[${requestId}] ❓ HelpIntent`);
      speechText = 'Diga o nome do idoso ou "já tomei".';
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
      console.log(`[${requestId}] 👋 Stop/CancelIntent`);
      speechText = 'Até mais.';
      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, {}, true)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else if (intentName === 'AMAZON.FallbackIntent') {
      console.log(`[${requestId}] 🔄 FallbackIntent`);
      speechText = 'Não entendi. Tente dizer: "abrir care mind"';
    } else if (speechText === 'Não entendi.') {
      console.log(`[${requestId}] ⚠️ Intent desconhecida:`, intentName);
      speechText = `Recebi "${intentName || 'desconhecido'}" mas não sei o que fazer.`;
    }

    return new Response(
      JSON.stringify(buildAlexaResponse(speechText, sessionAttributes)),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ERRO FATAL]', error);
    return new Response(
      JSON.stringify(buildAlexaResponse('Erro técnico.')),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
});
