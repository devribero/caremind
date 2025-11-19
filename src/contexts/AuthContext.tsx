//contexts/AuthContext.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client'; 
import { User, Session, AuthResponse, AuthError } from '@supabase/supabase-js';
import { normalizeError } from '@/utils/errors';

type AuthErrorResponse = {
  error: {
    message: string;
    code?: string;
    status?: number;
  } | null;
  data: {
    user: User | null;
    session: Session | null;
  } | null;
};

// Common error messages
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'E-mail ou senha inválidos. Por favor, tente novamente.',
  EMAIL_ALREADY_IN_USE: 'Este e-mail já está em uso. Tente fazer login ou recuperar sua senha.',
  WEAK_PASSWORD: 'A senha deve ter pelo menos 6 caracteres.',
  INVALID_EMAIL: 'Por favor, insira um endereço de e-mail válido.',
  NETWORK_ERROR: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
  TOO_MANY_REQUESTS: 'Muitas tentativas. Por favor, aguarde um momento antes de tentar novamente.',
  DEFAULT: 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.',
  SESSION_EXPIRED: 'Sessão expirada. Por favor, faça login novamente.',
  USER_NOT_FOUND: 'Nenhuma conta encontrada com este e-mail.',
  RESET_PASSWORD_SUCCESS: 'Enviamos um e-mail com instruções para redefinir sua senha.',
} as const;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse | AuthErrorResponse>;
  signUp: (email: string, password: string, fullName?: string, accountType?: 'individual' | 'familiar') => Promise<AuthResponse | AuthErrorResponse>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    try {
      if (!email) {
        return { 
          error: { 
            message: 'Por favor, insira um endereço de e-mail.',
            status: 400,
            name: 'AuthError'
          } as AuthError 
        };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Erro ao redefinir senha:', error);
        const authError = new Error(getErrorMessage(error, 'RESET_PASSWORD')) as AuthError;
        Object.assign(authError, {
          status: error.status,
          name: error.name,
          code: error.code,
          stack: error.stack,
          cause: error.cause
        });
        return { error: authError };
      }

      return { error: null };
    } catch (error) {
      console.error('Erro inesperado ao redefinir senha:', error);
      return { 
        error: { 
          message: ERROR_MESSAGES.DEFAULT,
          status: 500,
          name: 'AuthError'
        } as AuthError 
      };
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const cachedSession = typeof window !== 'undefined' ? 
          sessionStorage.getItem('supabase_session') : null;
        
        if (cachedSession) {
          const parsedSession = JSON.parse(cachedSession);
          setSession(parsedSession);
          setUser(parsedSession?.user ?? null);
          setLoading(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Erro ao obter sessão:', error);
        }
        setSession(session);
        setUser(session?.user ?? null);
        
        if (typeof window !== 'undefined' && session) {
          sessionStorage.setItem('supabase_session', JSON.stringify(session));
        }
      } catch (error) {
        console.error('Erro inesperado ao obter sessão:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser((prev) => {
        const nextUser = session?.user ?? null;
        if (prev?.id === nextUser?.id) return prev;
        return nextUser;
      });

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
            if (typeof window !== 'undefined') {
              localStorage.removeItem('pendingUserMetadata');
            }
          }
        }
      } catch (syncErr) {
        console.error('Erro ao sincronizar metadados:', syncErr);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    try {
      if (!email || !password) {
        return { 
          data: { user: null, session: null },
          error: { 
            message: 'Por favor, preencha todos os campos obrigatórios.',
            code: 'MISSING_FIELDS'
          }
        } as AuthErrorResponse;
      }

      const response = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (response.error) {
        console.error('Erro ao fazer login:', response.error);
        return {
          ...response,
          error: {
            ...response.error,
            message: getErrorMessage(response.error, 'SIGN_IN')
          }
        } as AuthErrorResponse;
      }

      return response;
    } catch (error) {
      console.error('Erro inesperado ao fazer login:', error);
      return {
        data: { user: null, session: null },
        error: { 
          message: ERROR_MESSAGES.DEFAULT,
          code: 'UNKNOWN_ERROR'
        }
      } as AuthErrorResponse;
    }
  };

  const getErrorMessage = (error: AuthError | null, context: 'SIGN_UP' | 'SIGN_IN' | 'RESET_PASSWORD' = 'SIGN_UP'): string => {
    if (!error) return '';
    
    const errorCode = error.status?.toString() || '';
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('email already in use')) {
      return ERROR_MESSAGES.EMAIL_ALREADY_IN_USE;
    }
    if (errorMessage.includes('invalid login credentials') || 
        errorMessage.includes('invalid email or password')) {
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    }
    if (errorMessage.includes('password should be at least')) {
      return ERROR_MESSAGES.WEAK_PASSWORD;
    }
    if (errorMessage.includes('invalid email address')) {
      return ERROR_MESSAGES.INVALID_EMAIL;
    }
    if (errorMessage.includes('too many requests')) {
      return ERROR_MESSAGES.TOO_MANY_REQUESTS;
    }
    
    if (context === 'SIGN_UP' && errorMessage.includes('user already registered')) {
      return 'Este e-mail já está cadastrado. Por favor, faça login ou recupere sua senha.';
    }
    
    if (context === 'SIGN_IN' && errorMessage.includes('email not confirmed')) {
      return 'Por favor, verifique seu e-mail para confirmar sua conta antes de fazer login.';
    }
    
    if (context === 'RESET_PASSWORD' && errorMessage.includes('email not found')) {
      return 'Nenhuma conta encontrada com este e-mail.';
    }
    
    return error.message || ERROR_MESSAGES.DEFAULT;
  };

  const signUp = async (email: string, password: string, fullName?: string, accountType: 'individual' | 'familiar' = 'individual') => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuração do Supabase não encontrada. Verifique o arquivo .env.local');
      }
      
      const authResponse = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            account_type: accountType,
          },
        },
      });
      
      if (authResponse.error && typeof authResponse.error.message === 'string' && authResponse.error.message.toLowerCase().includes('already')) {
        const signInResp = await supabase.auth.signInWithPassword({ email, password });
        if (signInResp.data.user && !signInResp.error) {
          return signInResp;
        }
        return authResponse;
      }

      if (authResponse.data.user && !authResponse.error) {
        const userId = authResponse.data.user.id;
        
        const profileData = {
          user_id: userId,
          nome: fullName || 'Sem nome',
          tipo: accountType,
        } as const;
        
        const { error: upsertError } = await supabase
          .from('perfis')
          .upsert(profileData, { onConflict: 'user_id' });
        if (upsertError) {
          console.error('Erro ao upsert Perfis (não bloqueante):', upsertError);
        }
      } else if (authResponse.error) {
        console.error('Erro na autenticação:', authResponse.error);
      }
      
      return authResponse;
    } catch (error) {
      console.error('Erro inesperado no signUp:', error);
      throw normalizeError(error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro ao fazer logout:', error);
        throw new Error('Falha ao sair da conta. Por favor, tente novamente.');
      }
      setUser(null);
      setSession(null);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('supabase_session');
        } catch {}
      }
    } catch (error) {
      console.error('Erro inesperado ao fazer logout:', error);
      throw normalizeError(error);
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