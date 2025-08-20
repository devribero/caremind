'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import styles from './page.module.css';
import Image from 'next/image';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError('Email ou senha incorretos');
        } else {
          router.push('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          setError('Erro ao criar conta: ' + error.message);
        } else {
          setError('Verifique seu email para confirmar a conta');
          setIsLogin(true);
        }
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <ul className={styles.header_list}>
          <div className={styles.header_image}>
            <li>
              <a href="/">
                <Image src="/logo.png" alt="CareMind Logo" width={200} height={63} />
              </a>
            </li>
          </div>
          
          <div className={styles.header_text}>
            <li><a className={styles.header_a} href="/">Voltar ao Início</a></li>
          </div>
        </ul>
      </div>

      <section className={styles.section}>
        <div className={styles.container}>  
          
          <div className={styles.formContainer}>
            <h1 className={styles.title}>
              {isLogin ? 'Entrar na Sua Conta' : 'Criar Nova Conta'}
            </h1>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
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
                <label htmlFor="password" className={styles.label}>
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Sua senha"
                  required
                />
              </div>

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                size="lg" 
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
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
