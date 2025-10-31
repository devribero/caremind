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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;
  const supabase = await createClient(token);

  try {
    const url = new URL(request.url);
    const idosoId = url.searchParams.get('idoso_id');
    const dataInicio = url.searchParams.get('dataInicio');
    const dataFim = url.searchParams.get('dataFim');
    const tipoEvento = url.searchParams.get('tipoEvento');

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

    let effectiveUserId = user.id;

    if (idosoId && idosoId !== user.id) {
      const { data: vinc, error: vincErr } = await supabase
        .from('vinculos_familiares')
        .select('id_idoso')
        .eq('id_familiar', user.id)
        .eq('id_idoso', idosoId)
        .maybeSingle();
      if (vincErr) throw vincErr;
      if (!vinc) {
        return NextResponse.json(
          { erro: 'Proibido' },
          { status: 403, headers: corsHeaders }
        );
      }
      effectiveUserId = idosoId;
    }

    let query = supabase
      .from('historico_eventos')
      .select('*')
      .eq('perfil_id', effectiveUserId)
      .order('data_prevista', { ascending: false });

    if (dataInicio) {
      // Considerar início do dia em UTC
      query = query.gte('data_prevista', `${dataInicio}T00:00:00Z`);
    }
    if (dataFim) {
      // Considerar fim do dia em UTC
      query = query.lte('data_prevista', `${dataFim}T23:59:59Z`);
    }
    if (tipoEvento && tipoEvento !== 'Todos') {
      // Espera-se valores conforme armazenados: 'Medicamento' | 'Rotina'
      query = query.eq('tipo_evento', tipoEvento);
    }

    const { data: historico, error: historicoError } = await query;

    if (historicoError) throw historicoError;

    return NextResponse.json(historico ?? [], { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao obter histórico';
    return NextResponse.json(
      { erro: message },
      { status: 500, headers: corsHeaders }
    );
  }
}

