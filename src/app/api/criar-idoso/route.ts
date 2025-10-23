import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { success: false, message: 'Configuração do Supabase ausente (URL/Service Role Key).' },
        { status: 500, headers: corsHeaders }
      );
    }

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação ausente.' },
        { status: 401, headers: corsHeaders }
      );
    }
    const token = authHeader.slice('Bearer '.length);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Corpo da requisição inválido (JSON esperado).' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { nome_idoso, email_idoso, senha_idoso } = (body as Record<string, unknown>);
    const nome = typeof nome_idoso === 'string' ? nome_idoso.trim() : '';
    const email = typeof email_idoso === 'string' ? email_idoso.trim() : '';
    const senha = typeof senha_idoso === 'string' ? senha_idoso : '';

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatórios: nome_idoso, email_idoso, senha_idoso.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Autentica o usuário familiar a partir do token
    const { data: familiarData, error: familiarErr } = await supabaseAdmin.auth.getUser(token);
    if (familiarErr || !familiarData?.user) {
      return NextResponse.json(
        { success: false, message: 'Usuário não autenticado.' },
        { status: 401, headers: corsHeaders }
      );
    }
    const familiarUser = familiarData.user;

    // Verificação opcional: garantir que seja um familiar
    const { data: perfilFam, error: perfilErr } = await supabaseAdmin
      .from('perfis')
      .select('tipo')
      .eq('user_id', familiarUser.id)
      .single();

    if (perfilErr) {
      return NextResponse.json(
        { success: false, message: `Falha ao verificar perfil do usuário: ${perfilErr.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!perfilFam || perfilFam.tipo !== 'familiar') {
      return NextResponse.json(
        { success: false, message: 'Apenas usuários do tipo "familiar" podem criar e vincular idosos.' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Cria conta do idoso no Auth (confirmada)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: senha,
      user_metadata: {
        nome: nome,
        tipo: 'idoso',
        display_name: nome,
      },
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      return NextResponse.json(
        { success: false, message: `Erro ao criar usuário do idoso: ${createError?.message || 'Desconhecido'}` },
        { status: 500, headers: corsHeaders }
      );
    }

    const idosoUser = newUser.user;

    // Insere o vínculo familiar
    const { error: linkError } = await supabaseAdmin
      .from('vinculos_familiares')
      .insert({
        id_familiar: familiarUser.id,
        id_idoso: idosoUser.id,
      });

    if (linkError) {
      // Opcional: rollback - desativar/deletar usuário criado
      try {
        await supabaseAdmin.auth.admin.deleteUser(idosoUser.id);
      } catch {}

      return NextResponse.json(
        { success: false, message: `Erro ao criar vínculo: ${linkError.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Usuário idoso criado e vinculado com sucesso!', user_idoso_id: idosoUser.id },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: corsHeaders }
    );
  }
}
