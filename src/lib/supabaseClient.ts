// lib/supabaseClient.ts ou lib/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr';

// 👇 Garanta que está usando "export function", e NÃO "export default"
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}