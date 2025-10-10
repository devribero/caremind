'use client';

import { useState, useCallback } from 'react';

export function useModalState<T = any>(initialItem: T | null = null) {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<T | null>(initialItem);

  const open = useCallback((itemToEdit?: T) => {
    setItem(itemToEdit ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setItem(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    item,
    open,
    close,
    toggle,
  };
}
