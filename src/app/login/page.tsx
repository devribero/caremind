'use client';

// 1. O useState já estava importado, ótimo!
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import styles from './page.module.css';
import { Header } from '@/components/headers/HeaderLogin'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState<'Individual' | 'Familiar'>('Individual');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redireciona para o dashboard se o usuário já estiver logado
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Mostra loading enquanto verifica a autenticação
  if (authLoading) {
    return (
      <main className={styles.main}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px'
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
      if (!phone.trim()) {
        return setError('Informe seu número de telefone');
      }
      if (!['Individual', 'Familiar'].includes(accountType)) {
        return setError('Selecione um tipo de conta válido');
      }
      if (!acceptTerms) {
        return setError('Você precisa aceitar os Termos e a Política');
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) setError('Email ou senha incorretos');
        else router.push('/dashboard');
      } else {
        const { error } = await signUp(email, password, fullName, phone, accountType);
        if (error) setError('Erro ao criar conta: ' + error.message);
        else router.push('/dashboard');
      }
    } catch {
      setError('Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>

      <Header />

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.formContainer}>
            <h1 className={styles.title}>
              {isLogin ? 'Entrar' : 'Registrar'}
            </h1>

            <form onSubmit={handleSubmit} className={styles.form}>
              {!isLogin && (
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
              )}

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

              {isLogin && (
                <div className={styles.forgotPassword}>
                  <button 
                    type="button" 
                    className={styles.linkButton}
                    onClick={() => router.push('/forgot-password')}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {!isLogin && (
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
              )}

              {!isLogin && (
                <div className={styles.inputGroup}>
                  <label htmlFor="phone">Número (telefone)</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.input}
                    placeholder='(00) 00000-0000'
                    required
                  />
                </div>
              )}

              {!isLogin && (
                <div className={styles.inputGroup}>
                  <label htmlFor="accountType">Tipo de conta</label>
                  <select
                    id="accountType"
                    className={styles.input}
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as 'Individual' | 'Familiar')}
                    required
                  >
                    <option value="Individual">Individual</option>
                    <option value="Familiar">Familiar</option>
                  </select>
                </div>
              )}

              {!isLogin && (
                <div className={styles.checkboxGroup}>
                  <input
                    id="terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                  />
                  <label htmlFor="terms">
                    Li e aceito os 
                    <button type="button" className={styles.link}> Termos de Serviço </button> 
                    e a 
                    <button type="button" className={styles.link}> Política de Privacidade </button>
                  </label>
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}

              <Button type="submit" size="lg" disabled={loading}>
                {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Registrar'}
              </Button>
            </form>


            <div className={styles.switchMode}>
              <p className={styles.switchText}>
                {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              </p>
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setEmail('');
                  setPassword('');
                  setFullName('');
                  setConfirmPassword('');
                  setPhone('');
                  setAccountType('Individual');
                  setAcceptTerms(false);
                }}
                className={styles.switchButton}
              >
                {isLogin ? 'Criar conta' : 'Fazer login'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}