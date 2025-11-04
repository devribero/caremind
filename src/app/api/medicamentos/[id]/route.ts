import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function PATCH(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const cookieStore = await cookies();
        
        // Create Supabase client with cookie handling
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        try {
                            cookieStore.set({ name, value, ...options })
                        } catch (error) {
                            // Ignore set error in route handlers
                        }
                    },
                    remove(name: string, options: CookieOptions) {
                        try {
                            cookieStore.set({ name, value: '', ...options })
                        } catch (error) {
                            // Ignore set error in route handlers
                        }
                    },
                },
            }
        )

        // Debug: log cookie names in dev
        if (process.env.NODE_ENV !== 'production') {
            console.debug('[medicamentos PATCH] Auth cookie:', cookieStore.get('sb-njxsuqvqaeesxmoajzyb-auth-token')?.value ? 'present' : 'missing');
        }
        
        // Verificar autenticação
        let { data: { session } } = await supabase.auth.getSession();
        
        // Se não houver sessão via cookie, tenta pelo header Authorization
        if (!session) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const accessToken = authHeader.split(' ')[1];
                const { data: { user }, error } = await supabase.auth.getUser(accessToken);
                if (user && !error) {
                    session = { user, access_token: accessToken } as any;
                }
            }
        }

        if (!session) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401, headers: corsHeaders }
            );
        }

        // `context.params` is an async proxy in Next.js route handlers — await it
        // before accessing properties to avoid the sync-dynamic-apis error.
        const params = await context.params;
        const id = params?.id;
        if (!id) {
            return NextResponse.json(
                { error: 'ID não fornecido' },
                { status: 400, headers: corsHeaders }
            );
        }

        const body = await request.json();

        // Garantir que o medicamento pertence ao usuário atual
        const { data: medicamento, error: checkError } = await supabase
            .from('medicamentos')
            .select()
            .eq('id', id)
            .eq('user_id', session.user.id)
            .single();

        if (checkError || !medicamento) {
            return NextResponse.json(
                { error: 'Medicamento não encontrado ou acesso não autorizado' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Atualizar o medicamento
        const { data, error } = await supabase
            .from('medicamentos')
            .update(body)
            .eq('id', id)
            .eq('user_id', session.user.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400, headers: corsHeaders }
            );
        }

        return NextResponse.json(data, { 
            headers: corsHeaders 
        });

    } catch (error) {
        console.error('Erro ao atualizar medicamento:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
    // Get the cookie store first and pass a function that returns it to the
    // auth helper. This ensures the supabase adapter can call `context.cookies()`
    // synchronously without triggering Next.js "sync dynamic APIs" checks.
        const cookieStore = await cookies();
        // Debug: log cookie names (safe — don't log values). Only in non-prod.
        if (process.env.NODE_ENV !== 'production') {
            try {
                const names = cookieStore.getAll().map(c => c.name);
                console.debug('[medicamentos DELETE] incoming cookies:', names);
            } catch {
                // ignore
            }
        }
    // Return the resolved cookie store directly (not a Promise).
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
        
        // Verificar autenticação
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401, headers: corsHeaders }
            );
        }

        // `context.params` is an async proxy in Next.js route handlers — await it
        // before accessing properties to avoid the sync-dynamic-apis error.
        const params = await context.params;
        const id = params?.id;
        if (!id) {
            return NextResponse.json(
                { error: 'ID não fornecido' },
                { status: 400, headers: corsHeaders }
            );
        }

        const { error } = await supabase
            .from('medicamentos')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400, headers: corsHeaders }
            );
        }

        return new NextResponse(null, { 
            status: 204, 
            headers: corsHeaders 
        });

    } catch (error) {
        console.error('Erro ao excluir medicamento:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500, headers: corsHeaders }
        );
    }
}