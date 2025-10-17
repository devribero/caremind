'use client';

import { useState, useCallback } from 'react';

// Linha 5: Erro corrigido substituindo 'any' por 'unknown'
export function useModalState<T = unknown>(initialItem: T | null = null) {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<T | null>(initialItem);

  // Sem warnings de dependência de useCallback, pois 'itemToEdit' é um parâmetro
  const open = useCallback((itemToEdit?: T) => {
    setItem(itemToEdit ?? null);
    setIsOpen(true);
  }, []); // Dependências vazias estão corretas aqui

  // Sem warnings
  const close = useCallback(() => {
    setIsOpen(false);
    setItem(null);
  }, []); // Dependências vazias estão corretas aqui

  // Sem warnings
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []); // Dependências vazias estão corretas aqui

  return {
    isOpen,
    item,
    open,
    close,
    toggle,
  };
}