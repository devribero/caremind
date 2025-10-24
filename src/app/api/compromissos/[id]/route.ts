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

async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = await createClient(token);

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

  return { user, supabase } as const;
}

async function canAccessCompromisso(supabase: any, userId: string, compromissoPerfilId: string) {
  if (userId === compromissoPerfilId) return true;
  const { data: vinc, error: vincErr } = await supabase
    .from('vinculos_familiares')
    .select('id_idoso')
    .eq('id_familiar', userId)
    .eq('id_idoso', compromissoPerfilId)
    .maybeSingle();
  if (vincErr) throw vincErr;
  return !!vinc;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { erro: 'Usuário não autenticado' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const compromissoId = params.id;
    const { data: existente, error: getErr } = await supabase
      .from('compromissos')
      .select('*')
      .eq('id', compromissoId)
      .single();
    if (getErr) throw getErr;
    if (!existente) {
      return NextResponse.json({ erro: 'Compromisso não encontrado' }, { status: 404, headers: corsHeaders });
    }

    const allowed = await canAccessCompromisso(supabase, user.id, existente.perfil_id);
    if (!allowed) {
      return NextResponse.json({ erro: 'Proibido' }, { status: 403, headers: corsHeaders });
    }

    const body = await request.json();
    const updateData: any = {};
    const allowedFields = ['titulo', 'descricao', 'data_hora', 'local', 'tipo', 'lembrete_minutos'];
    for (const key of allowedFields) {
      if (key in body) updateData[key] = body[key];
    }

    const { data: atualizado, error: updErr } = await supabase
      .from('compromissos')
      .update(updateData)
      .eq('id', compromissoId)
      .select()
      .single();

    if (updErr) throw updErr;

    return NextResponse.json(atualizado, { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao atualizar compromisso';
    console.error('Erro em PATCH /api/compromissos/[id]:', message);
    return NextResponse.json({ erro: message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { erro: 'Usuário não autenticado' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const compromissoId = params.id;
    const { data: existente, error: getErr } = await supabase
      .from('compromissos')
      .select('id, perfil_id')
      .eq('id', compromissoId)
      .single();
    if (getErr) throw getErr;
    if (!existente) {
      return NextResponse.json({ erro: 'Compromisso não encontrado' }, { status: 404, headers: corsHeaders });
    }

    const allowed = await canAccessCompromisso(supabase, user.id, existente.perfil_id);
    if (!allowed) {
      return NextResponse.json({ erro: 'Proibido' }, { status: 403, headers: corsHeaders });
    }

    const { error: delErr } = await supabase
      .from('compromissos')
      .delete()
      .eq('id', compromissoId);

    if (delErr) throw delErr;

    return new NextResponse(null, { status: 204, headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir compromisso';
    console.error('Erro em DELETE /api/compromissos/[id]:', message);
    return NextResponse.json({ erro: message }, { status: 500, headers: corsHeaders });
  }
}
