// supabase/functions/disparar-emergencia/index.ts
// Edge Function: Disparar Alerta de Emergência
// Envia SMS e faz ligação via Twilio para todos os familiares do idoso
// Também envia notificações push
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ CONFIGURAR: Preencha com suas credenciais do Twilio
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || ''; // Número do Twilio (formato: +5511999999999)
const TWILIO_API_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyRequest {
  idoso_id: string;
  tipo_emergencia?: 'panico' | 'queda' | 'medicamento' | 'outro';
  mensagem?: string;
  localizacao?: {
    latitude?: number;
    longitude?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const { idoso_id, tipo_emergencia = 'panico', mensagem, localizacao }: EmergencyRequest = await req.json();

    if (!idoso_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'idoso_id é obrigatório' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 1. Buscar informações do idoso
    const { data: idoso, error: idosoError } = await supabaseClient
      .from('perfis')
      .select('id, nome, telefone')
      .eq('id', idoso_id)
      .single();

    if (idosoError || !idoso) {
      return new Response(
        JSON.stringify({ success: false, error: 'Idoso não encontrado' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // 2. Buscar TODOS os familiares vinculados ao idoso
    const { data: familiares, error: familiaresError } = await supabaseClient
      .from('relacoes_familiares')
      .select(`
        id,
        perfil_familiar:perfis!relacoes_familiares_perfil_familiar_id_fkey(
          id,
          nome,
          telefone,
          email
        )
      `)
      .eq('perfil_idoso_id', idoso_id)
      .eq('tipo_relacao', 'familiar');

    if (familiaresError) {
      console.error('Erro ao buscar familiares:', familiaresError);
    }

    const familiaresList = familiares?.map((r: any) => r.perfil_familiar).filter(Boolean) || [];

    if (familiaresList.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum familiar cadastrado para este idoso',
          warning: 'Configure pelo menos um familiar no aplicativo'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 3. Preparar mensagem de emergência
    const tipoEmergenciaText = {
      panico: 'PÂNICO',
      queda: 'QUEDA DETECTADA',
      medicamento: 'PROBLEMA COM MEDICAMENTO',
      outro: 'EMERGÊNCIA'
    }[tipo_emergencia] || 'EMERGÊNCIA';

    const mensagemSMS = mensagem || 
      `🚨 ALERTA DE EMERGÊNCIA - ${tipoEmergenciaText}\n\n` +
      `${idoso.nome || 'Idoso'} precisa de ajuda imediata!\n\n` +
      `Tipo: ${tipoEmergenciaText}\n` +
      `Data/Hora: ${new Date().toLocaleString('pt-BR')}\n\n` +
      `Por favor, entre em contato imediatamente!`;

    // 4. Registrar evento de emergência no histórico
    const agora = new Date().toISOString();
    await supabaseClient
      .from('historico_eventos')
      .insert({
        perfil_id: idoso_id,
        tipo_evento: 'emergencia_disparada',
        data_prevista: agora,
        horario_programado: agora,
        descricao: `Alerta de emergência (${tipo_emergencia}) disparado. Familiares notificados: ${familiaresList.length}`,
        status: 'confirmado',
        metadata: {
          tipo_emergencia,
          mensagem,
          localizacao,
          familiares_notificados: familiaresList.length,
        },
      });

    // 5. Enviar SMS e ligação via Twilio para cada familiar
    const resultadosTwilio = [];
    
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
      for (const familiar of familiaresList) {
        const telefone = familiar.telefone;
        
        if (!telefone) {
          console.warn(`Familiar ${familiar.nome} não tem telefone cadastrado`);
          continue;
        }

        // Formatar telefone (garantir formato internacional)
        const telefoneFormatado = telefone.startsWith('+') 
          ? telefone 
          : `+55${telefone.replace(/\D/g, '')}`;

        try {
          // Enviar SMS
          const smsResponse = await fetch(
            `${TWILIO_API_URL}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
              },
              body: new URLSearchParams({
                From: TWILIO_PHONE_NUMBER,
                To: telefoneFormatado,
                Body: mensagemSMS,
              }),
            }
          );

          const smsData = await smsResponse.json();
          
          if (smsResponse.ok) {
            resultadosTwilio.push({
              familiar: familiar.nome,
              telefone: telefoneFormatado,
              sms: 'enviado',
              sms_sid: smsData.sid,
            });

            // Fazer ligação de emergência (opcional - descomente se quiser)
            // const callResponse = await fetch(
            //   `${TWILIO_API_URL}/Calls.json`,
            //   {
            //     method: 'POST',
            //     headers: {
            //       'Content-Type': 'application/x-www-form-urlencoded',
            //       'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            //     },
            //     body: new URLSearchParams({
            //       From: TWILIO_PHONE_NUMBER,
            //       To: telefoneFormatado,
            //       Url: `https://handler.twilio.com/twiml/EH...`, // URL do TwiML para mensagem de voz
            //     }),
            //   }
            // );
          } else {
            console.error(`Erro ao enviar SMS para ${familiar.nome}:`, smsData);
            resultadosTwilio.push({
              familiar: familiar.nome,
              telefone: telefoneFormatado,
              sms: 'erro',
              erro: smsData.message,
            });
          }
        } catch (error) {
          console.error(`Erro ao processar Twilio para ${familiar.nome}:`, error);
          resultadosTwilio.push({
            familiar: familiar.nome,
            telefone: telefoneFormatado,
            sms: 'erro',
            erro: error.message,
          });
        }
      }
    } else {
      console.warn('⚠️ Twilio não configurado. SMS não será enviado.');
    }

    // 6. Enviar notificações push para familiares
    const resultadosPush = [];
    
    for (const familiar of familiaresList) {
      try {
        // Buscar tokens FCM do familiar
        const { data: tokens } = await supabaseClient
          .from('fcm_tokens')
          .select('token')
          .eq('perfil_id', familiar.id)
          .eq('ativo', true);

        if (tokens && tokens.length > 0) {
          // Chamar função de push notification
          const pushResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/enviar-push-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                tokens: tokens.map((t: any) => t.token),
                title: `🚨 EMERGÊNCIA - ${idoso.nome || 'Idoso'}`,
                body: mensagemSMS.substring(0, 200), // Limitar tamanho
                data: {
                  tipo: 'emergencia',
                  idoso_id: idoso_id,
                  tipo_emergencia: tipo_emergencia,
                },
              }),
            }
          );

          if (pushResponse.ok) {
            resultadosPush.push({
              familiar: familiar.nome,
              push: 'enviado',
            });
          }
        }
      } catch (error) {
        console.error(`Erro ao enviar push para ${familiar.nome}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Alerta de emergência disparado com sucesso',
        idoso: {
          id: idoso.id,
          nome: idoso.nome,
        },
        familiares_notificados: familiaresList.length,
        resultados_twilio: resultadosTwilio,
        resultados_push: resultadosPush,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro ao processar emergência:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno ao processar emergência',
        details: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

