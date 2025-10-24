// app/api/rotinas/[id]/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://caremind.online',
  'Vary': 'Origin',
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
// FUNÇÃO PATCH - Atualizar uma Rotina existente
// ================================================================= //
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = await createClient(token);

  try {
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json(
        { erro: 'Usuário não autenticado' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Pega os dados que serão atualizados do corpo da requisição
    // Ex: { "concluido": true } ou { "titulo": "Novo Título" }
    const body = await request.json();

    const { data: rotina, error } = await supabase
      .from('rotinas')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id) // Garante que o usuário só pode atualizar sua própria rotina
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Código para "nenhuma linha encontrada"
        return NextResponse.json(
          { erro: 'Rotina não encontrada ou pertence a outro usuário.' },
          { status: 404, headers: corsHeaders }
        );
      }
      throw error;
    }

    return NextResponse.json(rotina, { headers: corsHeaders });

  } catch (error: unknown) {
    let errorMessage = 'Falha ao atualizar rotina.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`Erro em PATCH /api/rotinas/${id}:`, errorMessage);
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ================================================================= //
// FUNÇÃO DELETE - Deletar uma Rotina existente
// ================================================================= //
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = await createClient(token);

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json(
        { erro: 'Usuário não autenticado' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const { error } = await supabase
      .from('rotinas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Garante que o usuário só pode deletar sua própria rotina

    if (error) throw error;
    
    // Retorna uma resposta de sucesso sem conteúdo
    return new NextResponse(null, { status: 204, headers: corsHeaders });

  } catch (error: unknown) {
    let errorMessage = 'Falha ao deletar rotina.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`Erro em DELETE /api/rotinas/${id}:`, errorMessage);
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}