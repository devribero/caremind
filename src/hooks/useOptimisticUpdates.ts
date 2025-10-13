'use client';

import { useCallback } from 'react';

interface OptimisticUpdateOptions<T, R = T> {
  onSuccess?: (updatedItem: R) => void;
  onError?: (error: Error, originalItem: T) => void;
}

export function useOptimisticUpdates<T extends { id: string | number }>() {
  const executeOptimisticUpdate = useCallback(async <R = T>(
    currentItems: T[],
    setItems: (updater: (items: T[]) => T[]) => void,
    itemId: string,
    optimisticUpdate: (item: T) => T,
    apiCall: () => Promise<R>,
    options: OptimisticUpdateOptions<T, R> = {}
  ): Promise<R | null> => {
    // Snapshot para rollback
    const originalItems = [...currentItems];

    // Aplica atualização otimista imediatamente
    setItems(() =>
      currentItems.map(item => (item.id === itemId ? optimisticUpdate(item) : item))
    );

    try {
      const result = await apiCall();
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro inesperado');
      // Rollback em caso de erro
      setItems(() => originalItems);
      const original = originalItems.find(item => item.id === itemId)!;
      options.onError?.(err, original);
      throw err;
    }
  }, []);

  return {
    executeOptimisticUpdate,
  };
}
