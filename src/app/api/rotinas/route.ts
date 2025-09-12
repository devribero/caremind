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
// FUNÇÃO GET - Buscar Rotinas
// ================================================================= //
export async function GET(request: Request) {
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

    // Ordena por data agendada para refletir o próximo compromisso primeiro
    const { data: rotinas, error } = await supabase
      .from('rotinas')
      .select('*')
      .eq('user_id', user.id)
      .order('data_agendada', { ascending: true });

    if (error) throw error;

    return NextResponse.json(rotinas, { headers: corsHeaders });

  } catch (error: unknown) {
    // ✅ CORREÇÃO: Mensagens de erro ajustadas para rotinas
    let errorMessage = 'Falha ao buscar rotinas.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Erro em GET /api/rotinas:', errorMessage);
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ================================================================= //
// FUNÇÃO POST - Criar Nova Rotina
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
      titulo,
      descricao,
      data_agendada,
      concluida = false,
    } = body;

    // No cliente o campo exibido é a descrição. Permitimos enviar como "titulo" ou "descricao".
    const descricaoFinal = (descricao ?? titulo ?? '').toString().trim();

    if (!descricaoFinal) {
      return NextResponse.json({ erro: "O campo 'descricao' é obrigatório." }, { status: 400, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from('rotinas')
      .insert([{
        descricao: descricaoFinal,
        data_agendada: data_agendada ?? new Date().toISOString(),
        concluida,
        user_id: user.id,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201, headers: corsHeaders });

  } catch (error: unknown) {
    let errorMessage = 'Falha ao criar rotina.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Erro em POST /api/rotinas:', errorMessage);
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}