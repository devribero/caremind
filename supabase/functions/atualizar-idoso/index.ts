import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Variáveis de ambiente do Supabase não configuradas.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autorização não fornecido." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUserClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { idosoId, nome, telefone, data_nascimento, foto_usuario } = await req.json();

    if (!idosoId || !nome?.trim()) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos. Informe idosoId e nome." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: perfilFamiliar, error: perfilError } = await adminClient
      .from("perfis")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (perfilError || !perfilFamiliar) {
      return new Response(
        JSON.stringify({ error: "Perfil do familiar não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: vinculo, error: vinculoError } = await adminClient
      .from("vinculos_familiares")
      .select("id_idoso")
      .eq("id_familiar", perfilFamiliar.id)
      .eq("id_idoso", idosoId)
      .maybeSingle();

    if (vinculoError || !vinculo) {
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para editar este idoso." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updated, error: updateError } = await adminClient
      .from("perfis")
      .update({
        nome: nome.trim(),
        telefone: telefone?.trim() || null,
        data_nascimento: data_nascimento || null,
        foto_usuario: foto_usuario || null,
      })
      .eq("id", idosoId)
      .select("id, nome, telefone, data_nascimento, foto_usuario")
      .single();

    if (updateError || !updated) {
      return new Response(
        JSON.stringify({ error: updateError?.message ?? "Erro ao atualizar perfil." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, perfil: updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na função atualizar-idoso:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

