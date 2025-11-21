// Edge function: monitorar-medicamentos

// Edge Function: Monitorar Medicamentos Atrasados
// Roda via Cron Job (agendado no Supabase Dashboard)
// Detecta medicamentos que deveriam ter sido tomados mas não foram
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
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    // Buscar todos os medicamentos ativos (não concluídos)
    const { data: medicamentos, error: medicamentosError } = await supabaseClient.from("medicamentos").select("*").eq("concluido", false);
    if (medicamentosError) {
      throw medicamentosError;
    }
    if (!medicamentos || medicamentos.length === 0) {
      return new Response(JSON.stringify({
        message: "Nenhum medicamento pendente encontrado"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    const alertasGerados = [];
    for (const medicamento of medicamentos){
      try {
        // Extrair horários da frequência
        const horarios = extrairHorarios(medicamento.frequencia);
        if (horarios.length === 0) {
          continue;
        }
        // Verificar cada horário
        for (const horario of horarios){
          const [hora, minuto] = horario.split(":").map(Number);
          const horarioMedicamento = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), hora, minuto);
          // Se o horário já passou hoje (com tolerância de 15 minutos)
          const toleranciaMinutos = 15;
          const horarioComTolerancia = new Date(horarioMedicamento.getTime() + toleranciaMinutos * 60 * 1000);
          if (agora > horarioComTolerancia) {
            // Verificar se já existe um alerta de atraso hoje para este medicamento neste horário
            const dataInicio = new Date(hoje);
            dataInicio.setHours(0, 0, 0, 0);
            const dataFim = new Date(hoje);
            dataFim.setHours(23, 59, 59, 999);
            const { data: alertaExistente } = await supabaseClient.from("historico_eventos").select("id").eq("perfil_id", medicamento.user_id).eq("tipo_evento", "medicamento_atrasado").eq("referencia_id", medicamento.id.toString()).eq("tipo_referencia", "medicamento").gte("data_hora", dataInicio.toISOString()).lte("data_hora", dataFim.toISOString()).maybeSingle();
            // Se não existe alerta, criar um
            if (!alertaExistente) {
              const { error: insertError } = await supabaseClient.from("historico_eventos").insert({
                perfil_id: medicamento.user_id,
                tipo_evento: "medicamento_atrasado",
                data_hora: horarioMedicamento.toISOString(),
                descricao: `Medicamento "${medicamento.nome}" não foi tomado no horário ${horario}`,
                referencia_id: medicamento.id.toString(),
                tipo_referencia: "medicamento"
              });
              if (!insertError) {
                alertasGerados.push({
                  medicamento_id: medicamento.id,
                  medicamento_nome: medicamento.nome,
                  horario: horario,
                  user_id: medicamento.user_id
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Erro ao processar medicamento ${medicamento.id}:`, error);
      // Continua processando outros medicamentos
      }
    }
    return new Response(JSON.stringify({
      message: "Monitoramento concluído",
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
    console.error("Erro no monitoramento:", error);
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
// Função auxiliar para extrair horários da frequência
function extrairHorarios(frequencia) {
  const horarios = [];
  if (!frequencia || typeof frequencia !== "object") {
    return horarios;
  }
  // Caso 1: Horários explícitos
  if (frequencia.horarios && Array.isArray(frequencia.horarios)) {
    return frequencia.horarios.map((h)=>{
      if (typeof h === "string") {
        return h;
      }
      return String(h);
    });
  }
  // Caso 2: Frequência diária com vezes_por_dia
  if (frequencia.tipo === "diario" && frequencia.vezes_por_dia) {
    const vezesPorDia = Number(frequencia.vezes_por_dia) || 1;
    const horariosPadrao = [
      "08:00",
      "14:00",
      "20:00"
    ];
    return horariosPadrao.slice(0, vezesPorDia);
  }
  return horarios;
}
