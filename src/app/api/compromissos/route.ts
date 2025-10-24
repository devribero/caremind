import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://caremind.online',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET /api/compromissos?user_id=...
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
    const queryUserId = url.searchParams.get('user_id') ?? undefined; // alvo (idoso)

    let targetUserId = user.id;
    if (queryUserId && queryUserId !== user.id) {
      const { data: vinc, error: vincErr } = await supabase
        .from('vinculos_familiares')
        .select('id_idoso')
        .eq('id_familiar', user.id)
        .eq('id_idoso', queryUserId);
      if (vincErr) throw vincErr;
      const autorizado = (vinc ?? []).length > 0;
      if (!autorizado) {
        return NextResponse.json(
          { erro: 'Acesso não autorizado ao idoso selecionado' },
          { status: 403, headers: corsHeaders }
        );
      }
      targetUserId = queryUserId;
    }

    const { data: compromissos, error } = await supabase
      .from('compromissos')
      .select('*')
      .eq('perfil_id', targetUserId)
      .order('data_hora', { ascending: true });

    if (error) throw error;

    return NextResponse.json(compromissos ?? [], { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar compromissos';
    console.error('Erro em GET /api/compromissos:', message);
    return NextResponse.json(
      { erro: message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/compromissos
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
      data_hora,
      local,
      tipo,
      lembrete_minutos = 60,
      user_id: bodyUserId,
    } = body || {};

    if (!titulo || `${titulo}`.trim() === '') {
      return NextResponse.json({ erro: "O campo 'titulo' é obrigatório." }, { status: 400, headers: corsHeaders });
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

    const { data: novo, error } = await supabase
      .from('compromissos')
      .insert([
        {
          perfil_id: targetUserId,
          titulo: `${titulo}`.trim(),
          descricao: descricao ?? null,
          data_hora: data_hora ?? null,
          local: local ?? null,
          tipo: tipo ?? 'outros',
          lembrete_minutos: typeof lembrete_minutos === 'number' ? lembrete_minutos : 60,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(novo, { status: 201, headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao criar compromisso';
    console.error('Erro em POST /api/compromissos:', message);
    return NextResponse.json(
      { erro: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
