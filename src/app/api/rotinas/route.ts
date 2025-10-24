// app/api/rotinas/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
// FUNÇÃO GET - Buscar Rotinas
// ================================================================= //
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = await createClient(token);

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

    const url = new URL(request.url);
    const idosoId = url.searchParams.get('idoso_id') ?? undefined;

    let targetUserId = user.id;
    if (idosoId && idosoId !== user.id) {
      const { data: vinc, error: vincErr } = await supabase
        .from('vinculos_familiares')
        .select('id_idoso')
        .eq('id_familiar', user.id)
        .eq('id_idoso', idosoId);

      if (vincErr) throw vincErr;
      const autorizado = (vinc ?? []).length > 0;
      if (!autorizado) {
        return NextResponse.json(
          { erro: 'Acesso não autorizado ao idoso selecionado' },
          { status: 403, headers: corsHeaders }
        );
      }
      targetUserId = idosoId;
    } else if (idosoId === user.id) {
      targetUserId = user.id;
    }

    const { data: rotinas, error } = await supabase
      .from('rotinas')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const out = (rotinas ?? []).map((r) => ({
      ...r,
      concluido: Boolean(r.concluido),
      data_agendada: (r as any).data ?? null,
    }));

    return NextResponse.json(out, { headers: corsHeaders });

  } catch (error: unknown) {
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
// FUNÇÃO POST - Criar Nova Rotina com Frequência
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
      frequencia,
      concluido = false,
      user_id: bodyUserId,
    } = body;

    // Validações
    if (!titulo || titulo.trim() === '') {
      return NextResponse.json({ erro: "O campo 'titulo' é obrigatório." }, { status: 400, headers: corsHeaders });
    }
    // A validação de 'data' foi removida. Pode-se adicionar uma validação para 'frequencia' se necessário.

    let targetUserId = user.id;
    if (bodyUserId && bodyUserId !== user.id) {
      const { data: vinc, error: vincErr } = await supabase
        .from('vinculos_familiares')
        .select('id_idoso')
        .eq('id_familiar', user.id)
        .eq('id_idoso', bodyUserId);
      if (vincErr) throw vincErr;
      const autorizado = (vinc ?? []).length > 0;
      if (!autorizado) {
        return NextResponse.json(
          { erro: 'Acesso não autorizado ao idoso selecionado' },
          { status: 403, headers: corsHeaders }
        );
      }
      targetUserId = bodyUserId;
    }

    const { data: novaRotina, error } = await supabase
      .from('rotinas')
      .insert([{
        titulo: titulo.trim(),
        descricao,
        frequencia,
        concluido,
        user_id: targetUserId
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(novaRotina, { status: 201, headers: corsHeaders });

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