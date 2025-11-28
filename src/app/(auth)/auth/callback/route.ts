import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // Tenta pegar o parametro "next"
  let next = requestUrl.searchParams.get('next')
  
  // Tenta pegar o tipo de ação (signup, recovery, magiclink)
  const type = requestUrl.searchParams.get('type')

  // LOG PARA VOCÊ VER NO TERMINAL
  console.log("--- DEBUG CALLBACK ---")
  console.log("Code:", code ? "Recebido" : "Nenhum")
  console.log("Type:", type)
  console.log("Next original:", next)

  // A CORREÇÃO MÁGICA:
  // Se o tipo for 'recovery' (recuperação de senha), FORÇAMOS ir para atualizar-senha
  if (type === 'recovery') {
    next = '/atualizar-senha'
    console.log("Detectada recuperação de senha! Forçando redirecionamento para:", next)
  }

  // Se ainda não tiver destino, vai pro dashboard
  const redirectTo = next || '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Troca o código pela sessão
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Monta a URL final
  const finalUrl = `${requestUrl.origin}${redirectTo}`
  console.log("Indo para:", finalUrl)
  
  return NextResponse.redirect(finalUrl)
}