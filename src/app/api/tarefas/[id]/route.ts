// Em: src/app/api/tarefas/[id]/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
};

export async function OPTIONS(_request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('tarefas')
      .update(body)
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { erro: `Tarefa com ID ${id} não encontrada.` },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(data[0], { headers: corsHeaders });

  } catch (err: unknown) { // <-- MUDANÇA DE 'any' PARA 'unknown'
    console.error("Erro geral no método PATCH:", err);
    // Adicionamos uma verificação para acessar 'err.message' de forma segura
    if (err instanceof Error) {
      return NextResponse.json({ erro: err.message }, { status: 500, headers: corsHeaders });
    }
    return NextResponse.json({ erro: 'Falha ao processar a requisição.' }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const { error } = await supabase.from('tarefas').delete().eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return new NextResponse(null, { status: 204, headers: corsHeaders });
    
  } catch (err: unknown) { // <-- MUDANÇA DE 'any' PARA 'unknown'
    console.error("Erro geral no método DELETE:", err);
    // Adicionamos a mesma verificação aqui
    if (err instanceof Error) {
      return NextResponse.json({ erro: err.message }, { status: 500, headers: corsHeaders });
    }
    return NextResponse.json({ erro: 'Falha ao processar a requisição.' }, { status: 500, headers: corsHeaders });
  }
}