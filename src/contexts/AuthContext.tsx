//contexts/AuthContext.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client'; 
import { User, Session, AuthResponse, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    phone?: string,
    accountType?: 'Individual' | 'Familiar'
  ) => Promise<AuthResponse>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

  const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // 👇 2. Crie a instância do Supabase DENTRO do componente
  const supabase = createClient(); 
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Função de reset password (necessita da instância do supabase)
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  useEffect(() => {
    // Verifica a sessão atual ao carregar o componente
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Erro ao obter sessão:', error);
        }
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Erro inesperado ao obter sessão:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuta mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Mudança no estado de autenticação:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      // Fallback: ao logar, tenta sincronizar metadados pendentes (ex.: phone) se não existirem ainda
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const currentMeta = session.user.user_metadata as Record<string, any> | undefined;
          const pendingRaw = typeof window !== 'undefined' ? localStorage.getItem('pendingUserMetadata') : null;
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw) as { full_name?: string; phone?: string } | null;
            const needsPhone = !currentMeta?.phone && !!pending?.phone;
            const needsName = !currentMeta?.full_name && !!pending?.full_name;
            if (needsPhone || needsName) {
              await supabase.auth.updateUser({
                data: {
                  full_name: needsName ? pending?.full_name : currentMeta?.full_name,
                  phone: needsPhone ? pending?.phone : currentMeta?.phone,
                },
              });
            }
            // Limpa pendências após tentativa
            if (typeof window !== 'undefined') {
              localStorage.removeItem('pendingUserMetadata');
            }
          }
        }
      } catch (syncErr) {
        console.warn('Falha ao sincronizar metadados pendentes no SIGNED_IN:', syncErr);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    phone?: string,
    accountType: 'Individual' | 'Familiar' = 'Individual'
  ) => {
    // 1) Cria usuário com metadados (inclui telefone)
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    // Armazena metadados pendentes localmente para sincronizar após primeiro login
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'pendingUserMetadata',
          JSON.stringify({ full_name: fullName, phone })
        );
      }
    } catch {}

    // 2) Refina user_metadata garantindo persistência do telefone, pois em alguns projetos
    //    as configurações podem exigir confirmação de email e ignorar parte dos metadados.
    try {
      const createdUser = response?.data?.user;
      if (createdUser) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            phone,
          },
        });
        // Checagem opcional (log) para confirmar metadados
        const { data: userCheck } = await supabase.auth.getUser();
        console.log('Metadados após updateUser:', userCheck?.user?.user_metadata);
      }
    } catch (e) {
      console.warn('Aviso: não foi possível confirmar/persistir metadados do usuário no signup.', e);
    }

    // 3) Se o usuário foi criado com sucesso, cria o perfil com o tipo selecionado
    try {
      const createdUser = response?.data?.user;
      if (createdUser && fullName) {
        await fetch('/api/perfil', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: fullName,
            tipo: accountType,
          }),
        });
      }
    } catch (err) {
      console.error('Falha ao criar Perfil após signUp:', err);
      // Mantemos o fluxo de signup mesmo que o Perfil falhe; UI pode lidar depois
    }

    return response;
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro ao fazer logout:', error);
        throw error;
      }
      // Limpa o estado local imediatamente
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Erro inesperado ao fazer logout:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}