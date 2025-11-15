'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Footer } from '@/components/shared/Footer';

export default function ForgotPassword() {
  const { resetPassword, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message || 'Não foi possível enviar o email.');
      } else {
        setMessage('Se o email existir, enviaremos um link para redefinir sua senha.');
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: 24, borderRadius: 12, maxWidth: 420, width: '100%', boxShadow: '0 10px 30px rgba(147, 155, 238, 0.2)' }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0400BA', textAlign: 'center' }}>Esqueci minha senha</h1>
          <p style={{ marginTop: 8, color: '#4a5568', textAlign: 'center' }}>Informe seu email para receber o link de redefinição.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="voce@exemplo.com"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e0e7ff', marginTop: 6 }}
              />
            </label>
            {error && <div style={{ color: '#c53030', fontSize: 14 }}>{error}</div>}
            {message && <div style={{ color: '#2f855a', fontSize: 14 }}>{message}</div>}
            <button type="submit" disabled={isSubmitting} style={{ marginTop: 8, background: 'linear-gradient(135deg,#0400ba,#020054)', color: 'white', padding: 12, borderRadius: 10, border: 'none', fontWeight: 700 }}>
              {isSubmitting ? 'Enviando...' : 'Enviar link'}
            </button>
            <Link href="/auth" style={{ textAlign: 'center', marginTop: 8, color: '#0400BA', fontWeight: 600 }}>Voltar ao login</Link>
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}
