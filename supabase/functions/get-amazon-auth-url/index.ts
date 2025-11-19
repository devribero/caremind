// supabase/functions/get-amazon-auth-url/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts';
/* === CORS HEADERS === */ const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
/* === ENVIRONMENT VARIABLES === */ const LWA_CLIENT_ID = Deno.env.get('LWA_CLIENT_ID');
const JWT_STATE_SECRET = Deno.env.get('JWT_STATE_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const PROJECT_ID = 'njxsuqvqaeesxmoajzyb';
const CALLBACK_URL = `https://njxsuqvqaeesxmoajzyb.supabase.co/functions/v1/amazon-auth-callback`;
/* === ERROR LOG HELPER === */ const logError = (code, message, details)=>{
  console.error(`[ERROR:${code}] ${message}`, details ? JSON.stringify(details, null, 2) : '');
  return {
    error: message,
    code
  };
};
/* === ENVIRONMENT VALIDATION === */ const envErrors = [];
if (!LWA_CLIENT_ID) envErrors.push('LWA_CLIENT_ID não configurado');
if (!JWT_STATE_SECRET) envErrors.push('JWT_STATE_SECRET não configurado');
if (!SUPABASE_URL) envErrors.push('SUPABASE_URL não configurado');
if (!SUPABASE_ANON_KEY) envErrors.push('SUPABASE_ANON_KEY não configurado');
if (envErrors.length > 0) {
  console.error('[FATAL:ENV_MISSING] Variáveis de ambiente ausentes:', envErrors);
  serve(()=>new Response(JSON.stringify({
      error: 'Configuração do servidor incompleta',
      missing: envErrors,
      code: 'ENV_MISSING'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }));
  Deno.exit(1);
}
/* === STARTUP LOGS === */ console.log('[FUNCTION:START] get-amazon-auth-url inicializada com sucesso');
console.log(`[CONFIG] CALLBACK_URL: ${CALLBACK_URL}`);
console.log(`[CONFIG] LWA_CLIENT_ID: ${LWA_CLIENT_ID?.slice(0, 15)}...`);
/* === MAIN FUNCTION === */ serve(async (req)=>{
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`\n[${requestId}] ─────── NOVA REQUISIÇÃO ───────`);
  console.log(`[${requestId}] Método: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  // === Handle CORS ===
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] OPTIONS preflight OK`);
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    let userId = null;
    let authMode = 'none';
    /* === 1️⃣ Verificar Authorization Header (modo WEB) === */ const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      console.log(`[${requestId}] Authorization header detectado: ${authHeader.slice(0, 20)}...`);
      if (!authHeader.startsWith('Bearer ')) {
        console.warn(`[${requestId}] Header inválido — deve começar com "Bearer "`);
      } else {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
              headers: {
                Authorization: authHeader
              }
            }
          });
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          userId = data?.user?.id || null;
          authMode = 'web';
          console.log(`[${requestId}] Usuário autenticado via header: ${userId}`);
        } catch (err) {
          console.error(`[${requestId}] Erro Supabase Auth:`, err.message);
        }
      }
    } else {
      console.log(`[${requestId}] Nenhum Authorization header recebido`);
    }
    /* === 2️⃣ Tentar decodificar state (modo Alexa) === */ if (!userId) {
      const incomingState = url.searchParams.get('state');
      if (incomingState) {
        console.log(`[${requestId}] State recebido: ${incomingState.slice(0, 60)}...`);
        if (incomingState.startsWith('Amasey')) {
          console.log(`[${requestId}] State detectado como Alexa → ignorando decodificação`);
          userId = 'alexa-skill';
          authMode = 'alexa';
        } else {
          try {
            const decoded = atob(incomingState.split('.')[0]);
            const parsed = JSON.parse(decoded);
            userId = parsed.user_id || parsed.uid || 'alexa-anonymous';
            authMode = 'alexa';
            console.log(`[${requestId}] Usuário identificado via state: ${userId}`);
          } catch (err) {
            console.warn(`[${requestId}] Falha ao decodificar state recebido: ${err.message}`);
            userId = 'alexa-anonymous';
          }
        }
      } else {
        console.log(`[${requestId}] Nenhum state recebido — fallback para temp-user`);
        userId = 'temp-user';
      }
    }
    /* === 3️⃣ Criar JWT state === */ let stateToken = '';
    try {
      if (!JWT_STATE_SECRET || JWT_STATE_SECRET.length < 32) {
        throw new Error('JWT_STATE_SECRET deve ter pelo menos 32 caracteres');
      }
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_STATE_SECRET), {
        name: 'HMAC',
        hash: 'SHA-256'
      }, false, [
        'sign'
      ]);
      stateToken = await create({
        alg: 'HS256',
        typ: 'JWT'
      }, {
        user_id: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 5 * 60,
        mode: authMode
      }, key);
      console.log(`[${requestId}] JWT state criado para ${userId} (modo: ${authMode})`);
    } catch (err) {
      console.error(`[${requestId}] Falha ao criar JWT state:`, err.message);
      return new Response(JSON.stringify(logError('JWT_CREATION_FAILED', 'Erro ao gerar token de estado', {
        msg: err.message
      })), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    /* === 4️⃣ Construir URL da Amazon === */ let amznUrl;
    try {
      amznUrl = new URL('https://www.amazon.com/ap/oa');
      amznUrl.searchParams.set('client_id', LWA_CLIENT_ID);
      amznUrl.searchParams.set('scope', 'profile');
      amznUrl.searchParams.set('response_type', 'code');
      amznUrl.searchParams.set('redirect_uri', CALLBACK_URL);
      amznUrl.searchParams.set('state', stateToken);
      console.log(`[${requestId}] URL Amazon construída com sucesso`);
      console.log(`[${requestId}] Redirect URI forçada: ${CALLBACK_URL}`);
    } catch (err) {
      console.error(`[${requestId}] Erro ao construir URL da Amazon:`, err.message);
      return new Response(JSON.stringify(logError('URL_BUILD_FAILED', 'Falha ao gerar URL de autorização', {
        msg: err.message
      })), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    /* === 5️⃣ Retornar resposta === */ const responseTime = Date.now() - startTime;
    console.log(`[${requestId}] Sucesso em ${responseTime}ms`);
    console.log(`[${requestId}] URL final: ${amznUrl.toString()}`);
    // Redirecionar diretamente se for Alexa
    if (authMode === 'none' || authMode === 'alexa') {
      console.log(`[${requestId}] Detetado modo Alexa → enviando redirect 302 para Amazon`);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: amznUrl.toString(),
          'X-Request-ID': requestId
        }
      });
    }
    // Caso contrário, retorno JSON (modo web)
    return new Response(JSON.stringify({
      url: amznUrl.toString(),
      expires_in: 300,
      request_id: requestId,
      mode: authMode
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Request-ID': requestId
      }
    });
  } catch (err) {
    console.error(`[UNEXPECTED:${Date.now()}]`, err);
    return new Response(JSON.stringify(logError('UNEXPECTED_ERROR', 'Erro inesperado', {
      msg: err.message
    })), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
