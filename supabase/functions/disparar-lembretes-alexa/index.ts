// supabase/functions/disparar-lembretes-alexa/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// === Constantes de Ambiente ===
const LWA_CLIENT_ID = Deno.env.get('LWA_CLIENT_ID');
const LWA_CLIENT_SECRET = Deno.env.get('LWA_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Endpoint da API de Lembretes da Alexa (para a região US/Global)
const ALEXA_API_ENDPOINT = 'https://api.amazonalexa.com/v1/alerts/reminders';
// Função para obter um novo Access Token usando o Refresh Token
async function getNewAccessToken(refreshToken) {
  console.log('[AUTH] Solicitando novo access_token usando o refresh_token...');
  const tokenRes = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: LWA_CLIENT_ID,
      client_secret: LWA_CLIENT_SECRET
    })
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Falha ao renovar token: ${tokens.error_description || tokens.error}`);
  }
  console.log('[AUTH] Novo access_token obtido com sucesso.');
  return tokens; // Contém access_token, refresh_token, expires_in
}
// === Servidor Principal da Função ===
serve(async (req)=>{
  // Validação de segurança: verificar segredo do cron job
  const cronSecret = Deno.env.get("CRON_JOB_SECRET");
  const providedSecret = req.headers.get("X-Cron-Secret");
  if (cronSecret && providedSecret !== cronSecret) {
    return new Response(JSON.stringify({
      success: false,
      error: "Unauthorized: Invalid cron secret"
    }), {
      headers: { "Content-Type": "application/json" },
      status: 401
    });
  }
  try {
    const { evento_id } = await req.json();
    if (!evento_id) {
      throw new Error('evento_id é obrigatório');
    }
    console.log(`[JOB] Processando evento: ${evento_id}`);
    // Criamos um cliente Admin para bypassar RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // 1. Buscar o evento e o perfil_id associado
    const { data: evento, error: eventoError } = await supabaseAdmin
      .from('historico_eventos')
      .select('perfil_id, titulo, data_prevista, perfis!inner(user_id)')
      .eq('id', evento_id)
      .single();
    if (eventoError) throw new Error(`Evento não encontrado: ${eventoError.message}`);
    const { perfil_id, titulo, data_prevista, perfis } = evento;
    const user_id = perfis?.user_id;
    if (!user_id) {
      throw new Error(`Perfil não encontrado para o evento ${evento_id}`);
    }
    // 2. Buscar o refresh_token do usuário
    const { data: integracao, error: intError } = await supabaseAdmin
      .from('user_integrations')
      .select('refresh_token, id')
      .eq('user_id', user_id)
      .eq('provider', 'amazon_alexa')
      .single();
    if (intError || !integracao?.refresh_token) {
      throw new Error(`Integração Alexa não encontrada ou sem refresh_token para o usuário ${user_id}`);
    }
    // 3. Obter um novo Access Token
    const novosTokens = await getNewAccessToken(integracao.refresh_token);
    const { access_token, refresh_token: novo_refresh_token, expires_in } = novosTokens;
    // 4. (IMPORTANTE) Atualizar os tokens no banco de dados
    // A Amazon pode nos dar um novo refresh_token
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    await supabaseAdmin.from('user_integrations').update({
      access_token: access_token,
      refresh_token: novo_refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    }).eq('id', integracao.id);
    // 5. Construir o Lembrete (Reminder Payload)
    const lembretePayload = {
      requestTime: new Date().toISOString(),
      trigger: {
        type: 'SCHEDULED_ABSOLUTE',
        scheduledTime: new Date(data_prevista).toISOString()
      },
      alertInfo: {
        spokenInfo: {
          content: [
            {
              locale: 'pt-BR',
              text: `Aviso do Caremind: Está na hora de ${titulo}.`,
              ssml: `<speak>Aviso do Caremind: Está na hora de ${titulo}.</speak>`
            }
          ]
        }
      },
      pushNotification: {
        status: 'ENABLED'
      }
    };
    // 6. Criar o Lembrete na API da Alexa
    console.log(`[ALEXA] Criando lembrete para: ${titulo} às ${data_prevista}`);
    const alexaRes = await fetch(ALEXA_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lembretePayload)
    });
    if (!alexaRes.ok) {
      const errorBody = await alexaRes.json();
      throw new Error(`Falha ao criar lembrete na API da Alexa: ${errorBody.message || JSON.stringify(errorBody)}`);
    }
    const reminderResult = await alexaRes.json();
    console.log('[ALEXA] Lembrete criado com sucesso:', reminderResult.alertToken);
    return new Response(JSON.stringify({
      success: true,
      message: 'Lembrete criado com sucesso',
      alertToken: reminderResult.alertToken
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (err) {
    console.error('[ERRO FATAL] disparar-lembretes-alexa:', err.message);
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
