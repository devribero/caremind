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
// FUNÇÃO GET - Buscar Medicamentos (Corrigida)
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

    const { data: medicamentos, error } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const out = (medicamentos ?? []).map((m) => ({
      ...m,
      concluido: Boolean(m.concluido),
      data_agendada: m.data_agendada ?? null,
    }));

    return NextResponse.json(out, { headers: corsHeaders });

  } catch (error: unknown) {
    let errorMessage = 'Falha ao buscar medicamentos.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Erro em GET /api/medicamentos:', errorMessage);
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ================================================================= //
// FUNÇÃO POST - Criar Novo Medicamento (Corrigida)
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
      dosagem,
      frequencia,
      quantidade,
      user_id: bodyUserId,
    } = body;

    // CORREÇÃO: Validação alterada para o campo 'nome', que é essencial
    if (!nome?.trim()) {
      return NextResponse.json(
        { erro: "O campo 'nome' é obrigatório." }, 
        { status: 400, headers: corsHeaders }
      );
    }

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

    const { data, error } = await supabase
      .from('medicamentos')
      .insert([{
        nome,
        dosagem, 
        frequencia,
        quantidade,
        user_id: targetUserId,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201, headers: corsHeaders });

  } catch (error: unknown) { 
    let errorMessage = 'Falha ao criar medicamento.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Erro em POST /api/medicamentos:', errorMessage);
    return NextResponse.json(
      { erro: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}