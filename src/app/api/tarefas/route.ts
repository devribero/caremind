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

// GET - Buscar todas as tarefas
export async function GET() {
  try {
    // Busca todas as tarefas no banco, ordenadas por data de criação (mais recentes primeiro)
    const { data: tarefas, error } = await supabase
      .from('tarefas')
      .select('*')
      .order('created_at', { ascending: false });

    // Se houver erro, retorna erro 500
    if (error) {
      console.error('Erro ao buscar tarefas:', error);
      return NextResponse.json(
        { erro: 'Falha ao buscar tarefas.' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    // Retorna as tarefas encontradas
    return NextResponse.json(tarefas, { headers: corsHeaders });

  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { erro: 'Erro interno do servidor.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Criar nova tarefa
export async function POST(request: Request) {
  try {
    // Lê o corpo da requisição
    const body = await request.json();
    
    // Extrai os dados da tarefa
    const { texto, concluida = false } = body;

    // Valida se o texto foi fornecido
    if (!texto || texto.trim() === '') {
      return NextResponse.json(
        { erro: "O campo 'texto' é obrigatório." }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // Insere a nova tarefa no banco
    const { data, error } = await supabase
      .from('tarefas')
      .insert([{ 
        texto: texto.trim(), 
        concluida: concluida 
      }])
      .select()
      .single();

    // Se houver erro, retorna erro 500
    if (error) {
      console.error('Erro ao criar tarefa:', error);
      return NextResponse.json(
        { erro: 'Falha ao criar tarefa.' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    // Retorna a tarefa criada com status 201 (Created)
    return NextResponse.json(data, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { erro: 'Falha ao processar a requisição.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
