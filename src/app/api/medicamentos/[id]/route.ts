import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Session } from '@supabase/supabase-js';

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
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.set({ name, value: '', ...options });
                    },
                },
            }
        );

        // Debug: log cookie names in dev
        if (process.env.NODE_ENV !== 'production') {
            const cookieStore = await cookies();
            const allCookies = cookieStore.getAll();
            const authCookie = cookieStore.get('sb-njxsuqvqaeesxmoajzyb-auth-token');
            console.debug('[medicamentos PATCH] incoming cookies:', allCookies.map(c => c.name));
            console.debug('[medicamentos PATCH] auth cookie present:', !!authCookie);
            if (authCookie) {
                console.debug('[medicamentos PATCH] auth cookie value length:', authCookie.value?.length ?? 0);
            }
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
                    session = { user, access_token: accessToken } as Session;
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
        // Debug: log cookie names in dev
        if (process.env.NODE_ENV !== 'production') {
            const cookieStore = await cookies();
            const allCookies = cookieStore.getAll();
            const authCookie = cookieStore.get('sb-njxsuqvqaeesxmoajzyb-auth-token');
            console.debug('[medicamentos DELETE] incoming cookies:', allCookies.map(c => c.name));
            console.debug('[medicamentos DELETE] auth cookie present:', !!authCookie);
            if (authCookie) {
                console.debug('[medicamentos DELETE] auth cookie value length:', authCookie.value?.length ?? 0);
            }
        }

        const cookieStore = await cookies();
        
        // Create Supabase client with cookie handling
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.set({ name, value: '', ...options });
                    },
                },
            }
        );
        
        // Verificar autenticação e tentar recuperar via Authorization header se necessário
        let { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const accessToken = authHeader.split(' ')[1];
                const { data: { user }, error } = await supabase.auth.getUser(accessToken);
                if (user && !error) {
                    session = { user, access_token: accessToken } as Session;
                    if (process.env.NODE_ENV !== 'production') {
                        console.debug('[medicamentos DELETE] recovered session from Authorization header');
                    }
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