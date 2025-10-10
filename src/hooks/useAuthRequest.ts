'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApiRequest } from './useApiRequest';

interface AuthenticatedRequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export function useAuthRequest() {
  const supabase = createClient();
  const { execute, loading, error, data, reset } = useApiRequest();

  const makeRequest = useCallback(async <T = any>(
    url: string,
    options: AuthenticatedRequestOptions = {}
  ): Promise<T> => {
    const { requiresAuth = true, ...fetchOptions } = options;

    const makeFetchRequest = async () => {
      let headers = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      };

      if (requiresAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Usuário não autenticado. Faça login para continuar.');
        }
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.erro || `Erro HTTP ${response.status}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    };

    return execute(makeFetchRequest);
  }, [supabase, execute]);

  return {
    makeRequest,
    loading,
    error,
    data,
    reset,
  };
}
