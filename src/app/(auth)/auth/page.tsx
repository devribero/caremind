// src/app/auth/page.tsx
import { Suspense } from 'react';
import AuthClient from './AuthClient';

// Este componente é um Server Component e protege o cliente
// que usa useSearchParams() durante o pré-renderização
export default function AuthPage() {
    return (
        <Suspense fallback={<div>Carregando tela de autenticação...</div>}>
            <AuthClient />
        </Suspense>
    );
}