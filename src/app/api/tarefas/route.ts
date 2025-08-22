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
    
    // Criar um cliente Supabase com o token do usuário
    const supabaseWithAuth = supabase.auth.admin;
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

// GET - Buscar tarefas do usuário autenticado
export async function GET(request: Request) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { erro: 'Usuário não autenticado' }, 
        { status: 401, headers: corsHeaders }
      );
    }

    // Buscar apenas as tarefas do usuário autenticado
    const { data: tarefas, error } = await supabase
      .from('tarefas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar tarefas:', error);
      return NextResponse.json(
        { erro: 'Falha ao buscar tarefas.' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(tarefas, { headers: corsHeaders });

  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { erro: 'Erro interno do servidor.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Criar nova tarefa para o usuário autenticado
export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { erro: 'Usuário não autenticado' }, 
        { status: 401, headers: corsHeaders }
      );
    }

    // Ler o corpo da requisição
    const body = await request.json();
    const { texto, concluida = false } = body;

    // Validar se o texto foi fornecido
    if (!texto || texto.trim() === '') {
      return NextResponse.json(
        { erro: "O campo 'texto' é obrigatório." }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // Inserir a nova tarefa no banco com o user_id
    const { data, error } = await supabase
      .from('tarefas')
      .insert([{ 
        texto: texto.trim(), 
        concluida: concluida,
        user_id: user.id // Incluir o ID do usuário autenticado
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar tarefa:', error);
      return NextResponse.json(
        { erro: 'Falha ao criar tarefa.' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(data, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { erro: 'Falha ao processar a requisição.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}