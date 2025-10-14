import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ================================================================= //
// PUT - Atualizar perfil (nome, telefone, data_nascimento, foto_usuario)
// ================================================================= //
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();

    // 1. Verifica se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID do perfil não fornecido.' }, { status: 400 });
    }

    // 2. Extrai os dados do corpo da requisição (todos opcionais)
    const body = await request.json();
    const {
      fullName,
      phone,
      dob,
      foto_usuario,
    }: { fullName?: string; phone?: string; dob?: string; foto_usuario?: string } = body || {};

    const updatePayload: Record<string, any> = {};
    if (typeof fullName === 'string') updatePayload.nome = fullName;
    if (typeof phone === 'string') updatePayload.telefone = phone;
    if (typeof dob === 'string') updatePayload.data_nascimento = dob;
    if (typeof foto_usuario === 'string') updatePayload.foto_usuario = foto_usuario;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    // 3. Atualiza o registro que pertence ao usuário atual
    const { data: updated, error: updateError } = await supabase
      .from('perfis')
      .update(updatePayload)
      .eq('id', id)
      .eq('id', user.id) // garante que só atualiza o próprio perfil
      .select('id, nome, foto_usuario, telefone, data_nascimento')
      .single();

    if (updateError) {
      console.error('Erro do Supabase ao atualizar o perfil:', updateError);
      return NextResponse.json({ error: 'Não foi possível atualizar o perfil.' }, { status: 500 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Erro inesperado na API de perfil:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// ================================================================= //
// DELETE - Excluir uma tarefa
// ================================================================= //
export async function DELETE(request: Request, context: { params: { id: string } }) {
  const supabase = await createClient();

  try {
    // Support Bearer token as well as cookie session
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;

    let user = null as null | { id: string };
    if (token) {
      const { data, error: userErr } = await supabase.auth.getUser(token);
      if (userErr) {
        console.error('Supabase getUser(token) error:', userErr.message);
      }
      user = data?.user ?? null;
    } else {
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    }

    if (!user) {
      return NextResponse.json(
        { erro: 'Usuário não autenticado' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { erro: 'ID do medicamento não fornecido.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from('perfis')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;

    // Se nada foi retornado, significa que o item não existia ou não pertencia ao usuário.
    if (!data || data.length === 0) {
      return NextResponse.json(
        { erro: `Medicamento com ID ${id} não encontrado ou não pertence ao usuário.` },
        { status: 404, headers: corsHeaders }
      );
    }

    // Retorna 204 No Content, que é o padrão para um DELETE bem-sucedido
    return new NextResponse(null, { status: 204, headers: corsHeaders });

  } catch (error: unknown) {
    let errorMessage = 'Falha ao processar a exclusão.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Erro em DELETE /api/medicamentos/[id]:', errorMessage);
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}