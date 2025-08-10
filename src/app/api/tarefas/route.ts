// Em src/app/api/tarefas/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
};

// Handler de OPTIONS robusto e definitivo
export async function OPTIONS(request: Request) {
  // Retorna uma resposta vazia com status 204 "No Content" e os headers de permissão.
  // Esta é a resposta padrão e correta para uma requisição de pre-flight.
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: Request) {
  // ... sua função GET continua igual e funcionando ...
  const { data: tarefas, error } = await supabase.from('tarefas').select('*').order('created_at', { ascending: false });
  if (error) { return NextResponse.json({ erro: 'Falha ao buscar tarefas.' }, { status: 500 }); }
  return NextResponse.json(tarefas, { headers: corsHeaders });
}

// ----- FUNÇÃO POST AJUSTADA -----
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('API recebeu no corpo (body) para criar:', body); // <-- PISTA IMPORTANTE

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
      console.error('Erro do Supabase ao criar:', error); // <-- PISTA IMPORTANTE
      throw new Error(error.message);
    }

    return NextResponse.json(data, { status: 201, headers: corsHeaders });

  } catch (err: any) {
    console.error("Erro geral no método POST:", err);
    return NextResponse.json({ erro: err.message || 'Falha ao processar a requisição.' }, { status: 500, headers: corsHeaders });
  }
}