'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from '@/components/Toast';
import { useAuthRequest } from './useAuthRequest';
import { useModalState } from './useModalState';
import { useOptimisticUpdates } from './useOptimisticUpdates';

interface CrudOperationsConfig<T extends { id: string | number }> {
  endpoint: string;
  onSuccess?: {
    create?: (item: T) => void;
    update?: (item: T) => void;
    delete?: (itemId: string) => void;
    read?: (items: T[]) => void;
  };
  onError?: {
    create?: (error: string) => void;
    update?: (error: string) => void;
    delete?: (error: string) => void;
    read?: (error: string) => void;
  };
}

export function useCrudOperations<T extends { id: string | number }>(
  config: CrudOperationsConfig<T>
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { makeRequest } = useAuthRequest();
  const addModal = useModalState<T>();
  const editModal = useModalState<T>();
  const { executeOptimisticUpdate } = useOptimisticUpdates<T>();

  // Ensure item-level operations hit the resource route without query params
  const baseEndpoint = useMemo(() => config.endpoint.split('?')[0], [config.endpoint]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await makeRequest<T[]>(config.endpoint);
      setItems(data || []);
      config.onSuccess?.read?.(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      // 🎯 ATENÇÃO AQUI: Mudança de tipo de erro (create => read/fetch)
      config.onError?.read?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [makeRequest, config.endpoint, config.onError?.read, config.onSuccess?.read]);

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
  }, [makeRequest, config.endpoint, config.onSuccess?.create, config.onError?.create, addModal]);

  // Update item
  const updateItem = useCallback(async (itemId: string, data: Partial<T>) => {
    try {
      const optimisticUpdate = (item: T) => ({ ...item, ...data } as T);

      await executeOptimisticUpdate(
        items,
        updater => setItems(updater),
        itemId,
        optimisticUpdate,
        async () => {
          return makeRequest<T>(`${baseEndpoint}/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
        },
        {
          onSuccess: (updatedItem) => {
            setItems(prev => prev.map(item => (item.id === itemId ? (updatedItem as T) : item)));
            editModal.close();
            config.onSuccess?.update?.(updatedItem as T);
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
  }, [items, makeRequest, config.endpoint, executeOptimisticUpdate, editModal, config.onSuccess?.update, config.onError?.update]);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    const ok = await toast.confirm('Tem certeza que deseja excluir este item?');
    if (!ok) return;

    try {
      await executeOptimisticUpdate(
        items,
        updater => setItems(updater),
        itemId,
        () => ({ id: '' } as T),
        async () => {
          return makeRequest(`${baseEndpoint}/${itemId}`, {
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
  }, [items, makeRequest, config.endpoint, executeOptimisticUpdate, config.onSuccess?.delete, config.onError?.delete]);

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
