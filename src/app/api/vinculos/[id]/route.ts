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

export async function DELETE(request: Request, context: { params: { id: string } }) {
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

    const id_idoso = context.params.id;
    if (!id_idoso) {
      return NextResponse.json(
        { erro: 'Parâmetro id do idoso ausente.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Opcional: checar se o usuário é familiar
    const { data: perfilFam, error: perfilErr } = await supabase
      .from('perfis')
      .select('tipo')
      .eq('user_id', user.id)
      .single();

    if (perfilErr) {
      return NextResponse.json(
        { erro: `Falha ao verificar perfil do usuário: ${perfilErr.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!perfilFam || perfilFam.tipo !== 'familiar') {
      return NextResponse.json(
        { erro: 'Apenas usuários do tipo "familiar" podem desvincular idosos.' },
        { status: 403, headers: corsHeaders }
      );
    }

    const { error: delErr } = await supabase
      .from('vinculos_familiares')
      .delete()
      .eq('id_familiar', user.id)
      .eq('id_idoso', id_idoso);

    if (delErr) {
      return NextResponse.json(
        { erro: `Erro ao remover vínculo: ${delErr.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ erro: message }, { status: 500, headers: corsHeaders });
  }
}
