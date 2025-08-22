'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './page.module.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg('Erro: ' + error.message);
    else setMsg('Senha atualizada com sucesso!');
  };

  return (
    <form onSubmit={handleSubmit} className={styles.resetContainer}>
      <input 
        type="password" 
        placeholder="Nova senha" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        required 
      />
      <button type="submit" className={styles.submitButton}>
        Alterar Senha
      </button>
      {msg && <p>{msg}</p>}
    </form>
  );
}