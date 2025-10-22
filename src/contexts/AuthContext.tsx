//contexts/AuthContext.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
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
  const supabase = useMemo( () => createClient(), [] ); 
  
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
        // Cache da sessão para evitar múltiplas verificações
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
        
        // Cache da sessão
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

    // Escuta mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      // Evita atualizar o estado do usuário quando apenas o token é renovado
      // (ex.: ao focar a aba). Mantém a referência se o id não mudou.
      setUser((prev) => {
        const nextUser = session?.user ?? null;
        if (prev?.id === nextUser?.id) return prev;
        return nextUser;
      });

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
      // Verifica se as variáveis de ambiente estão configuradas
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Variáveis de ambiente do Supabase não configuradas!');
        console.error('URL:', supabaseUrl);
        console.error('Key:', supabaseKey ? 'Configurada' : 'Não configurada');
        throw new Error('Configuração do Supabase não encontrada. Verifique o arquivo .env.local');
      }
      
      console.log('✅ Configuração do Supabase encontrada');
      console.log('URL:', supabaseUrl);
      
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
      
      // Se o registro de autenticação for bem-sucedido, cria o Perfis no banco de dados
      if (authResponse.data.user && !authResponse.error) {
        const userId = authResponse.data.user.id;
        
        // Dados do Perfis seguindo o schema: chave estrangeira em user_id
        const profileData = {
          user_id: userId,
          nome: fullName || 'Sem nome',
          tipo: accountType,
        } as const;
        
        console.log("Tentando inserir Perfis com nome:", fullName);
        
        // Primeiro, vamos verificar se já existe um Perfis para este usuário
        const { data: existingProfile } = await supabase
          .from('perfis')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (existingProfile) {
          // Se já existe, atualiza o Perfis existente
          const { error: updateError } = await supabase
            .from('perfis')
            .update({ 
              nome: fullName,
              tipo: accountType,
            })
            .eq('user_id', userId);
            
          if (updateError) {
            console.error('Erro ao atualizar Perfis:', updateError);
          } else {
            console.log('Perfis atualizado com sucesso!');
          }
        } else {
          // Se não existe, insere um novo Perfis
          const { error: insertError } = await supabase
            .from('perfis')
            .insert([profileData]);
            
          if (insertError) {
            console.error('Erro ao criar Perfis:', insertError);
          } else {
            console.log('Perfis criado com sucesso!');
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