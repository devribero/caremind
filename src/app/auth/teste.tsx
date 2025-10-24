'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function AlexaLogin() {
  const { signIn } = useAuth();
  const searchParams = useSearchParams();
  const redirect_uri = searchParams?.get('redirect_uri');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { data, error: signInError } = await signIn(email, password);

    if (signInError) {
      setError('Email ou senha incorretos');
      return;
    }

    // Gera um code JWT temporário
    const res = await fetch('/api/alexa-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const { code } = await res.json();

    // Redireciona Alexa com code
    router.push(`${redirect_uri}?code=${code}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
      <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} required />
      <button type="submit">Entrar</button>
      {error && <div>{error}</div>}
    </form>
  );
}
