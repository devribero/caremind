import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // AQUI ESTÁ O SEGREDO:
  // Tentamos pegar o parametro "next". Se não existir, mandamos para o dashboard.
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redireciona para onde pedimos (no caso: /atualizar-senha)
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}