"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';
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

    return (
        <LoadingContext.Provider value={{ setIsLoading }}>
            {isLoading && <FullScreenLoader />}
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