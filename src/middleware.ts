// middleware.ts (na raiz do projeto ou em src/)

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const allowedOrigin = 'https://caremind.online'

  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    preflight.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    preflight.headers.set('Vary', 'Origin')
    preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    preflight.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    preflight.headers.set('Access-Control-Max-Age', '86400')
    return preflight
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Atualiza a sessão do usuário. Essencial para Server Components e API Routes.
  await supabase.auth.getSession()

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    'upgrade-insecure-requests',
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  const origin = request.headers.get('origin') || ''
  if (origin === allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Vary', 'Origin')
  } else {
    response.headers.delete('Access-Control-Allow-Origin')
  }

  const path = request.nextUrl.pathname
  const isStaticAsset =
    path.startsWith('/_next/') ||
    path === '/favicon.ico' ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$/.test(path)
  if (!isStaticAsset) {
    response.headers.set('Cache-Control', 'no-store')
  }

  return response
}

export const config = {
  matcher: [
    '/api/change-password/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.webp).*)',
  ],
}