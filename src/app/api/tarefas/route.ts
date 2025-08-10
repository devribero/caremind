import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
};

// Handler OPTIONS com parâmetro prefixado pra evitar warning
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(_request: NextRequest) {
  const { data: tarefas, error } = await supabase.from('tarefas').select('*').order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ erro: 'Falha ao buscar tarefas.' }, { status: 500, headers: corsHeaders });
  }
  return NextResponse.json(tarefas, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('API recebeu no corpo (body) para criar:', body);

    const { texto, concluida } = body;

    if (!texto) {
      return NextResponse.json({ erro: "O campo 'texto' é obrigatório." }, { status: 400, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from('tarefas')
      .insert([{ texto: texto, concluida: concluida || false }])
      .select()
      .single();

    if (error) {
      console.error('Erro do Supabase ao criar:', error);
      throw new Error(error.message);
    }

    return NextResponse.json(data, { status: 201, headers: corsHeaders });

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Erro geral no método POST:", err);
      return NextResponse.json({ erro: err.message }, { status: 500, headers: corsHeaders });
    }
    console.error("Erro geral no método POST:", err);
    return NextResponse.json({ erro: 'Falha ao processar a requisição.' }, { status: 500, headers: corsHeaders });
  }
}
