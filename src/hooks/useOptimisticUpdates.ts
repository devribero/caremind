'use client';

import { useCallback } from 'react';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (updatedItem: T) => void;
  onError?: (error: Error, originalItem: T) => void;
}

export function useOptimisticUpdates<T extends { id: string }>() {
  const executeOptimisticUpdate = useCallback(async <R = T>(
    currentItems: T[],
    itemId: string,
    optimisticUpdate: (item: T) => T,
    apiCall: () => Promise<R>,
    options: OptimisticUpdateOptions<T> = {}
  ): Promise<R | null> => {
    // Store original state for rollback
    const originalItems = [...currentItems];

    // Apply optimistic update
    const optimisticItems = currentItems.map(item =>
      item.id === itemId ? optimisticUpdate(item) : item
    );

    // This would be called by the consuming hook to update state
    const applyOptimisticUpdate = (updateState: (items: T[]) => void) => {
      updateState(optimisticItems);
    };

    // This would be called by the consuming hook to rollback
    const rollbackUpdate = (updateState: (items: T[]) => void) => {
      updateState(originalItems);
    };

    try {
      const result = await apiCall();
      options.onSuccess?.(result as T);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro inesperado');
      options.onError?.(err, originalItems.find(item => item.id === itemId)!);
      throw err;
    }
  }, []);

  return {
    executeOptimisticUpdate,
  };
}
