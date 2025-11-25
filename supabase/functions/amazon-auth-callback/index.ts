// supabase/functions/amazon-auth-callback/index.ts
// VERSÃO CORRIGIDA: Pass-Through para Alexa (não consome o code)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

// === Variáveis de ambiente ===
const LWA_CLIENT_ID = Deno.env.get("LWA_CLIENT_ID")!;
const LWA_CLIENT_SECRET = Deno.env.get("LWA_CLIENT_SECRET")!;
const JWT_STATE_SECRET = Deno.env.get("JWT_STATE_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL")!;

const PROJECT_ID = "njxsuqvqaeesxmoajzyb";
const CALLBACK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/amazon-auth-callback`;

console.log("[FUNCTION:START] amazon-auth-callback v3 (Pass-Through) inicializada");

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`\n[${requestId}] ─────── CALLBACK RECEBIDO ───────`);
  console.log(`[${requestId}] Code: ${code?.slice(0, 20)}...`);
  console.log(`[${requestId}] State: ${state?.slice(0, 50)}...`);

  try {
    if (!code || !state) throw new Error("Parâmetros 'code' ou 'state' ausentes.");

    // 1️⃣ Verificar e Decodificar o JWT State (Isso NÃO gasta o code)
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_STATE_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const payload = await verify(state, key, "HS256") as {
      mode?: string;
      user_id?: string;
      original_redirect_uri?: string;
      original_state?: string;
    };

    console.log(`[${requestId}] Modo detectado: ${payload.mode}`);

    // =================================================================
    // 🚦 DECISÃO DE FLUXO: ALEXA VS WEB
    // =================================================================

    // SE FOR ALEXA: PARE AQUI! Não troque o token. Apenas devolva o code.
    // O código é de USO ÚNICO - se trocarmos aqui, a Alexa não consegue usar
    if (payload.mode === 'alexa' && payload.original_redirect_uri) {
      console.log(`[${requestId}] 🔴 Fluxo ALEXA detectado - Pass-Through ativado`);
      console.log(`[${requestId}] Repassando code VIRGEM para Alexa (não consumindo)`);
      console.log(`[${requestId}] Destino: ${payload.original_redirect_uri}`);

      // Construímos a URL de volta para a Amazon (pitangui... ou layla...)
      const alexaRedirect = new URL(payload.original_redirect_uri);
      alexaRedirect.searchParams.set("code", code); // O código VIRGEM (não usado)
      alexaRedirect.searchParams.set("state", payload.original_state || ""); // O state original da Alexa

      console.log(`[${requestId}] Redirecionando para: ${alexaRedirect.toString()}`);
      return Response.redirect(alexaRedirect.toString(), 302);
    }

    // =================================================================
    // SE FOR WEB: Continue o processo normal (trocar token e salvar)
    // =================================================================

    console.log(`[${requestId}] 🟢 Fluxo WEB detectado - Trocando code por token...`);

    const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: CALLBACK_URL,
        client_id: LWA_CLIENT_ID,
        client_secret: LWA_CLIENT_SECRET
      })
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(`Falha ao obter token: ${tokens.error_description || tokens.error}`);
    }

    const { access_token, refresh_token, expires_in } = tokens;
    console.log(`[${requestId}] Token obtido com sucesso.`);

    // 4️⃣ Buscar perfil do usuário na Amazon
    console.log(`[${requestId}] Buscando perfil do usuário...`);
    const profileRes = await fetch("https://api.amazon.com/user/profile", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const profile = await profileRes.json();
    if (!profile.user_id) {
      throw new Error("Erro ao obter perfil Amazon.");
    }

    console.log(`[${requestId}] Perfil Amazon: ${profile.name || 'N/A'} (${profile.user_id.slice(0, 20)}...)`);

    // 5️⃣ Salvar no Supabase (Apenas se tivermos o user_id do Supabase no payload)
    // No fluxo WEB, nós guardamos o user_id no state lá no get-amazon-auth-url
    if (payload.user_id) {
      console.log(`[${requestId}] Salvando integração para user_id: ${payload.user_id}`);
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      const { error: upsertError } = await supabase
        .from("user_integrations")
        .upsert({
          user_id: payload.user_id,
          provider: "amazon_alexa",
          amazon_user_id: profile.user_id,
          access_token: access_token,
          refresh_token: refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: "user_id, provider" 
        });

      if (upsertError) {
        console.error(`[${requestId}] Erro ao salvar:`, upsertError.message);
        throw new Error(`Erro ao salvar no banco: ${upsertError.message}`);
      }

      console.log(`[${requestId}] ✅ Integração salva com sucesso!`);
    } else {
      console.warn(`[${requestId}] ⚠️ user_id não encontrado no payload - integração não salva`);
    }

    console.log(`[${requestId}] Redirecionando para o site (sucesso)`);
    return Response.redirect(`${SITE_URL}/integracoes?status=success`, 302);

  } catch (err) {
    console.error(`[${requestId}] ❌ ERRO:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return Response.redirect(
      `${SITE_URL}/integracoes?status=error&message=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
});
