// supabase/functions/get-amazon-auth-url/index.ts
// VERSÃO FINAL: Bypass total para Alexa, Callback para Web

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts';

// === Variáveis de ambiente ===
const LWA_CLIENT_ID = Deno.env.get('LWA_CLIENT_ID');
const JWT_STATE_SECRET = Deno.env.get('JWT_STATE_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// URL do nosso callback (apenas para fluxo Web)
const PROJECT_ID = 'njxsuqvqaeesxmoajzyb';
const CALLBACK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/amazon-auth-callback`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

console.log('[FUNCTION:START] get-amazon-auth-url v4 (Bypass Alexa) inicializada');

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`\n[${requestId}] ─────── NOVA REQUISIÇÃO ───────`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const incomingRedirectUri = url.searchParams.get('redirect_uri'); // Pitangui...
    const incomingState = url.searchParams.get('state'); // State da Alexa

    // Verifica se é fluxo Alexa (tem redirect_uri da Amazon)
    const isAlexaFlow = incomingRedirectUri && incomingRedirectUri.includes('amazon');

    console.log(`[${requestId}] Fluxo detectado: ${isAlexaFlow ? 'ALEXA' : 'WEB'}`);

    // Construir URL base da Amazon
    const amznUrl = new URL('https://www.amazon.com/ap/oa');
    amznUrl.searchParams.set('client_id', LWA_CLIENT_ID!);
    amznUrl.searchParams.set('scope', 'profile');
    amznUrl.searchParams.set('response_type', 'code');

    if (isAlexaFlow) {
      // ============================================================
      // 🚀 MODO ALEXA (Bypass Total)
      // ============================================================
      // Mandamos o usuário logar, e a Amazon devolve DIRETO para a Alexa.
      // NÃO passamos pelo nosso callback.
      // O code será válido para o Pitangui (redirect_uri bate!).
      
      console.log(`[${requestId}] 🚀 ALEXA BYPASS - Redirecionando direto para Amazon`);
      console.log(`[${requestId}] redirect_uri original: ${incomingRedirectUri}`);
      console.log(`[${requestId}] state original: ${incomingState?.slice(0, 30)}...`);

      // Usamos o redirect_uri que a Alexa mandou (pitangui.amazon.com ou layla.amazon.com)
      amznUrl.searchParams.set('redirect_uri', incomingRedirectUri!);
      // Repassamos o state original da Alexa (ela precisa dele de volta)
      amznUrl.searchParams.set('state', incomingState!);

      console.log(`[${requestId}] URL final: ${amznUrl.toString()}`);

      return new Response(null, {
        status: 302,
        headers: { 
          ...corsHeaders, 
          Location: amznUrl.toString(),
          'X-Request-ID': requestId
        }
      });
    } 
    else {
      // ============================================================
      // 🌐 MODO WEB (Site Caremind)
      // ============================================================
      // Mandamos o usuário logar, e a Amazon devolve para o nosso Callback.
      // Lá salvamos os tokens no banco.
      
      console.log(`[${requestId}] 🌐 WEB FLOW - Usando nosso callback`);

      // Tentar pegar user_id do header Authorization
      let userId: string | null = null;
      const authHeader = req.headers.get('Authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: authHeader } }
          });
          const { data, error } = await supabase.auth.getUser();
          if (!error && data?.user) {
            userId = data.user.id;
            console.log(`[${requestId}] Usuário autenticado: ${userId}`);
          }
        } catch (err) {
          console.error(`[${requestId}] Erro ao verificar auth:`, (err as Error).message);
        }
      }

      if (!userId) {
        console.warn(`[${requestId}] ⚠️ Usuário não autenticado - integração pode falhar`);
      }

      // Criar JWT State nosso (para segurança e identificar o usuário no callback)
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(JWT_STATE_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const stateToken = await create(
        { alg: 'HS256', typ: 'JWT' },
        {
          mode: 'web',
          user_id: userId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 300, // 5 minutos
        },
        key
      );

      amznUrl.searchParams.set('redirect_uri', CALLBACK_URL);
      amznUrl.searchParams.set('state', stateToken);

      console.log(`[${requestId}] URL gerada para o frontend`);

      return new Response(JSON.stringify({ 
        url: amznUrl.toString(),
        expires_in: 300,
        request_id: requestId
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Request-ID': requestId
        }
      });
    }

  } catch (err) {
    console.error(`[${crypto.randomUUID().slice(0, 8)}] ERRO:`, err);
    return new Response(JSON.stringify({ 
      error: (err as Error).message,
      code: 'UNEXPECTED_ERROR'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
