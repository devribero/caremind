'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import styles from '../login/page.module.css';
import { useRouter } from 'next/navigation';  

export default function AuthClient() {
  const searchParams = useSearchParams();
  const mode = searchParams?.get('mode');
  const [isLogin, setIsLogin] = useState(true);
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
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (mode === 'register') {
      setIsLogin(false);
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

    if (!isLogin) {
      if (password !== confirmPassword) {
        return setError('As senhas não coincidem');
      }
      if (!fullName.trim()) {
        return setError('Informe seu nome completo');
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) setError('Email ou senha incorretos');
        else router.push('/dashboard');
      } else {
        const { error } = await signUp(email, password, fullName, accountType);
        if (error) setError('Erro ao criar conta: ' + error.message);
        else router.push('/onboarding');
      }
    } catch {
      setError('Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      {/* Efeito de ondas animadas */}
      <div className={styles.waves}>
        <div className={styles.wave}></div>
        <div className={styles.wave}></div>
        <div className={styles.wave}></div>
      </div>

      <section className={styles.section}>
        <div className={styles.container}>
          {/* Logo centralizada acima do card */}
          <div className={styles.logoWrapper}>
            <img
              src="/logo.png" // Logo original
              alt="Logo"
              className={styles.logo}
            />
          </div>

          <div className={`${styles.formContainer} ${!isLogin ? styles.registerMode : ''}`}>
            <h1 className={styles.title}>
              {isLogin ? 'Entrar' : 'Registrar'}
            </h1>

            <form onSubmit={handleSubmit} className={styles.form}>
              {!isLogin && (
                <div className={styles.registerColumns}>
                  {/* Coluna Esquerda */}
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
                        placeholder='Password'
                        required
                      />
                    </div>
                  </div>

                  {/* Coluna Direita */}
                  <div className={styles.registerColumn}>
                    <div className={styles.inputGroup}>
                      <label htmlFor="confirmPassword">Confirme sua senha</label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={styles.input}
                        placeholder='Password'
                        required
                      />
                    </div>

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
                    </div>
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
                      placeholder='Password'
                      required
                    />
                  </div>

                  <div className={styles.forgotPassword}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => router.push('/forgot-password')}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </>
              )}

              {error && <div className={styles.error}>{error}</div>}

              <Button type="submit" size="lg" disabled={loading}>
                {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Registrar'}
              </Button>
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

