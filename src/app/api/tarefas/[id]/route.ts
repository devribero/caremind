// Em: src/app/api/tarefas/[id]/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
};

// Renomeamos 'request' para '_request' para limpar o aviso de variável não utilizada
export async function OPTIONS(_request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ----- FUNÇÃO PATCH COM A ASSINATURA CORRIGIDA -----
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

  } catch (err: any) {
    console.error("Erro geral no método PATCH:", err);
    return NextResponse.json(
      { erro: err.message || 'Falha ao processar a requisição.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ----- FUNÇÃO DELETE COM A ASSINATURA CORRIGIDA -----
export async function DELETE(_request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const { error } = await supabase.from('tarefas').delete().eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return new NextResponse(null, { status: 204, headers: corsHeaders });
  } catch (err: any) {
    console.error("Erro geral no método DELETE:", err);
    return NextResponse.json(
      { erro: err.message || 'Falha ao processar a requisição.' },
      { status: 500, headers: corsHeaders }
    );
  }
}