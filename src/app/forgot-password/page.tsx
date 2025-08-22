'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import styles from './page.module.css';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    const { error } = await resetPassword(email);
    if (error) setMsg('Erro: ' + error.message);
    else setMsg('Enviamos um link para seu email!');

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.forgotContainer}>
      <h2>Recuperar senha</h2>
      <input
        type="email"
        placeholder="Seu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar link'}
      </Button>
      {msg && <p>{msg}</p>}
      <Button type="button" className={styles.backButton} onClick={() => router.push('/login')}>
        Voltar ao login
      </Button>
    </form>
  );
}