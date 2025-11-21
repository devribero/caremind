// Edge function: reset-status-diario

// Edge Function: Resetar Status Diário
// Roda via Cron Job diariamente (ex: 00:00)
// Reseta o campo 'concluido' de medicamentos e rotinas para false
// Permite que o ciclo diário recomece
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
    // Resetar status de medicamentos
    const { data: medicamentosResetados, error: medicamentosError } = await supabaseClient.from("medicamentos").update({
      concluido: false
    }).eq("concluido", true).select("id");
    if (medicamentosError) {
      console.error("Erro ao resetar medicamentos:", medicamentosError);
    }
    // Resetar status de rotinas
    const { data: rotinasResetadas, error: rotinasError } = await supabaseClient.from("rotinas").update({
      concluida: false
    }).eq("concluida", true).select("id");
    if (rotinasError) {
      console.error("Erro ao resetar rotinas:", rotinasError);
    }
    const medicamentosCount = medicamentosResetados?.length || 0;
    const rotinasCount = rotinasResetadas?.length || 0;
    return new Response(JSON.stringify({
      message: "Reset diário concluído",
      medicamentos_resetados: medicamentosCount,
      rotinas_resetadas: rotinasCount,
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
