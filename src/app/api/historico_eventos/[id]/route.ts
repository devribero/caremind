import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = await createClient(token);

  try {
    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ erro: 'ID do evento não fornecido' }, { status: 400, headers: corsHeaders });
    }

    const body = await request.json();
    const { status: novoStatus } = body || {};
    if (!novoStatus) {
      return NextResponse.json({ erro: "Campo 'status' é obrigatório" }, { status: 400, headers: corsHeaders });
    }

    let user = null as null | { id: string };
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data?.user ?? null;
    } else {
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    }

    if (!user) {
      return NextResponse.json({ erro: 'Usuário não autenticado' }, { status: 401, headers: corsHeaders });
    }

    const { data: evento, error: fetchErr } = await supabase
      .from('historico_eventos')
      .select('id, perfil_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!evento) {
      return NextResponse.json({ erro: 'Evento não encontrado' }, { status: 404, headers: corsHeaders });
    }

    let allowed = evento.perfil_id === user.id;
    if (!allowed) {
      const { data: vinc, error: vincErr } = await supabase
        .from('vinculos_familiares')
        .select('id_idoso')
        .eq('id_familiar', user.id)
        .eq('id_idoso', evento.perfil_id)
        .maybeSingle();
      if (vincErr) throw vincErr;
      allowed = Boolean(vinc);
    }

    if (!allowed) {
      return NextResponse.json({ erro: 'Proibido' }, { status: 403, headers: corsHeaders });
    }

    const setConfirm = novoStatus === 'confirmado' ? new Date().toISOString() : null;

    const { data: updated, error: updErr } = await supabase
      .from('historico_eventos')
      .update({ status: novoStatus, horario_confirmacao: setConfirm })
      .eq('id', id)
      .eq('perfil_id', evento.perfil_id)
      .select()
      .single();

    if (updErr) throw updErr;

    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao atualizar evento';
    return NextResponse.json({ erro: message }, { status: 500, headers: corsHeaders });
  }
}
