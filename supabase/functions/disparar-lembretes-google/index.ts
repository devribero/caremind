// supabase/functions/disparar-lembretes-google/index.ts
// Edge Function: Disparar Lembretes para Google Calendar
// Roda via Cron Job (agendado no Supabase Dashboard)
// Cria eventos no Google Calendar para lembretes pendentes
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ CONFIGURAR: Preencha com suas chaves do Google Cloud
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || 'SEU_CLIENT_ID_DO_GOOGLE_AQUI';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || 'SEU_CLIENT_SECRET_DO_GOOGLE_AQUI';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validação de segurança: verificar segredo do cron job
  const cronSecret = Deno.env.get('CRON_JOB_SECRET');
  const providedSecret = req.headers.get('X-Cron-Secret');
  if (cronSecret && providedSecret !== cronSecret) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid cron secret',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar lembretes pendentes
    // A query junta: historico_eventos -> perfis -> user_integrations
    const now = new Date().toISOString();
    const { data: lembretes, error: lembreteError } = await supabaseClient
      .from('historico_eventos')
      .select(`
        id,
        descricao,
        data_prevista,
        perfis (
          user_id,
          user_integrations (
            refresh_token,
            provider
          )
        )
      `)
      .lt('data_prevista', now)
      .eq('lembrete_disparado', false); // Usando coluna 'lembrete_disparado'

    if (lembreteError) throw lembreteError;

    if (!lembretes || lembretes.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'Nenhum lembrete pendente.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Loop para processar cada lembrete
    let processados = 0;
    let erros = 0;

    for (const lembrete of lembretes) {
      try {
        // 3. Achar a integração do Google e o refresh_token
        const profile = lembrete.perfis;
        if (!profile || !profile.user_integrations) continue;

        const googleIntegration = profile.user_integrations.find(
          (integ) => integ.provider === 'google' && integ.refresh_token
        );

        if (!googleIntegration) {
          console.warn('Lembrete sem integração Google válida. ID:', lembrete.id);
          continue; // Pula para o próximo lembrete
        }

        const refreshToken = googleIntegration.refresh_token;

        // 4. Renovar o Access Token
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
          console.warn('Falha ao renovar token para o lembrete ID:', lembrete.id);
          erros++;
          continue;
        }

        const accessToken = tokenData.access_token;

        // 5. Preparar o evento da agenda
        const startTime = new Date(lembrete.data_prevista);
        const endTime = new Date(startTime.getTime() + 5 * 60000); // 5 min de duração

        const event = {
          summary: `Caremind: ${lembrete.descricao || 'Lembrete'}`,
          description: `Lembrete automático do seu assistente Caremind.`,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          reminders: {
            useDefault: false,
            overrides: [
              {
                method: 'popup',
                minutes: 0,
              },
            ],
          },
        };

        // 6. Criar o evento no Google Calendar
        const calendarResponse = await fetch(GOOGLE_CALENDAR_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!calendarResponse.ok) {
          const errorBody = await calendarResponse.json();
          console.error(
            `Falha ao criar evento no Google Calendar para lembrete ${lembrete.id}:`,
            errorBody
          );
          erros++;
          continue;
        }

        // 7. Marcar o lembrete como disparado no banco
        await supabaseClient
          .from('historico_eventos')
          .update({ lembrete_disparado: true })
          .eq('id', lembrete.id);

        processados++;
      } catch (error) {
        console.error(`Erro ao processar lembrete ${lembrete.id}:`, error);
        erros++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processados ${processados} lembretes.`,
        processados,
        erros,
        total: lembretes.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro no disparar-lembretes-google:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

