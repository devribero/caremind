// Arquivo: src/lib/supabase/client.ts
'use client'; // Opcional, mas boa prática para indicar que este módulo é para o cliente

import { createBrowserClient } from '@supabase/ssr';

/**
 * Cria um cliente Supabase para ser usado no lado do cliente (no navegador).
 *
 * Esta função deve ser chamada dentro de componentes React marcados com 'use client'.
 * Ela lê as variáveis de ambiente públicas (NEXT_PUBLIC_...) para se conectar
 * de forma segura ao seu projeto Supabase.
 *
 * @returns Uma instância do cliente Supabase configurada para o navegador.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}