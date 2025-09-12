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
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

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
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

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