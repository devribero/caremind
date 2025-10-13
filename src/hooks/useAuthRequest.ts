'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthenticatedRequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export function useAuthRequest() {
  const supabase = createClient();

  const makeRequest = useCallback(async <T = any>(
    url: string,
    options: AuthenticatedRequestOptions = {}
  ): Promise<T> => {
    const { requiresAuth = true, ...fetchOptions } = options;

    // Corrigido: headers com tipagem correta
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    };

    if (requiresAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado. Faça login para continuar.');
      }
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.erro || errorData.message || `Erro HTTP ${response.status}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null as T;
    }

    return await response.json();
  }, [supabase]);

  return {
    makeRequest,
  };
}