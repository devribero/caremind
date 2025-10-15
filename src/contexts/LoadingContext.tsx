"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { FullScreenLoader } from '@/components/FullScreenLoader';

// Interface para definir o que o nosso contexto irá fornecer
interface LoadingContextType {
  setIsLoading: (isLoading: boolean) => void;
}

// Cria o contexto
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Componente Provedor que irá gerenciar o estado e exibir o loader
export function LoadingProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    // Exibe o loader apenas se o estado de loading persistir por mais de 250ms,
    // evitando "flash" rápido ao voltar a aba ou revalidações curtas.
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isLoading) {
            const t = setTimeout(() => setVisible(true), 250);
            return () => clearTimeout(t);
        }
        // Quando parar de carregar, some imediatamente
        setVisible(false);
    }, [isLoading]);

    return (
        <LoadingContext.Provider value={{ setIsLoading }}>
            {visible && <FullScreenLoader />}
            {children}
        </LoadingContext.Provider>
    );
}

// Hook customizado para facilitar o uso do contexto nas páginas
export function useLoading() {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error('useLoading precisa ser usado dentro de um LoadingProvider');
    }
    return context;
}