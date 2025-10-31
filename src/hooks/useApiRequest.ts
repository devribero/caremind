'use client';

import { useState, useCallback, useRef } from 'react';
import { normalizeError } from '@/utils/errors';

interface ApiRequestState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiRequestOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApiRequest<T = any>(options: UseApiRequestOptions = {}) {
  const [state, setState] = useState<ApiRequestState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  // Use useRef para evitar problemas com dependências
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(async (requestFn: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await requestFn();
      setState({ data, loading: false, error: null });
      optionsRef.current.onSuccess?.(data);
      return data;
    } catch (error) {
      const normalized = normalizeError(error);
      const errorMessage = normalized.message;
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      optionsRef.current.onError?.(errorMessage);
      throw normalized;
    }
  }, []); // Dependências vazias, usa optionsRef

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}