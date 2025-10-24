import { NextResponse } from 'next/server';
// ✅ 1. Importa a FUNÇÃO createClient do arquivo de servidor
import { createClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://caremind.online',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ✅ 2. A função manual getAuthenticatedUser foi REMOVIDA.

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ================================================================= //
// PATCH - Atualizar uma tarefa
// ================================================================= //
export async function PATCH(request: Request, context: { params: { id: string } }) {
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
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { erro: 'ID do medicamento não fornecido.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Corrigido: mudando 'tarefas' para 'medicamentos'
    const { data, error } = await supabase
      .from('medicamentos')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Erro do Supabase:', error);
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { erro: `Medicamento com ID ${id} não encontrado ou não pertence ao usuário.` },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error: unknown) {
    let errorMessage = 'Falha ao processar a atualização.';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Detalhes do erro:', error);
    }
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
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

    // A adição do .select() faz com que o Supabase retorne o item deletado,
    // permitindo verificar se a operação realmente encontrou e removeu algo.
    const { data, error } = await supabase
      .from('medicamentos')
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