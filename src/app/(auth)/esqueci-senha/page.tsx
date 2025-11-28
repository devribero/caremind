'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { Waves } from '@/components/shared/Waves'
import { Button } from '@/components/ui/button'
import styles from '../auth/page.module.css'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/atualizar-senha`,
    })

    if (resetError) {
      setError('Erro ao enviar e-mail. Verifique o endereço.')
    } else {
      setMessage('Verifique seu e-mail para o link de redefinição.')
    }
    setLoading(false)
  }

  return (
    <main className={styles.main}>
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
          <div className={styles.formContainer}>
            <h1 className={styles.title}>Recuperar Senha</h1>

            <form onSubmit={handleReset} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  required
                  autoComplete="email"
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}
              {message && (
                <div style={{
                  background: 'rgba(209, 250, 229, 0.95)',
                  backdropFilter: 'blur(10px)',
                  color: '#065f46',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  textAlign: 'center',
                  border: '1px solid rgba(167, 243, 208, 0.5)',
                }}>
                  {message}
                </div>
              )}

              <Button type="submit" size="lg" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Link'}
              </Button>
            </form>

            <div className={styles.switchMode}>
              <p className={styles.switchText}>
                Lembrou sua senha?
                <Link href="/auth" className={styles.switchButton}>
                  Fazer login
                </Link>
              </p>
            </div>

            <div style={{
              height: '1px',
              background: 'rgba(255, 255, 255, 0.2)',
              margin: '1.5rem 0'
            }} />

            <div className={styles.backButtonContainer}>
              <Link href="/" className={styles.backButton}>
                Voltar ao Início
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}