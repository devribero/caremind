import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// CORS dinâmico para dev (localhost) e produção
function buildCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  const allowedOrigins = new Set([
    'https://caremind.online',
    'http://localhost:3000',
  ]);
  const allowOrigin = allowedOrigins.has(origin) ? origin : 'https://caremind.online';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } as Record<string, string>;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(request) });
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

    // Obtém usuário a partir do contexto do Supabase
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const user = userData?.user ?? null;

    if (!user) {
      return NextResponse.json(
        { erro: 'Usuário não autenticado' },
        { status: 401, headers: buildCorsHeaders(request) }
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
          { status: 403, headers: buildCorsHeaders(request) }
        );
      }
      targetUserId = idosoId;
    }

    // Valida formato da data (YYYY-MM-DD)
    const validDate = dataStr && /^\d{4}-\d{2}-\d{2}$/.test(dataStr) ? dataStr : undefined;
    const { start, end } = getDayRange(validDate);

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
      tipo_evento: String(e.tipo_evento || '').toLowerCase(),
      evento_id: e.evento_id,
      evento: e.titulo, // mapeia para o campo esperado pelo frontend
      status: e.status,
      // normaliza para o nome esperado no frontend
      horario_programado: e.data_prevista,
      horario_confirmacao: e.horario_confirmacao ?? null,
    }));

    return NextResponse.json(out, { headers: buildCorsHeaders(request) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao obter agenda';
    const anyErr = error as any;
    const extra = {
      code: anyErr?.code,
      details: anyErr?.details,
      hint: anyErr?.hint,
    };
    console.error('Erro em GET /api/agenda:', message, extra);
    try {
      const url = new URL(request.url);
      return NextResponse.json(
        {
          erro: message,
          supabase: extra,
          params: {
            idoso_id: url.searchParams.get('idoso_id'),
            data: url.searchParams.get('data'),
          },
        },
        { status: 500, headers: buildCorsHeaders(request) }
      );
    } catch {
      return NextResponse.json(
        { erro: message, supabase: extra },
        { status: 500, headers: buildCorsHeaders(request) }
      );
    }
  }
}
