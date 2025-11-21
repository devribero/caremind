// Edge function: monitorar-rotinas

// Edge Function: Monitorar Rotinas Não Concluídas
// Roda via Cron Job (agendado no Supabase Dashboard)
// Detecta rotinas que deveriam ter sido concluídas mas não foram
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret"
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  // Validação de segurança: verificar segredo do cron job
  const cronSecret = Deno.env.get("CRON_JOB_SECRET");
  const providedSecret = req.headers.get("X-Cron-Secret");
  if (cronSecret && providedSecret !== cronSecret) {
    return new Response(JSON.stringify({
      error: "Unauthorized: Invalid cron secret"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401
    });
  }
  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const agora = new Date();
    const diaSemanaAtual = agora.getDay(); // 0 = domingo, 6 = sábado
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    // Buscar todas as rotinas ativas (não concluídas)
    const { data: rotinas, error: rotinasError } = await supabaseClient.from("rotinas").select("*").eq("concluida", false);
    if (rotinasError) {
      throw rotinasError;
    }
    if (!rotinas || rotinas.length === 0) {
      return new Response(JSON.stringify({
        message: "Nenhuma rotina pendente encontrada"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    const alertasGerados = [];
    for (const rotina of rotinas){
      try {
        // Verificar se a rotina deve ser executada hoje
        if (rotina.dias_semana && Array.isArray(rotina.dias_semana)) {
          if (!rotina.dias_semana.includes(diaSemanaAtual)) {
            continue; // Rotina não deve ser executada hoje
          }
        }
        // Parsear horário da rotina
        if (!rotina.horario) {
          continue;
        }
        const [hora, minuto] = rotina.horario.split(":").map(Number);
        if (isNaN(hora) || isNaN(minuto)) {
          continue;
        }
        const horarioRotina = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), hora, minuto);
        // Se o horário já passou hoje (com tolerância de 30 minutos)
        const toleranciaMinutos = 30;
        const horarioComTolerancia = new Date(horarioRotina.getTime() + toleranciaMinutos * 60 * 1000);
        if (agora > horarioComTolerancia) {
          // Verificar se já existe um alerta de rotina não concluída hoje
          const dataInicio = new Date(hoje);
          dataInicio.setHours(0, 0, 0, 0);
          const dataFim = new Date(hoje);
          dataFim.setHours(23, 59, 59, 999);
          const { data: alertaExistente } = await supabaseClient.from("historico_eventos").select("id").eq("perfil_id", rotina.user_id).eq("tipo_evento", "rotina_nao_concluida").eq("referencia_id", rotina.id.toString()).eq("tipo_referencia", "rotina").gte("data_hora", dataInicio.toISOString()).lte("data_hora", dataFim.toISOString()).maybeSingle();
          // Se não existe alerta, criar um
          if (!alertaExistente) {
            const { error: insertError } = await supabaseClient.from("historico_eventos").insert({
              perfil_id: rotina.user_id,
              tipo_evento: "rotina_nao_concluida",
              data_hora: horarioRotina.toISOString(),
              descricao: `Rotina "${rotina.nome}" não foi concluída no horário ${rotina.horario}`,
              referencia_id: rotina.id.toString(),
              tipo_referencia: "rotina"
            });
            if (!insertError) {
              alertasGerados.push({
                rotina_id: rotina.id,
                rotina_nome: rotina.nome,
                horario: rotina.horario,
                user_id: rotina.user_id
              });
            }
          }
        }
      } catch (error) {
        console.error(`Erro ao processar rotina ${rotina.id}:`, error);
      // Continua processando outras rotinas
      }
    }
    return new Response(JSON.stringify({
      message: "Monitoramento de rotinas concluído",
      alertas_gerados: alertasGerados.length,
      detalhes: alertasGerados
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Erro no monitoramento de rotinas:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
