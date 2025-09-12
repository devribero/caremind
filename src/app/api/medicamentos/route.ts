import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ================================================================= //
// FUNÇÃO GET - Buscar Medicamentos
// ================================================================= //
export async function GET(request: Request) {
  // Lê token Bearer do header, se houver, e injeta no cliente do Supabase
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = createClient(token);

  try {
    // Try to read user based on Bearer token or cookie session
    let user = null as null | { id: string };
    if (token) {
      const { data, error: userErr } = await supabase.auth.getUser(token);
      if (userErr) {
        console.error('Supabase getUser(token) error:', userErr.message);
      }
      user = data?.user ?? null;
    } else {
      // Fallback to cookie-based session (SSR cookies)
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    }

    if (!user) {
      return NextResponse.json(
        { erro: 'Usuário não autenticado' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: medicamentos, error } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('user_id', user.id)
      .order('data_agendada', { ascending: true }); // Ordenar por data agendada faz mais sentido

    if (error) throw error;

    return NextResponse.json(medicamentos, { headers: corsHeaders });

  } catch (error: unknown) {
    let errorMessage = 'Falha ao buscar medicamentos.'; // ✅ Corrigido
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Erro em GET /api/medicamentos:', errorMessage); // ✅ Corrigido
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ================================================================= //
// FUNÇÃO POST - Criar Novo Medicamento
// ================================================================= //
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = createClient(token);

  try {
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

    const body = await request.json();
    
    const { 
        nome, 
        dosagem, 
        frequencia, 
        quantidade, 
        data_agendada,
        concluido = false // Assume 'false' se não for enviado
    } = body;

    if (!nome || nome.trim() === '') {
      return NextResponse.json({ erro: "O campo 'nome' é obrigatório." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('medicamentos')
      .insert([{
        nome: nome.trim(),
        dosagem,
        frequencia,
        quantidade,
        data_agendada,
        concluido,
        user_id: user.id
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201, headers: corsHeaders });

  } catch (error: unknown) { 
    let errorMessage = 'Falha ao criar medicamento.'; // ✅ Corrigido
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Erro em POST /api/medicamentos:', errorMessage); // ✅ Corrigido
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}