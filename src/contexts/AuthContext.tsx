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
  signUp: (email: string, password: string, fullName?: string, accountType?: 'individual' | 'familiar') => Promise<AuthResponse>;
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
        // opcional: silenciar avisos não-críticos
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

  const signUp = async (email: string, password: string, fullName?: string, accountType: 'individual' | 'familiar' = 'individual') => {
    try {
      // Primeiro, registra o usuário na autenticação
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
      
      console.log("Resposta de autenticação:", authResponse);
      
      // Se o registro de autenticação for bem-sucedido, cria o perfil no banco de dados
      if (authResponse.data.user && !authResponse.error) {
        const userId = authResponse.data.user.id;
        
        // Tenta inserir o perfil na tabela 'perfis' com o nome explícito
        const profileData = {
          id: userId,
          nome: fullName || 'Sem nome',
          tipo: accountType,
        };
        
        console.log("Tentando inserir perfil com nome:", fullName);
        
        // Primeiro, vamos verificar se já existe um perfil para este usuário
        const { data: existingProfile } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (existingProfile) {
          // Se já existe, atualiza o perfil existente
          const { error: updateError } = await supabase
            .from('perfis')
            .update({ 
              nome: fullName,
              tipo: accountType,
            })
            .eq('id', userId);
            
          if (updateError) {
            console.error('Erro ao atualizar perfil:', updateError);
          } else {
            console.log('Perfil atualizado com sucesso!');
          }
        } else {
          // Se não existe, insere um novo perfil
          const { error: insertError } = await supabase
            .from('perfis')
            .insert([profileData]);
            
          if (insertError) {
            console.error('Erro ao criar perfil:', insertError);
          } else {
            console.log('Perfil criado com sucesso!');
          }
        }
      } else if (authResponse.error) {
        console.error('Erro na autenticação:', authResponse.error);
      }
      
      return authResponse;
    } catch (error) {
      console.error('Erro inesperado no signUp:', error);
      throw error;
    }
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