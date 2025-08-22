import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Configuração básica para permitir requisições do frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Função para obter o usuário autenticado a partir do token
const getAuthenticatedUser = async (request: Request) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return null;
  }
};

// Função para lidar com requisições OPTIONS (necessário para CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// PATCH - Atualizar uma tarefa do usuário autenticado
export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { erro: 'Usuário não autenticado' }, 
        { status: 401, headers: corsHeaders }
      );
    }

    // Pegar o ID da tarefa da URL
    const { id } = context.params;
    
    // Ler o corpo da requisição
    const body = await request.json();

    // Validar se o ID é um número válido
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { erro: 'ID da tarefa inválido.' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // Atualizar apenas tarefas do usuário autenticado
    const { data, error } = await supabase
      .from('tarefas')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id) // Garantir que só atualiza tarefas do próprio usuário
      .select();

    if (error) {
      console.error('Erro ao atualizar tarefa:', error);
      return NextResponse.json(
        { erro: 'Falha ao atualizar tarefa.' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    // Se não encontrou a tarefa ou não pertence ao usuário
    if (!data || data.length === 0) {
      return NextResponse.json(
        { erro: `Tarefa com ID ${id} não encontrada ou não pertence ao usuário.` }, 
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(data[0], { headers: corsHeaders });

  } catch (error) {
    console.error('Erro ao processar atualização:', error);
    return NextResponse.json(
      { erro: 'Falha ao processar a requisição.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - Excluir uma tarefa do usuário autenticado
export async function DELETE(request: Request, context: { params: { id: string } }) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { erro: 'Usuário não autenticado' }, 
        { status: 401, headers: corsHeaders }
      );
    }

    // Pegar o ID da tarefa da URL
    const { id } = context.params;

    // Validar se o ID é um número válido
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { erro: 'ID da tarefa inválido.' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // Excluir apenas tarefas do usuário autenticado
    const { data, error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Garantir que só exclui tarefas do próprio usuário
      .select();

    if (error) {
      console.error('Erro ao excluir tarefa:', error);
      return NextResponse.json(
        { erro: 'Falha ao excluir tarefa.' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    // Verificar se a tarefa foi encontrada e excluída
    if (!data || data.length === 0) {
      return NextResponse.json(
        { erro: `Tarefa com ID ${id} não encontrada ou não pertence ao usuário.` }, 
        { status: 404, headers: corsHeaders }
      );
    }

    return new NextResponse(null, { status: 204, headers: corsHeaders });
    
  } catch (error) {
    console.error('Erro ao processar exclusão:', error);
    return NextResponse.json(
      { erro: 'Falha ao processar a requisição.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}