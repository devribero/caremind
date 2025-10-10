'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuthRequest } from './useAuthRequest';
import { useModalState } from './useModalState';
import { useOptimisticUpdates } from './useOptimisticUpdates';

interface CrudOperationsConfig<T extends { id: string }> {
  endpoint: string;
  onSuccess?: {
    create?: (item: T) => void;
    update?: (item: T) => void;
    delete?: (itemId: string) => void;
  };
  onError?: {
    create?: (error: string) => void;
    update?: (error: string) => void;
    delete?: (error: string) => void;
  };
}

export function useCrudOperations<T extends { id: string }>(
  config: CrudOperationsConfig<T>
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { makeRequest } = useAuthRequest();
  const addModal = useModalState<T>();
  const editModal = useModalState<T>();
  const { executeOptimisticUpdate } = useOptimisticUpdates<T>();

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await makeRequest<T[]>(config.endpoint);
      setItems(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      config.onError?.create?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [makeRequest, config]);

  // Create item
  const createItem = useCallback(async (data: Omit<T, 'id'>) => {
    try {
      const newItem = await makeRequest<T>(config.endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      setItems(prev => [newItem, ...prev]);
      addModal.close();
      config.onSuccess?.create?.(newItem);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar item';
      config.onError?.create?.(errorMessage);
      throw err;
    }
  }, [makeRequest, config, addModal]);

  // Update item
  const updateItem = useCallback(async (itemId: string, data: Partial<T>) => {
    try {
      const optimisticUpdate = (item: T) => ({ ...item, ...data } as T);

      await executeOptimisticUpdate(
        items,
        itemId,
        optimisticUpdate,
        async () => {
          return makeRequest<T>(`${config.endpoint}/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
        },
        {
          onSuccess: (updatedItem) => {
            setItems(prev => prev.map(item =>
              item.id === itemId ? updatedItem : item
            ));
            editModal.close();
            config.onSuccess?.update?.(updatedItem);
          },
          onError: (error) => {
            config.onError?.update?.(error.message);
          },
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar item';
      config.onError?.update?.(errorMessage);
      throw err;
    }
  }, [makeRequest, config, items, executeOptimisticUpdate, editModal]);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      await executeOptimisticUpdate(
        items,
        itemId,
        () => ({ id: '' } as T), // This won't be used since we filter it out
        async () => {
          return makeRequest(`${config.endpoint}/${itemId}`, {
            method: 'DELETE',
          });
        },
        {
          onSuccess: () => {
            setItems(prev => prev.filter(item => item.id !== itemId));
            config.onSuccess?.delete?.(itemId);
          },
          onError: (error) => {
            config.onError?.delete?.(error.message);
          },
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir item';
      config.onError?.delete?.(errorMessage);
      throw err;
    }
  }, [makeRequest, config, items, executeOptimisticUpdate]);

  // Edit item (open modal)
  const editItem = useCallback((item: T) => {
    editModal.open(item);
  }, [editModal]);

  // Load items on mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    // State
    items,
    loading,
    error,

    // Modals
    addModal,
    editModal,

    // Operations
    createItem,
    updateItem,
    deleteItem,
    editItem,
    fetchItems,

    // Utilities
    setItems,
  };
}
