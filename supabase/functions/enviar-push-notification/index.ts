// Edge Function: enviar-push-notification
// Envia push notifications via FCM usando tokens armazenados no Supabase
// Esta função é chamada por outras Edge Functions (ex: monitorar-medicamentos)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, encode } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interface para o payload da notificação
interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: "normal" | "high";
}

// Função para obter Access Token OAuth2 para API FCM V1
async function getFCMAccessToken(
  privateKey: string,
  clientEmail: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // Importar chave privada
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyBuffer = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Criar JWT usando a biblioteca djwt
  // A biblioteca djwt precisa da chave em formato específico
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    payload,
    cryptoKey as CryptoKey
  );

  // Trocar JWT por Access Token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(
      `Erro ao obter access token: ${JSON.stringify(tokenData)}`
    );
  }

  return tokenData.access_token;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // API FCM V1 usa OAuth2 Access Token ao invés de Server Key
    // Obter credenciais das variáveis de ambiente
    const fcmProjectId = Deno.env.get("FCM_PROJECT_ID");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    
    if (!fcmProjectId || !fcmPrivateKey || !fcmClientEmail) {
      throw new Error(
        "FCM_PROJECT_ID, FCM_PRIVATE_KEY e FCM_CLIENT_EMAIL devem estar configuradas nas variáveis de ambiente"
      );
    }
    
    // Obter Access Token OAuth2 para API V1
    const accessToken = await getFCMAccessToken(fcmPrivateKey, fcmClientEmail);

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse do body da requisição
    const payload: PushNotificationPayload = await req.json();

    // Buscar tokens FCM do usuário
    const { data: tokens, error: tokensError } = await supabaseClient
      .from("fcm_tokens")
      .select("token, platform")
      .eq("user_id", payload.userId)
      .order("updated_at", { ascending: false });

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nenhum token FCM encontrado para o usuário",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Enviar notificação para cada token do usuário usando API V1
    const results = [];
    for (const tokenData of tokens) {
      try {
        // API V1 endpoint
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`;

        // Preparar payload FCM V1 (formato diferente da API legada)
        const fcmMessage: any = {
          message: {
            token: tokenData.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: {
              ...Object.fromEntries(
                Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
              ),
              click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
            android: {
              priority: "high",
              notification: {
                sound: "default",
                channelId: "lembrete_medicamento_channel",
                priority: "high",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                  "content-available": 1,
                  interruptionLevel: "critical",
                },
              },
            },
          },
        };

        // Enviar requisição para FCM API V1
        const response = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fcmMessage),
        });

        const responseData = await response.json();

        if (response.ok && responseData.name) {
          results.push({
            token: tokenData.token.substring(0, 20) + "...",
            platform: tokenData.platform,
            success: true,
          });
        } else {
          results.push({
            token: tokenData.token.substring(0, 20) + "...",
            platform: tokenData.platform,
            success: false,
            error: responseData.error?.message || "Erro desconhecido",
          });

          // Se o token é inválido, remover do banco
          if (
            responseData.error?.code === 404 ||
            responseData.error?.message?.includes("Invalid")
          ) {
            await supabaseClient
              .from("fcm_tokens")
              .delete()
              .eq("token", tokenData.token);
          }
        }
      } catch (error) {
        results.push({
          token: tokenData.token.substring(0, 20) + "...",
          platform: tokenData.platform,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Notificações enviadas: ${successCount}/${tokens.length}`,
        results: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro ao enviar push notification:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

