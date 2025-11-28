'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Waves } from '@/components/shared/Waves';

export default function AuthClient() {
  const searchParams = useSearchParams();
  const mode = searchParams?.get('mode');
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [leaving, setLeaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'familiar'>('individual');

  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      const tipo = (user.user_metadata?.account_type as string | undefined)?.toLowerCase();
      router.push(tipo === 'familiar' ? '/familiar-dashboard' : '/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (mode === 'register') {
      setIsLogin(false);
      setStep(1);
    }
  }, [mode]);

  if (authLoading) {
    return (
      <main className={styles.main}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: 'white'
        }}>
          Carregando...
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Em registro, somente submeter no passo 3
    if (!isLogin && step !== 3) {
      return;
    }
    if (!isLogin) {
      if (!fullName.trim()) {
        return setError('Informe seu nome completo');
      }
      if (!email.trim()) {
        return setError('Informe seu email');
      }
      if (!password) {
        return setError('Informe sua senha');
      }
      if (password !== confirmPassword) {
        return setError('As senhas não coincidem');
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error, data } = await signIn(email, password);
        if (error) setError('Email ou senha incorretos');
        else {
          const tipo = (data?.user?.user_metadata?.account_type as string | undefined)?.toLowerCase();
          router.push(tipo === 'familiar' ? '/familiar-dashboard' : '/dashboard');
        }
      } else {
        const { error } = await signUp(email, password, fullName, accountType);
        if (error) {
          console.error('Erro detalhado no signUp:', error);
          if (error.message.includes('Configuração do Supabase não encontrada')) {
            setError('❌ Configuração do banco de dados não encontrada. Entre em contato com o suporte.');
          } else {
            setError('Erro ao criar conta: ' + error.message);
          }
        } else {
          router.push('/onboarding');
        }
      }
    } catch {
      setError('Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const transitionTo = (next: 1 | 2 | 3) => {
    if (next === step) return;
    setLeaving(true);
    // tempo deve casar com a duração da animação de saída (160ms)
    setTimeout(() => {
      setStep(next);
      setLeaving(false);
    }, 170);
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !isLogin) {
      if (step !== 3) {
        e.preventDefault();
        handleContinue();
      }
    }
  };

  const handleContinue = () => {
    setError('');
    if (step === 1) {
      if (!fullName.trim()) {
        setError('Informe seu nome completo');
        return;
      }
      if (!email.trim()) {
        setError('Informe seu email');
        return;
      }
      transitionTo(2);
      return;
    }
    if (step === 2) {
      if (!password) {
        setError('Informe sua senha');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }
      transitionTo(3);
    }
  };

  return (
    <main className={styles.main}>
      {/* Efeito de ondas animadas */}
      {/* Efeito de ondas animadas no fundo */}
      <Waves />

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', marginBottom: '8px' }}>
        <Image
          src="/icons/logo.png"
          alt="CareMind Logo"
          width={180}
          height={57}
          priority
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={`${styles.formContainer} ${!isLogin ? styles.registerMode : ''}`}>
            <h1 className={styles.title}>
              {isLogin ? 'Entrar' : 'Registrar'}
            </h1>
            {!isLogin && (
              <div style={{ color: '#fff', opacity: 0.9, fontSize: 14, marginTop: -8, marginBottom: 8 }}>
                {`Passo ${step} de 3`}
              </div>
            )}

            <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className={styles.form}>
              {!isLogin && (
                <div className={styles.stepWrapper}>
                  <div key={step} className={leaving ? styles.stepContentExit : styles.stepContent}>
                    {step === 1 && (
                      <div className={styles.registerColumns}>
                        <div className={styles.registerColumn}>
                          <div className={styles.inputGroup}>
                            <label htmlFor="fullName">Nome Completo</label>
                            <input
                              id="fullName"
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className={styles.input}
                              placeholder="Seu nome"
                              autoComplete="name"
                              required
                            />
                          </div>

                          <div className={styles.inputGroup}>
                            <label htmlFor="email">Email</label>
                            <input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className={styles.input}
                              placeholder="seu@email.com"
                              autoComplete="email"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className={styles.registerColumns}>
                        <div className={styles.registerColumn}>
                          <div className={styles.inputGroup}>
                            <label htmlFor="password">Crie sua senha</label>
                            <input
                              id="password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className={styles.input}
                              placeholder='Senha'
                              autoComplete="new-password"
                              required
                            />
                          </div>
                          <div className={styles.inputGroup}>
                            <label htmlFor="confirmPassword">Confirme sua senha</label>
                            <input
                              id="confirmPassword"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={styles.input}
                              placeholder='Confirme a senha'
                              autoComplete="new-password"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className={styles.registerColumns}>
                        <div className={styles.registerColumn}>
                          <div className={styles.inputGroup}>
                            <label htmlFor="accountType">Tipo de conta</label>
                            <select
                              id="accountType"
                              value={accountType}
                              onChange={(e) => setAccountType(e.target.value as 'individual' | 'familiar')}
                              className={styles.input}
                              required
                            >
                              <option value="individual">Individual</option>
                              <option value="familiar">Familiar</option>
                            </select>
                            <div className={styles.accountTypeInfo}>
                              {accountType === 'individual'
                                ? 'Conta para uso pessoal, ideal para cuidadores ou usuários que desejam gerenciar seu próprio acompanhamento.'
                                : 'Conta para familiares acompanharem e colaborarem no cuidado de um ente querido, com recursos de compartilhamento.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isLogin && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.input}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="password">{isLogin ? 'Senha' : 'Crie sua senha'}</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.input}
                      placeholder='Senha'
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div className={styles.forgotPassword}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => router.push('/esqueci-senha')}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </>
              )}

              {error && <div className={styles.error}>{error}</div>}

              {isLogin ? (
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? 'Carregando...' : 'Entrar'}
                </Button>
              ) : step === 1 ? (
                <Button type="button" size="lg" onClick={handleContinue} disabled={loading}>
                  {loading ? 'Carregando...' : 'Continuar'}
                </Button>
              ) : step === 2 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
                  <Button type="button" size="lg" onClick={() => transitionTo(1)} style={{ width: '100%' }}>
                    Voltar
                  </Button>
                  <Button type="button" size="lg" onClick={handleContinue} disabled={loading} style={{ width: '100%' }}>
                    {loading ? 'Carregando...' : 'Continuar'}
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
                  <Button type="button" size="lg" onClick={() => transitionTo(2)} style={{ width: '100%' }}>
                    Voltar
                  </Button>
                  <Button type="submit" size="lg" disabled={loading} style={{ width: '100%' }}>
                    {loading ? 'Carregando...' : 'Registrar'}
                  </Button>
                </div>
              )}
            </form>

            <div className={styles.switchMode}>
              <p className={styles.switchText}>
                {isLogin ? 'Não tem conta ainda?' : 'Já tem uma conta?'}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setEmail('');
                    setPassword('');
                    setFullName('');
                    setConfirmPassword('');
                    setAccountType('individual');
                    setStep(1);
                  }}
                  className={styles.switchButton}
                >
                  {isLogin ? 'Criar conta' : 'Fazer login'}
                </button>
              </p>
            </div>

            {/* Linha divisória */}
            <div style={{
              height: '1px',
              background: 'rgba(255, 255, 255, 0.2)',
              margin: '1.5rem 0'
            }} />

            {/* Botão Voltar ao Início na parte mais inferior */}
            <div className={styles.backButtonContainer}>
              <Link href="/" className={styles.backButton}>
                Voltar ao Início
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

