// Supabase Edge Function: criar-idoso
// Esta função cria um novo usuário idoso e o vincula ao familiar que fez a solicitação
// Requer privilégios de administrador (Service Role Key) para criar usuários

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Tratamento de preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Variáveis de ambiente não configuradas')
    }

    // Criar cliente admin (com privilégios de service role para burlar RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Criar cliente do usuário para identificar quem está fazendo a requisição
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUserClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Identificar o familiar que está fazendo a solicitação
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado ou token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const familiarUserId = user.id

    // Buscar o perfil_id do familiar na tabela perfis
    const { data: perfilFamiliar, error: perfilError } = await supabaseAdmin
      .from('perfis')
      .select('id')
      .eq('user_id', familiarUserId)
      .single()

    if (perfilError || !perfilFamiliar) {
      return new Response(
        JSON.stringify({ error: 'Perfil do familiar não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const idFamiliar = perfilFamiliar.id

    // Extrair dados do idoso do corpo da requisição
    const { nome_idoso, email_idoso, senha_idoso } = await req.json()

    if (!nome_idoso || !email_idoso || !senha_idoso) {
      return new Response(
        JSON.stringify({ error: 'Dados do idoso incompletos. Forneça nome_idoso, email_idoso e senha_idoso' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PASSO 1: Criar usuário no Auth (com privilégios admin)
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email_idoso,
      password: senha_idoso,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        account_type: 'idoso',
        nome: nome_idoso,
      }
    })

    if (createUserError || !authUser?.user) {
      console.error('Erro ao criar usuário:', createUserError)
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createUserError?.message || 'Erro desconhecido'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const novoUserIdoso = authUser.user.id

    // PASSO 2: Criar perfil do idoso na tabela perfis
    // O id do perfil deve ser um UUID (geralmente o mesmo do user_id ou um UUID gerado)
    // Vamos usar um UUID v4 gerado
    const perfilIdosoId = crypto.randomUUID()

    const { data: perfilIdoso, error: createPerfilError } = await supabaseAdmin
      .from('perfis')
      .insert({
        id: perfilIdosoId,
        user_id: novoUserIdoso,
        nome: nome_idoso,
        tipo: 'idoso',
      })
      .select()
      .single()

    if (createPerfilError || !perfilIdoso) {
      // Se falhar ao criar o perfil, tenta remover o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(novoUserIdoso)
      
      console.error('Erro ao criar perfil:', createPerfilError)
      return new Response(
        JSON.stringify({ error: `Erro ao criar perfil: ${createPerfilError?.message || 'Erro desconhecido'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PASSO 3: Criar vínculo familiar
    const { error: createVinculoError } = await supabaseAdmin
      .from('vinculos_familiares')
      .insert({
        id_familiar: idFamiliar,
        id_idoso: perfilIdosoId,
      })

    if (createVinculoError) {
      // Se falhar ao criar o vínculo, tenta limpar usuário e perfil criados
      await supabaseAdmin.from('perfis').delete().eq('id', perfilIdosoId)
      await supabaseAdmin.auth.admin.deleteUser(novoUserIdoso)
      
      console.error('Erro ao criar vínculo:', createVinculoError)
      return new Response(
        JSON.stringify({ error: `Erro ao criar vínculo: ${createVinculoError?.message || 'Erro desconhecido'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sucesso: retornar resposta positiva
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Idoso criado e vinculado com sucesso',
        idoso: {
          id: perfilIdosoId,
          user_id: novoUserIdoso,
          nome: nome_idoso,
          email: email_idoso,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na função criar-idoso:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* Para invocar localmente:

  1. Configure as variáveis de ambiente (no arquivo .env ou via Deno.env.set()):
     - SUPABASE_URL
     - SUPABASE_SERVICE_ROLE_KEY
     - SUPABASE_ANON_KEY

  2. Execute `supabase start` (veja: https://supabase.com/docs/reference/cli/supabase-start)

  3. Faça uma requisição HTTP:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/criar-idoso' \
    --header 'Authorization: Bearer SEU_TOKEN_AQUI' \
    --header 'Content-Type: application/json' \
    --data '{
      "nome_idoso": "Maria da Silva",
      "email_idoso": "maria@exemplo.com",
      "senha_idoso": "senha123"
    }'

*/

