// app/api/change-password/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Parse seguro do corpo como JSON
        let body: unknown;
        try {
            body = await request.json();
        } catch (e) {
            console.error('Erro ao ler JSON da requisição:', e);
            return NextResponse.json({ error: 'Corpo da requisição inválido (JSON esperado).' }, { status: 400 });
        }

        const { currentPassword, newPassword } = (body as { currentPassword?: string; newPassword?: string });

        const current = (currentPassword ?? '').trim();
        const nextPwd = (newPassword ?? '').trim();

        // Validações básicas
        if (!current || !nextPwd) {
            return NextResponse.json(
                { error: 'Senha atual e nova senha são obrigatórias' },
                { status: 400 }
            );
        }

        if (nextPwd.length < 6) {
            return NextResponse.json(
                { error: 'A nova senha deve ter pelo menos 6 caracteres' },
                { status: 400 }
            );
        }

        // Criar cliente do Supabase
        const supabase = createClient();

        // Verificar se o usuário está autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Usuário não autenticado' },
                { status: 401 }
            );
        }

        console.log('Usuário autenticado para alteração de senha:', user.email);

        // Alterar a senha diretamente, pois o usuário já está autenticado via sessão
        try {
            const { data, error: updateError } = await supabase.auth.updateUser({ password: nextPwd });

            if (updateError) {
                console.log('Erro ao alterar senha:', updateError);
                // Erros de regra de senha costumam ser 400
                const status = updateError.status ?? 500;
                return NextResponse.json(
                    { error: `Erro ao alterar senha: ${updateError.message}` },
                    { status: status >= 400 && status < 500 ? status : 500 }
                );
            }

            console.log('Senha alterada com sucesso para usuário:', user.email);

            return NextResponse.json(
                {
                    message: 'Senha alterada com sucesso',
                    user: data.user,
                },
                { status: 200 }
            );
        } catch (updateError) {
            console.error('Erro interno na atualização:', updateError);
            return NextResponse.json(
                { error: 'Erro interno ao alterar senha' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Erro geral na API:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// Método GET para testar se a API está funcionando
export async function GET() {
    return NextResponse.json(
        { message: 'API de alteração de senha funcionando' },
        { status: 200 }
    );
}