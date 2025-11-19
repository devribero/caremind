// supabase/functions/alexa-handler/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- Função Auxiliar para construir a resposta da Alexa ---
// (Modificada para permitir sessões abertas, ex: no 'Help')
function buildAlexaResponse(speechText, shouldEndSession = true) {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: speechText
      },
      shouldEndSession: shouldEndSession
    }
  };
}
console.log('Função "alexa-handler" (Caremind v2) iniciada.');
// --- O Servidor Principal da Função ---
serve(async (req)=>{
  // 1. Tratamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }
  try {
    const body = await req.json();
    // 2. AUTENTICAÇÃO (Account Linking)
    const accessToken = body.session.user.accessToken;
    if (!accessToken) {
      const response = buildAlexaResponse('Você precisa vincular sua conta do Caremind no aplicativo Alexa para usar esta skill.');
      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // 3. Criar o Cliente Supabase AUTENTICADO COMO O USUÁRIO
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });
    // 4. Pegar o ID do usuário (auth.users)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Erro de autenticação:', userError?.message);
      return new Response(JSON.stringify(buildAlexaResponse('Não consegui verificar sua identidade.')), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const userId = user.id; // Este é o ID do auth.users
    // 5. [BUGFIX] Buscar o 'perfil_id' correspondente
    // Precisamos disso porque 'historico_eventos' usa 'perfil_id'.
    const { data: perfil, error: perfilError } = await supabaseClient.from('perfis').select('id').eq('user_id', userId).single();
    if (perfilError || !perfil) {
      console.error(`Erro ao buscar perfil para user_id ${userId}:`, perfilError?.message);
      return new Response(JSON.stringify(buildAlexaResponse('Não consegui encontrar seu perfil Caremind.')), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const perfilId = perfil.id; // Este é o UUID da tabela 'perfis'
    // 6. Lógica da Skill
    const requestType = body.request.type;
    let speechText = 'Desculpe, não entendi o que você disse.';
    // --- Lógica para "Abrir meu caremind" ---
    if (requestType === 'LaunchRequest') {
      speechText = 'Bem-vindo ao Caremind. Você pode me pedir para confirmar um remédio ou rotina.';
      // Mantém a sessão aberta para o usuário responder
      return new Response(JSON.stringify(buildAlexaResponse(speechText, false)), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // --- Lógica para Intents ---
    if (requestType === 'IntentRequest') {
      const intentName = body.request.intent.name;
      console.log(`[Handler] Usuário ${userId} (Perfil ${perfilId}) ativou a intent: ${intentName}`);
      // [BUGFIX] Ouvindo o Intent correto
      if (intentName === 'ConfirmarEventoIntent') {
        // [BUGFIX] Atualizando a tabela 'historico_eventos'
        // Encontra o próximo evento PENDENTE (o mais antigo primeiro) e o atualiza.
        // Primeiro busca o evento para verificar o tipo
        const { data: eventoPendente, error: buscaError } = await supabaseClient
          .from('historico_eventos')
          .select('id, tipo_evento, evento_id, titulo')
          .eq('perfil_id', perfilId)
          .eq('status', 'pendente')
          .order('data_prevista', { ascending: true })
          .limit(1)
          .single();
        
        if (buscaError || !eventoPendente) {
          speechText = 'Obrigado por confirmar, mas não encontrei nenhum evento pendente para marcar agora.';
        } else {
          // Se for medicamento, diminui a quantidade
          if (eventoPendente.tipo_evento === 'medicamento') {
            const { data: medicamento, error: medError } = await supabaseClient
              .from('medicamentos')
              .select('quantidade')
              .eq('id', eventoPendente.evento_id)
              .single();
            
            if (!medError && medicamento && medicamento.quantidade !== null && medicamento.quantidade > 0) {
              const novaQuantidade = medicamento.quantidade - 1;
              const { error: updateQuantidadeError } = await supabaseClient
                .from('medicamentos')
                .update({ quantidade: novaQuantidade })
                .eq('id', eventoPendente.evento_id);
              
              if (updateQuantidadeError) {
                console.error('Erro ao atualizar quantidade do medicamento:', updateQuantidadeError.message);
              }
            }
          }
          
          // Atualiza o status do evento
          const { data: eventoAtualizado, error: updateError } = await supabaseClient
            .from('historico_eventos')
            .update({
              status: 'confirmado',
              horario_programado: new Date().toISOString()
            })
            .eq('id', eventoPendente.id)
            .select('titulo, tipo_evento')
            .single();
          
          if (updateError) {
            console.error('Erro ao atualizar historico_eventos:', updateError.message);
            speechText = 'Tive um problema ao marcar seu evento no Caremind. Tente novamente.';
          } else if (eventoAtualizado) {
            // Graças ao 'titulo' que copiamos, podemos dar uma resposta rica
            const tipo = eventoAtualizado.tipo_evento === 'medicamento' ? 'o remédio' : 'a rotina';
            speechText = `Entendido. Marquei ${tipo} "${eventoAtualizado.titulo}" como concluído. Bom trabalho!`;
          } else {
            speechText = 'Obrigado por confirmar, mas não encontrei nenhum evento pendente para marcar agora.';
          }
        }
      } else if (intentName === 'AMAZON.HelpIntent') {
        speechText = 'Você pode me pedir para confirmar um evento dizendo "Já tomei o remédio" ou "Confirma a minha rotina". O que deseja fazer?';
        return new Response(JSON.stringify(buildAlexaResponse(speechText, false)), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        speechText = 'Até logo!';
      }
    }
    // 7. Enviar a Resposta Final para a Alexa
    const alexaResponse = buildAlexaResponse(speechText);
    return new Response(JSON.stringify(alexaResponse), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Erro inesperado na alexa-handler:', error.message, error.stack);
    const errorResponse = buildAlexaResponse('Ocorreu um erro inesperado no servidor do Caremind.');
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
