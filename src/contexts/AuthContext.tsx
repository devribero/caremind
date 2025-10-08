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
      console.log('Mudança no estado de autenticação:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
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
          user_id: userId,
          nome: fullName || 'Sem nome', // Nome explícito
          tipo: accountType,
          email: email,
          created_at: new Date().toISOString()
        };
        
        console.log("Tentando inserir perfil com nome:", fullName);
        
        // Primeiro, vamos verificar se já existe um perfil para este usuário
        const { data: existingProfile } = await supabase
          .from('perfis')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (existingProfile) {
          // Se já existe, atualiza o perfil existente
          const { error: updateError } = await supabase
            .from('perfis')
            .update({ 
              nome: fullName,
              tipo: accountType,
              email: email
            })
            .eq('user_id', userId);
            
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
            
            // Tenta uma abordagem alternativa - RLS pode estar bloqueando
            const { error: rpcError } = await supabase.rpc('criar_perfil', {
              p_user_id: userId,
              p_nome: fullName || 'Sem nome',
              p_tipo: accountType,
              p_email: email
            });
            
            if (rpcError) {
              console.error('Erro ao criar perfil via RPC:', rpcError);
            } else {
              console.log('Perfil criado com sucesso via RPC!');
            }
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