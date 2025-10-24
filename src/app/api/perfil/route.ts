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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = await createClient(token);

  try {
    let user = null as null | { id: string };
    if (token) {
      const { data } = await supabase.auth.getUser(token);
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

    const { data: perfil, error } = await supabase
      .from('perfis')
      .select('id, user_id, nome, foto_usuario, telefone, data_nascimento, tipo, codigo_vinculacao')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!perfil) {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    return NextResponse.json(perfil, { headers: corsHeaders });

  } catch (error: unknown) {
    let errorMessage = 'Falha ao buscar perfil.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Erro em GET /api/perfil:', errorMessage);
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ================================================================= //
// FUNÇÃO POST - Criar Novo Perfil (Corrigida)
// ================================================================= //
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = await createClient(token);

  try {
    let user = null as null | { id: string };
    if (token) {
      const { data } = await supabase.auth.getUser(token);
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
        tipo,
        codigo_vinculacao,
        foto_usuario
    } = body;

    // CORREÇÃO: Validação alterada para o campo 'nome', que é essencial
    if (!nome?.trim()) {
      return NextResponse.json(
        { erro: "O campo 'nome' é obrigatório." }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // CORREÇÃO: Insert ajustado para conter apenas as colunas que existem na tabela 'medicamentos'
    const { data, error } = await supabase
      .from('perfis')
      .insert([{
        nome, 
        tipo,
        codigo_vinculacao,
        foto_usuario,
        id: user.id,
        user_id: user.id,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201, headers: corsHeaders });

  } catch (error: unknown) { 
    let errorMessage = 'Falha ao criar perfil.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Erro em POST /api/perfil:', errorMessage);
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}