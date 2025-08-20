// Em: src/app/api/tarefas/[id]/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Configuração básica para permitir requisições do frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Função para lidar com requisições OPTIONS (necessário para CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// PATCH - Atualizar uma tarefa existente
export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    // Pega o ID da tarefa da URL
    const { id } = context.params;
    
    // Lê o corpo da requisição
    const body = await request.json();

    // Valida se o ID é um número válido
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { erro: 'ID da tarefa inválido.' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // Atualiza a tarefa no banco
    const { data, error } = await supabase
      .from('tarefas')
      .update(body)
      .eq('id', id)
      .select();

    // Se houver erro, retorna erro 500
    if (error) {
      console.error('Erro ao atualizar tarefa:', error);
      return NextResponse.json(
        { erro: 'Falha ao atualizar tarefa.' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    // Se não encontrou a tarefa, retorna erro 404
    if (!data || data.length === 0) {
      return NextResponse.json(
        { erro: `Tarefa com ID ${id} não encontrada.` }, 
        { status: 404, headers: corsHeaders }
      );
    }

    // Retorna a tarefa atualizada
    return NextResponse.json(data[0], { headers: corsHeaders });

  } catch (error) {
    console.error('Erro ao processar atualização:', error);
    return NextResponse.json(
      { erro: 'Falha ao processar a requisição.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - Excluir uma tarefa
export async function DELETE(request: Request, context: { params: { id: string } }) {
  try {
    // Pega o ID da tarefa da URL
    const { id } = context.params;

    // Valida se o ID é um número válido
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { erro: 'ID da tarefa inválido.' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // Exclui a tarefa do banco
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', id);

    // Se houver erro, retorna erro 500
    if (error) {
      console.error('Erro ao excluir tarefa:', error);
      return NextResponse.json(
        { erro: 'Falha ao excluir tarefa.' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    // Retorna sucesso sem conteúdo (status 204 - No Content)
    return new NextResponse(null, { status: 204, headers: corsHeaders });
    
  } catch (error) {
    console.error('Erro ao processar exclusão:', error);
    return NextResponse.json(
      { erro: 'Falha ao processar a requisição.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}