import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://caremind.online',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function getDayRange(dateStr?: string) {
  const now = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = await createClient(token);

  try {
    const url = new URL(request.url);
    const idosoId = url.searchParams.get('idoso_id');
    const dataStr = url.searchParams.get('data'); // YYYY-MM-DD opcional

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
    }

    const { start, end } = getDayRange(dataStr || undefined);

    // Consulta usando as colunas corretas do schema: data_prevista (tempo) e titulo (nome)
    const { data: eventos, error } = await supabase
      .from('historico_eventos')
      .select('*')
      .eq('perfil_id', targetUserId)
      .gte('data_prevista', start)
      .lt('data_prevista', end)
      .order('data_prevista', { ascending: true });
    if (error) throw error;

    // Normaliza saída para o frontend
    const out = (eventos ?? []).map((e: any) => ({
      id: e.id,
      tipo_evento: e.tipo_evento,
      evento_id: e.evento_id,
      evento: e.titulo, // mapeia para o campo esperado pelo frontend
      status: e.status,
      // normaliza para o nome esperado no frontend
      horario_programado: e.data_prevista,
      horario_confirmacao: e.horario_confirmacao ?? null,
    }));

    return NextResponse.json(out, { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao obter agenda';
    return NextResponse.json(
      { erro: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
