import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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

    const { data: vinculos, error: vincErr } = await supabase
      .from('vinculos_familiares')
      .select('id_idoso')
      .eq('id_familiar', user.id);

    if (vincErr) throw vincErr;

    const ids = (vinculos ?? []).map(v => v.id_idoso);
    if (ids.length === 0) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    const { data: perfis, error: perfErr } = await supabase
      .from('perfis')
      .select('id, nome, foto_usuario')
      .in('id', ids);

    if (perfErr) throw perfErr;

    // Mapear saída padronizada
    const out = (perfis ?? []).map(p => ({
      id_idoso: p.id,
      nome: p.nome,
      foto_usuario: p.foto_usuario,
    }));

    return NextResponse.json(out, { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao listar vínculos';
    return NextResponse.json({ erro: message }, { status: 500, headers: corsHeaders });
  }
}
