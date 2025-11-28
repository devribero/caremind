import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  // Pega o parametro "next" que passamos no passo anterior (/atualizar-senha)
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Troca o código pela sessão (o usuário agora está logado!)
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redireciona o usuário para a página de criar nova senha
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}