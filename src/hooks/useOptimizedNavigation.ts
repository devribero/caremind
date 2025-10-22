'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

export function useOptimizedNavigation() {
  const router = useRouter();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navigateTo = useCallback((href: string, options?: { replace?: boolean }) => {
    // Cancela navegação anterior se ainda estiver pendente
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Usa timeout mínimo para evitar navegações muito rápidas
    navigationTimeoutRef.current = setTimeout(() => {
      if (options?.replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    }, 50); // 50ms de delay mínimo para suavizar a navegação
  }, [router]);

  const prefetchRoute = useCallback((href: string) => {
    // Prefetch da rota para navegação mais rápida
    router.prefetch(href);
  }, [router]);

  return {
    navigateTo,
    prefetchRoute,
  };
}
