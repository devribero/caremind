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
    const body = await req.json()
    const { nome_idoso, email_idoso, senha_idoso } = body

    // Log para debug
    console.log('Dados recebidos na Edge Function:', {
      nome_idoso,
      email_idoso,
      senha_provided: !!senha_idoso,
      body_keys: Object.keys(body)
    })

    // Validação mais rigorosa
    if (!nome_idoso || typeof nome_idoso !== 'string' || nome_idoso.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nome do idoso é obrigatório e não pode estar vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!email_idoso || typeof email_idoso !== 'string' || email_idoso.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Email do idoso é obrigatório e não pode estar vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!senha_idoso || typeof senha_idoso !== 'string' || senha_idoso.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Senha é obrigatória e deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalizar dados
    const nomeNormalizado = nome_idoso.trim()
    const emailNormalizado = email_idoso.trim().toLowerCase()

    console.log('Dados normalizados:', {
      nomeNormalizado,
      emailNormalizado,
      senha_length: senha_idoso.length
    })

    let novoUserIdoso: string
    let perfilIdosoId: string
    let perfilIdoso: any

    // PASSO 1: Tentar criar usuário no Auth (com privilégios admin)
    console.log('Criando usuário no Auth com:', {
      email: emailNormalizado,
      nome: nomeNormalizado
    })

    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: emailNormalizado,
      password: senha_idoso,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        account_type: 'idoso',
        nome: nomeNormalizado,
      }
    })

    if (createUserError) {
      // Se o erro for de email duplicado, buscar o usuário existente
      if (createUserError.message?.includes('already registered') ||
        createUserError.message?.includes('already exists') ||
        createUserError.message?.includes('User already registered')) {

        // Buscar usuário existente pelo email
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === emailNormalizado)

        if (!existingUser) {
          console.error('Erro ao criar usuário e não foi possível encontrar usuário existente:', createUserError)
          return new Response(
            JSON.stringify({ error: `Erro ao criar usuário: ${createUserError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        novoUserIdoso = existingUser.id

        // Verificar se já existe perfil para este usuário
        const { data: existingPerfil } = await supabaseAdmin
          .from('perfis')
          .select('id')
          .eq('user_id', novoUserIdoso)
          .maybeSingle()

        if (existingPerfil) {
          // Perfil já existe - retornar erro informando que o idoso já está cadastrado
          return new Response(
            JSON.stringify({
              error: 'Este email já está cadastrado. O idoso já possui um perfil no sistema.',
              existing_idoso: {
                id: existingPerfil.id,
                user_id: novoUserIdoso,
                email: emailNormalizado
              }
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Usuário existe mas não tem perfil - criar apenas o perfil
        // O id do perfil deve ser o mesmo do user_id (como no profileService.ts)
        perfilIdosoId = novoUserIdoso

        console.log('Criando perfil para usuário existente:', {
          id: perfilIdosoId,
          user_id: novoUserIdoso,
          nome: nomeNormalizado,
          tipo: 'idoso'
        })

        const { data: newPerfil, error: createPerfilError } = await supabaseAdmin
          .from('perfis')
          .insert({
            id: perfilIdosoId,
            user_id: novoUserIdoso,
            nome: nomeNormalizado,
            tipo: 'idoso',
          })
          .select()
          .single()

        if (createPerfilError || !newPerfil) {
          console.error('Erro ao criar perfil para usuário existente:', createPerfilError)
          return new Response(
            JSON.stringify({ error: `Erro ao criar perfil: ${createPerfilError?.message || 'Erro desconhecido'}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        perfilIdoso = newPerfil
      } else {
        // Outro tipo de erro ao criar usuário
        console.error('Erro ao criar usuário:', createUserError)
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${createUserError.message || 'Erro desconhecido'}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (!authUser?.user) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário: usuário não foi retornado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Usuário criado com sucesso
      novoUserIdoso = authUser.user.id

      // PASSO 2: Criar perfil do idoso na tabela perfis
      // O id do perfil deve ser o mesmo do user_id (como no profileService.ts)
      perfilIdosoId = novoUserIdoso

      // Verificar se já existe perfil com este user_id (proteção contra race condition)
      const { data: existingPerfil } = await supabaseAdmin
        .from('perfis')
        .select('id, nome, tipo')
        .eq('user_id', novoUserIdoso)
        .maybeSingle()

      if (existingPerfil) {
        // Perfil já foi criado (possível race condition ou trigger) - usar o existente
        console.log('Perfil já existe (possível trigger ou race condition):', existingPerfil)
        perfilIdosoId = existingPerfil.id
        perfilIdoso = existingPerfil

        // Se o perfil existe mas está sem nome, com nome padrão, ou tipo incorreto, atualizar
        // Se o perfil existe mas está sem nome, com nome padrão, ou tipo incorreto, atualizar
        const nomeInvalido = !existingPerfil.nome ||
          existingPerfil.nome.trim() === '' ||
          existingPerfil.nome.trim().toLowerCase() === 'sem nome' ||
          existingPerfil.nome.trim() === 'Usuário'

        if (nomeInvalido || existingPerfil.tipo !== 'idoso') {
          console.log('Atualizando nome e tipo do perfil existente que estava vazio ou incorreto')
          const { data: updatedPerfil, error: updateError } = await supabaseAdmin
            .from('perfis')
            .update({
              nome: nomeNormalizado,
              tipo: 'idoso'
            })
            .eq('id', perfilIdosoId)
            .select()
            .single()

          if (updateError) {
            console.error('Erro ao atualizar perfil existente:', updateError)
            return new Response(
              JSON.stringify({ error: `Erro ao atualizar perfil: ${updateError.message}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          if (updatedPerfil) {
            perfilIdoso = updatedPerfil
            console.log('Perfil atualizado com sucesso:', perfilIdoso)
          } else {
            console.error('Perfil não foi retornado após atualização')
            return new Response(
              JSON.stringify({ error: 'Erro ao atualizar perfil: dados não retornados' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      } else {
        console.log('Criando perfil para novo usuário:', {
          id: perfilIdosoId,
          user_id: novoUserIdoso,
          nome: nomeNormalizado,
          tipo: 'idoso'
        })

        const { data: newPerfil, error: createPerfilError } = await supabaseAdmin
          .from('perfis')
          .insert({
            id: perfilIdosoId,
            user_id: novoUserIdoso,
            nome: nomeNormalizado,
            tipo: 'idoso',
          })
          .select()
          .single()

        if (createPerfilError) {
          console.error('Erro ao criar perfil:', createPerfilError)
          // Verificar se o erro é de constraint única (user_id já existe)
          if (createPerfilError.code === '23505' || createPerfilError.message?.includes('duplicate key')) {
            // Perfil já existe - buscar o existente
            const { data: existingPerfil } = await supabaseAdmin
              .from('perfis')
              .select()
              .eq('user_id', novoUserIdoso)
              .single()

            if (existingPerfil) {
              console.log('Perfil já existe, usando existente:', existingPerfil)
              perfilIdosoId = existingPerfil.id
              perfilIdoso = existingPerfil

              // Atualizar o nome e tipo se estiverem vazios ou diferentes
              // Atualizar o nome e tipo se estiverem vazios, com nome padrão, ou tipo diferente
              const nomeInvalido2 = !existingPerfil.nome ||
                existingPerfil.nome.trim() === '' ||
                existingPerfil.nome.trim().toLowerCase() === 'sem nome' ||
                existingPerfil.nome.trim() === 'Usuário'

              if (nomeInvalido2 || existingPerfil.tipo !== 'idoso') {
                console.log('Atualizando nome e tipo do perfil existente')
                const { data: updatedPerfil, error: updateError2 } = await supabaseAdmin
                  .from('perfis')
                  .update({
                    nome: nomeNormalizado,
                    tipo: 'idoso'
                  })
                  .eq('id', perfilIdosoId)
                  .select()
                  .single()

                if (updateError2) {
                  console.error('Erro ao atualizar perfil existente (segundo bloco):', updateError2)
                  await supabaseAdmin.auth.admin.deleteUser(novoUserIdoso)
                  return new Response(
                    JSON.stringify({ error: `Erro ao atualizar perfil: ${updateError2.message}` }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  )
                }

                if (updatedPerfil) {
                  perfilIdoso = updatedPerfil
                  console.log('Perfil atualizado com sucesso (segundo bloco):', perfilIdoso)
                } else {
                  console.error('Perfil não foi retornado após atualização (segundo bloco)')
                  await supabaseAdmin.auth.admin.deleteUser(novoUserIdoso)
                  return new Response(
                    JSON.stringify({ error: 'Erro ao atualizar perfil: dados não retornados' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  )
                }
              }
            } else {
              // Se falhar ao criar o perfil, tenta remover o usuário criado
              await supabaseAdmin.auth.admin.deleteUser(novoUserIdoso)
              return new Response(
                JSON.stringify({ error: `Erro ao criar perfil: ${createPerfilError.message || 'Erro desconhecido'}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          } else {
            // Se falhar ao criar o perfil, tenta remover o usuário criado
            await supabaseAdmin.auth.admin.deleteUser(novoUserIdoso)
            return new Response(
              JSON.stringify({ error: `Erro ao criar perfil: ${createPerfilError.message || 'Erro desconhecido'}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else if (!newPerfil) {
          console.error('Perfil não foi retornado após criação')
          await supabaseAdmin.auth.admin.deleteUser(novoUserIdoso)
          return new Response(
            JSON.stringify({ error: 'Erro ao criar perfil: perfil não foi retornado' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          console.log('Perfil criado com sucesso:', newPerfil)
          perfilIdoso = newPerfil
        }
      }
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

    // Verificar se o perfil foi criado corretamente
    if (!perfilIdoso || !perfilIdoso.nome || perfilIdoso.nome.trim() === '') {
      console.error('Perfil criado sem nome válido:', perfilIdoso)
      return new Response(
        JSON.stringify({ error: 'Erro: perfil foi criado mas o nome não foi salvo corretamente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Idoso criado com sucesso:', {
      id: perfilIdosoId,
      user_id: novoUserIdoso,
      nome: perfilIdoso.nome,
      email: emailNormalizado
    })

    // Sucesso: retornar resposta positiva
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Idoso criado e vinculado com sucesso',
        idoso: {
          id: perfilIdosoId,
          user_id: novoUserIdoso,
          nome: perfilIdoso.nome,
          email: emailNormalizado,
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

