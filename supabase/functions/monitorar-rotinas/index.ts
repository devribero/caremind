// Edge function: monitorar-rotinas

// Edge Function: Monitorar Rotinas Não Concluídas
// Roda via Cron Job (agendado no Supabase Dashboard)
// Detecta rotinas que deveriam ter sido concluídas mas não foram
// ATUALIZADO: Agora considera o timezone do perfil do usuário
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret"
};

// Função helper para obter hora atual no timezone especificado
function getCurrentTimeInTimezone(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
  
  return new Date(year, month, day, hour, minute, second);
}

// Função helper para converter horário local (TIME) para UTC considerando timezone
function localTimeToUTC(localTime: string, timezone: string, date: Date): Date {
  const [hora, minuto] = localTime.split(":").map(Number);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  const localDateTimeStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`;
  const tempDate = new Date(`${localDateTimeStr}Z`);
  
  const testDate = new Date();
  const utcTime = testDate.getTime() + (testDate.getTimezoneOffset() * 60000);
  const targetTime = new Date(utcTime + (getTimezoneOffset(timezone, testDate) * 60000));
  const offset = targetTime.getTime() - testDate.getTime();
  
  const localDate = new Date(year, month, day, hora, minuto);
  return new Date(localDate.getTime() - offset);
}

// Função helper para obter offset do timezone em minutos
function getTimezoneOffset(timezone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / (60 * 1000);
}

serve(async (req: Request) => {
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const toleranciaMinutos = 30;
    
    // Buscar todas as rotinas ativas (não concluídas) com timezone do perfil
    const { data: rotinas, error: rotinasError } = await supabaseClient
      .from("rotinas")
      .select(`
        id,
        nome,
        horario,
        dias_semana,
        perfil_id,
        user_id,
        concluida,
        frequencia,
        perfis!inner (
          id,
          timezone
        )
      `)
      .eq("concluida", false);
    
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
    
    // Processar cada rotina
    for (const rotina of rotinas) {
      try {
        const perfil = rotina.perfis;
        const perfilId = perfil?.id || rotina.perfil_id || rotina.user_id;
        const timezone = perfil?.timezone || 'America/Sao_Paulo';
        
        // Extrair horário da frequência JSONB se necessário
        let horarioRotina: string | null = null;
        if (rotina.frequencia && typeof rotina.frequencia === 'object') {
          horarioRotina = (rotina.frequencia as any)?.horario || null;
        }
        if (!horarioRotina && rotina.horario) {
          horarioRotina = rotina.horario;
        }
        
        // Obter hora atual no timezone do perfil
        const agoraLocal = getCurrentTimeInTimezone(timezone);
        const hojeLocal = new Date(agoraLocal.getFullYear(), agoraLocal.getMonth(), agoraLocal.getDate());
        const diaSemanaAtual = agoraLocal.getDay(); // 0 = domingo, 6 = sábado
        
        // Verificar se a rotina deve ser executada hoje (se frequência for semanal)
        if (rotina.frequencia && typeof rotina.frequencia === 'object') {
          const freq = rotina.frequencia as any;
          if (freq.tipo === 'semanal' && freq.dias_da_semana && Array.isArray(freq.dias_da_semana)) {
            if (!freq.dias_da_semana.includes(diaSemanaAtual)) {
              continue; // Rotina não deve ser executada hoje
            }
          }
        } else if (rotina.dias_semana && Array.isArray(rotina.dias_semana)) {
          // Fallback para formato antigo
          if (!rotina.dias_semana.includes(diaSemanaAtual)) {
            continue; // Rotina não deve ser executada hoje
          }
        }
        
        // Parsear horário da rotina
        if (!horarioRotina) {
          continue;
        }
        
        const [hora, minuto] = horarioRotina.split(":").map(Number);
        if (isNaN(hora) || isNaN(minuto)) {
          continue;
        }
        
        // Criar horário local da rotina (no timezone do perfil)
        const horarioRotinaLocal = new Date(
          hojeLocal.getFullYear(),
          hojeLocal.getMonth(),
          hojeLocal.getDate(),
          hora,
          minuto
        );
        
        // Converter horário local para UTC para armazenamento
        const horarioRotinaUTC = localTimeToUTC(horarioRotina, timezone, hojeLocal);
        
        // Se o horário já passou hoje (com tolerância de 30 minutos) no timezone local
        const horarioComTolerancia = new Date(
          horarioRotinaLocal.getTime() + toleranciaMinutos * 60 * 1000
        );
        
        if (agoraLocal > horarioComTolerancia) {
          // Verificar se já existe um alerta de rotina não concluída hoje
          // Usar limites do dia no timezone local, convertidos para UTC
          const dataInicioLocal = new Date(hojeLocal);
          dataInicioLocal.setHours(0, 0, 0, 0);
          const dataFimLocal = new Date(hojeLocal);
          dataFimLocal.setHours(23, 59, 59, 999);
          
          // Converter limites para UTC
          const dataInicioUTC = localTimeToUTC('00:00:00', timezone, hojeLocal);
          const dataFimUTC = localTimeToUTC('23:59:59', timezone, hojeLocal);
          
          const { data: alertaExistente } = await supabaseClient
            .from("historico_eventos")
            .select("id")
            .eq("perfil_id", perfilId)
            .eq("tipo_evento", "rotina_nao_concluida")
            .eq("rotina_id", rotina.id)
            .gte("data_prevista", dataInicioUTC.toISOString())
            .lte("data_prevista", dataFimUTC.toISOString())
            .maybeSingle();
          
          // Se não existe alerta, criar um
          if (!alertaExistente) {
            const { error: insertError } = await supabaseClient
              .from("historico_eventos")
              .insert({
                perfil_id: perfilId,
                tipo_evento: "rotina_nao_concluida",
                data_prevista: horarioRotinaUTC.toISOString(),
                horario_programado: horarioRotinaUTC.toISOString(),
                descricao: `Rotina "${rotina.nome}" não foi concluída no horário ${horarioRotina} (${timezone})`,
                status: 'pendente',
                rotina_id: rotina.id,
                tipo_referencia: "rotina",
                referencia_id: rotina.id.toString()
              });
            
            if (!insertError) {
              alertasGerados.push({
                rotina_id: rotina.id,
                rotina_nome: rotina.nome,
                horario: horarioRotina,
                perfil_id: perfilId,
                timezone: timezone
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
