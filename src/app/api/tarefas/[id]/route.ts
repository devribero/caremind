import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
};

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();

    const { data, error } = await supabase
      .from('tarefas')
      .update(body)
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Erro do Supabase ao atualizar ID ${id}:`, error);
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { erro: `Tarefa com ID ${id} não encontrada.` },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(data[0], { headers: corsHeaders });

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Erro geral no método PATCH:", err);
      return NextResponse.json({ erro: err.message }, { status: 500, headers: corsHeaders });
    }
    console.error("Erro geral no método PATCH:", err);
    return NextResponse.json({ erro: 'Falha ao processar a requisição.' }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop();

  if (!id) {
    return new NextResponse(null, { status: 400 });
  }

  const { error } = await supabase.from('tarefas').delete().eq('id', id);
  if (error) {
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
