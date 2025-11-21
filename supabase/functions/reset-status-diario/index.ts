// Edge function: reset-status-diario

// Edge Function: Resetar Status Diário
// Roda via Cron Job diariamente (ex: 00:00 UTC)
// Reseta o campo 'concluido' de medicamentos e rotinas para false
// Permite que o ciclo diário recomece
// ATUALIZADO: Agora considera o timezone do perfil ao resetar
// Reseta apenas para perfis onde já é meia-noite no timezone local
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
    
    // Buscar todos os perfis únicos com seus timezones
    const { data: perfis, error: perfisError } = await supabaseClient
      .from("perfis")
      .select("id, timezone")
      .not("timezone", "is", null);
    
    if (perfisError) {
      console.error("Erro ao buscar perfis:", perfisError);
    }
    
    const timezonesMap = new Map<string, string[]>();
    
    // Agrupar perfis por timezone
    if (perfis) {
      for (const perfil of perfis) {
        const tz = perfil.timezone || 'America/Sao_Paulo';
        if (!timezonesMap.has(tz)) {
          timezonesMap.set(tz, []);
        }
        timezonesMap.get(tz)!.push(perfil.id);
      }
    }
    
    let medicamentosResetados = 0;
    let rotinasResetadas = 0;
    const perfisProcessados = new Set<string>();
    
    // Processar cada timezone
    for (const [timezone, perfilIds] of timezonesMap) {
      // Obter hora atual no timezone
      const agoraLocal = getCurrentTimeInTimezone(timezone);
      const horaLocal = agoraLocal.getHours();
      const minutoLocal = agoraLocal.getMinutes();
      
      // Resetar apenas se for meia-noite (00:00) ou próximo (até 00:05) no timezone local
      // Isso garante que o reset acontece no início do dia para cada timezone
      if (horaLocal === 0 && minutoLocal <= 5) {
        console.log(`Resetando status para timezone ${timezone} (${perfilIds.length} perfis)`);
        
        // Resetar medicamentos dos perfis neste timezone
        // Usar perfil_id se disponível, senão usar user_id (compatibilidade durante transição)
        const { data: medicamentos, error: medicamentosError } = await supabaseClient
          .from("medicamentos")
          .update({ concluido: false })
          .or(`perfil_id.in.(${perfilIds.join(',')}),user_id.in.(${perfilIds.join(',')})`)
          .eq("concluido", true)
          .select("id");
        
        if (medicamentosError) {
          console.error(`Erro ao resetar medicamentos para timezone ${timezone}:`, medicamentosError);
        } else {
          medicamentosResetados += medicamentos?.length || 0;
        }
        
        // Resetar rotinas dos perfis neste timezone
        // Usar perfil_id se disponível, senão usar user_id (compatibilidade durante transição)
        const { data: rotinas, error: rotinasError } = await supabaseClient
          .from("rotinas")
          .update({ concluida: false })
          .or(`perfil_id.in.(${perfilIds.join(',')}),user_id.in.(${perfilIds.join(',')})`)
          .eq("concluida", true)
          .select("id");
        
        if (rotinasError) {
          console.error(`Erro ao resetar rotinas para timezone ${timezone}:`, rotinasError);
        } else {
          rotinasResetadas += rotinas?.length || 0;
        }
        
        // Marcar perfis como processados
        perfilIds.forEach(id => perfisProcessados.add(id));
      }
    }
    
    // Resetar também perfis sem timezone definido (usar padrão)
    // Buscar perfis que não foram processados
    const { data: perfisSemTimezone, error: perfisSemTimezoneError } = await supabaseClient
      .from("perfis")
      .select("id")
      .or("timezone.is.null,timezone.eq.America/Sao_Paulo");
    
    if (!perfisSemTimezoneError && perfisSemTimezone) {
      const perfisParaResetar = perfisSemTimezone
        .filter((p: { id: string }) => !perfisProcessados.has(p.id))
        .map((p: { id: string }) => p.id);
      
      if (perfisParaResetar.length > 0) {
        // Usar timezone padrão (America/Sao_Paulo)
        const agoraLocal = getCurrentTimeInTimezone('America/Sao_Paulo');
        const horaLocal = agoraLocal.getHours();
        const minutoLocal = agoraLocal.getMinutes();
        
        if (horaLocal === 0 && minutoLocal <= 5) {
          // Resetar medicamentos
          // Usar perfil_id se disponível, senão usar user_id (compatibilidade durante transição)
          const { data: medicamentos } = await supabaseClient
            .from("medicamentos")
            .update({ concluido: false })
            .or(`perfil_id.in.(${perfisParaResetar.join(',')}),user_id.in.(${perfisParaResetar.join(',')})`)
            .eq("concluido", true)
            .select("id");
          
          medicamentosResetados += medicamentos?.length || 0;
          
          // Resetar rotinas
          // Usar perfil_id se disponível, senão usar user_id (compatibilidade durante transição)
          const { data: rotinas } = await supabaseClient
            .from("rotinas")
            .update({ concluida: false })
            .or(`perfil_id.in.(${perfisParaResetar.join(',')}),user_id.in.(${perfisParaResetar.join(',')})`)
            .eq("concluida", true)
            .select("id");
          
          rotinasResetadas += rotinas?.length || 0;
        }
      }
    }
    
    return new Response(JSON.stringify({
      message: "Reset diário concluído",
      medicamentos_resetados: medicamentosResetados,
      rotinas_resetadas: rotinasResetadas,
      perfis_processados: perfisProcessados.size,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Erro no reset diário:", error);
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
