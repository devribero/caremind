// supabase/functions/alexa-handler/index.ts
// VERSÃO 4: Suporte a múltiplos idosos + Memória de Sessão

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper para resposta da Alexa mantendo atributos de sessão (memória)
function buildAlexaResponse(speechText: string, sessionAttributes: any = {}, shouldEndSession = false) {
  return {
    version: '1.0',
    sessionAttributes: sessionAttributes, // AQUI ESTÁ O SEGREDO: Devolvemos a memória para a Alexa guardar
    response: {
      outputSpeech: { type: 'PlainText', text: speechText },
      shouldEndSession: shouldEndSession
    }
  };
}

console.log('[FUNCTION:START] alexa-handler v4 (Multi-Idoso + Sessão) inicializada');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');

  try {
    const body = await req.json();
    const amazonAccessToken = body.session?.user?.accessToken;
    
    // Recupera a memória da conversa anterior (se houver)
    let sessionAttributes = body.session?.attributes || {};

    const requestId = crypto.randomUUID().slice(0, 8);
    console.log(`\n[${requestId}] ─────── REQUISIÇÃO ALEXA ───────`);
    console.log(`[${requestId}] Request Type: ${body.request?.type}`);
    console.log(`[${requestId}] Intent: ${body.request?.intent?.name || 'N/A'}`);

    if (!amazonAccessToken) {
      console.log(`[${requestId}] ❌ Sem token de acesso`);
      return new Response(
        JSON.stringify(buildAlexaResponse('Por favor, vincule sua conta do Caremind no app Alexa.')),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- 1. IDENTIFICAÇÃO DO CUIDADOR (Só fazemos se não tivermos os perfis em cache) ---
    // Usamos sessionAttributes para evitar chamar a API da Amazon e Banco toda vez
    
    let perfisEncontrados = sessionAttributes.perfis_cache;

    if (!perfisEncontrados) {
      console.log(`[${requestId}] Cache vazio - Buscando perfis...`);
      
      // Passo A: Quem é o usuário Amazon?
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

      // Passo B: Quem é o Cuidador no Supabase?
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

      console.log(`[${requestId}] Supabase User ID: ${integracao.user_id}`);

      // Passo C: Buscar TODOS os idosos vinculados a este cuidador
      const { data: perfis, error: perfisError } = await supabaseAdmin
        .from('perfis')
        .select('id, nome')
        .eq('user_id', integracao.user_id);

      if (perfisError || !perfis || perfis.length === 0) {
        console.log(`[${requestId}] ❌ Nenhum perfil encontrado`);
        return new Response(
          JSON.stringify(buildAlexaResponse('Não encontrei nenhum perfil de idoso cadastrado na sua conta.')),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[${requestId}] ✅ Encontrados ${perfis.length} perfis`);
      perfisEncontrados = perfis;
      // Guardamos na memória para a próxima fala
      sessionAttributes.perfis_cache = perfis;
    } else {
      console.log(`[${requestId}] 📦 Usando cache de perfis (${perfisEncontrados.length} perfis)`);
    }

    // --- 2. LÓGICA DE INTENÇÕES ---
    
    const requestType = body.request.type;
    const intentName = body.request.intent?.name;
    let speechText = 'Não entendi.';
    
    // --> ABERTURA (LaunchRequest)
    if (requestType === 'LaunchRequest') {
      console.log(`[${requestId}] 🚀 LaunchRequest - ${perfisEncontrados.length} perfis`);
      
      if (perfisEncontrados.length === 1) {
        // Caso Simples: Só tem 1 idoso. Seleciona automático.
        sessionAttributes.perfil_atual = perfisEncontrados[0];
        speechText = `Olá. Acessando o perfil de ${perfisEncontrados[0].nome}. O que deseja confirmar?`;
      } else {
        // Caso Múltiplo: Lista os nomes e pergunta.
        const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
        sessionAttributes.aguardando_selecao = true; // Marca que estamos esperando um nome
        speechText = `Olá! Encontrei os perfis de: ${nomes}. Qual deles você quer acessar?`;
      }
      
      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> SELEÇÃO DE PERFIL (Quando o usuário diz um nome)
    if (intentName === 'SelecionarPerfilIntent') {
      const nomeFalado = body.request.intent.slots?.nome?.value;
      console.log(`[${requestId}] 👤 SelecionarPerfilIntent - Nome falado: "${nomeFalado}"`);
      
      if (!nomeFalado) {
        return new Response(
          JSON.stringify(buildAlexaResponse('Não entendi o nome. Pode repetir?', sessionAttributes)),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Tenta achar o nome na lista (busca simples "contém")
      const perfilEscolhido = perfisEncontrados.find((p: any) => 
        p.nome.toLowerCase().includes(nomeFalado.toLowerCase())
      );

      if (perfilEscolhido) {
        sessionAttributes.perfil_atual = perfilEscolhido;
        sessionAttributes.aguardando_selecao = false;
        speechText = `Certo, selecionei ${perfilEscolhido.nome}. Pode falar "já tomei o remédio" para confirmar.`;
        console.log(`[${requestId}] ✅ Perfil selecionado: ${perfilEscolhido.nome}`);
      } else {
        speechText = `Não encontrei um idoso chamado ${nomeFalado}. Tenho: ${perfisEncontrados.map((p: any) => p.nome).join(', ')}. Qual deles?`;
        console.log(`[${requestId}] ❌ Perfil não encontrado: "${nomeFalado}"`);
      }
      
      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> CONFIRMAÇÃO DE EVENTO (O comando principal)
    if (intentName === 'ConfirmarEventoIntent') {
      console.log(`[${requestId}] ✅ ConfirmarEventoIntent`);
      
      // Verifica se já temos um idoso selecionado na memória
      let perfilAtual = sessionAttributes.perfil_atual;

      if (!perfilAtual) {
        // Se o usuário mandou confirmar direto sem escolher antes
        if (perfisEncontrados.length === 1) {
          // Recuperação automática se for único
          sessionAttributes.perfil_atual = perfisEncontrados[0];
          perfilAtual = perfisEncontrados[0];
          console.log(`[${requestId}] Auto-selecionado perfil único: ${perfilAtual.nome}`);
        } else {
          sessionAttributes.aguardando_selecao = true;
          const nomes = perfisEncontrados.map((p: any) => p.nome).join(', ');
          console.log(`[${requestId}] ⚠️ Múltiplos perfis - aguardando seleção`);
          return new Response(
            JSON.stringify(buildAlexaResponse(`Para qual idoso você quer confirmar? Encontrei: ${nomes}.`, sessionAttributes)),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // AGORA SIM, com o ID certo, executamos a ação no banco
      const perfilFinal = perfilAtual || perfisEncontrados[0];
      console.log(`[${requestId}] Buscando eventos pendentes para: ${perfilFinal.nome} (${perfilFinal.id})`);
      
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: evento, error: eventoError } = await supabaseAdmin
        .from('historico_eventos')
        .select('*')
        .eq('perfil_id', perfilFinal.id)
        .eq('status', 'pendente')
        .order('data_prevista', { ascending: true })
        .limit(1)
        .single();

      if (eventoError || !evento) {
        console.log(`[${requestId}] ℹ️ Nenhum evento pendente`);
        speechText = `O perfil de ${perfilFinal.nome} não tem pendências para agora.`;
      } else {
        console.log(`[${requestId}] 📋 Evento encontrado: ${evento.titulo} (${evento.tipo_evento})`);
        
        // Atualiza Estoque se for medicamento
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
            console.log(`[${requestId}] 💊 Estoque atualizado: ${med.quantidade} → ${med.quantidade - 1}`);
          }
        }
        
        // Confirma Evento
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
          speechText = `Confirmado para ${perfilFinal.nome}: ${evento.titulo} marcado como feito.`;
        }
      }
      
      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, sessionAttributes, false)),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --> INTENTS PADRÃO E DEBUG
    if (intentName === 'AMAZON.HelpIntent') {
      console.log(`[${requestId}] ❓ HelpIntent`);
      speechText = 'Você pode selecionar um idoso dizendo o nome dele, ou confirmar um remédio dizendo "já tomei".';
    } 
    else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
      console.log(`[${requestId}] 👋 Stop/CancelIntent`);
      speechText = 'Até mais.';
      return new Response(
        JSON.stringify(buildAlexaResponse(speechText, {}, true)), // Limpa a sessão ao sair
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    else if (intentName === 'AMAZON.FallbackIntent') {
      console.log(`[${requestId}] 🔄 FallbackIntent - Comando não reconhecido pela Alexa`);
      speechText = 'Desculpe, não entendi esse comando. Tente dizer o nome do idoso ou "já tomei".';
    }
    // [DEBUG] Se chegou aqui com "Não entendi", vamos ver o que a Alexa mandou
    else if (speechText === 'Não entendi.') {
      console.log(`[${requestId}] ⚠️ Comando desconhecido recebido:`, intentName);
      console.log(`[${requestId}] Request completo:`, JSON.stringify(body.request, null, 2));
      speechText = `Recebi o comando ${intentName || 'desconhecido'} e não sei o que fazer. Tente "já tomei" ou diga o nome do idoso.`;
    }

    return new Response(
      JSON.stringify(buildAlexaResponse(speechText, sessionAttributes)),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ERRO FATAL]', error);
    return new Response(
      JSON.stringify(buildAlexaResponse('Erro técnico no Caremind.')),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
});
