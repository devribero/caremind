// supabase/functions/amazon-auth-callback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
// === Variáveis de ambiente ===
const LWA_CLIENT_ID = Deno.env.get("LWA_CLIENT_ID");
const LWA_CLIENT_SECRET = Deno.env.get("LWA_CLIENT_SECRET");
const JWT_STATE_SECRET = Deno.env.get("JWT_STATE_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SITE_URL = Deno.env.get("SITE_URL");
const PROJECT_ID = "njxsuqvqaeesxmoajzyb";
const CALLBACK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/amazon-auth-callback`;
const successUrl = `${SITE_URL}/integracoes?status=success`;
const errorUrl = `${SITE_URL}/integracoes?status=error&message=`;
// === Servidor ===
serve(async (req)=>{
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  try {
    // 1️⃣ Verificar state (COM A CORREÇÃO)
    if (!state) throw new Error('O parâmetro "state" está ausente.');
    if (!JWT_STATE_SECRET) throw new Error("JWT_STATE_SECRET ausente.");
    // --- INÍCIO DA CORREÇÃO ---
    // Importar o segredo bruto para um objeto CryptoKey
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_STATE_SECRET), {
      name: "HMAC",
      hash: "SHA-256"
    }, false, [
      "verify"
    ] // uso: apenas para verificar
    );
    // Verificar o token usando o CryptoKey importado
    const payload = await verify(state, key, "HS256");
    // --- FIM DA CORREÇÃO ---
    const userId = payload?.user_id;
    if (!userId) throw new Error("State inválido — user_id ausente.");
    // 2️⃣ Verificar code
    if (!code) throw new Error('O parâmetro "code" está ausente.');
    // 3️⃣ Trocar code por token
    console.log("[AUTH] Solicitando token à Amazon...");
    const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
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
    console.log("[AUTH] Token obtido com sucesso.");
    // 4️⃣ Buscar perfil do usuário
    console.log("[PROFILE] Solicitando perfil do usuário...");
    const profileRes = await fetch("https://api.amazon.com/user/profile", {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.user_id) {
      throw new Error(`Erro ao obter perfil da Amazon. Resposta: ${JSON.stringify(profile)}`);
    }
    const amazonUserId = profile.user_id;
    const amazonName = profile?.name || "Desconhecido";
    // 5️⃣ Salvar no Supabase
    console.log(`[DB] Salvando integração para ${userId} (${amazonName})`);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    const { error: upsertError } = await supabase.from("user_integrations").upsert({
      user_id: userId,
      provider: "amazon_alexa",
      amazon_user_id: amazonUserId,
      access_token: access_token,
      refresh_token: refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id, provider"
    });
    if (upsertError) throw new Error(`Erro ao salvar no banco: ${upsertError.message}`);
    console.log("[SUCCESS] Integração salva com sucesso!");
    return Response.redirect(successUrl, 302);
  } catch (err) {
    console.error("[ERROR] Callback Amazon:", err);
    const redirect = errorUrl + encodeURIComponent(err instanceof Error ? err.message : String(err));
    return Response.redirect(redirect, 302);
  }
});
