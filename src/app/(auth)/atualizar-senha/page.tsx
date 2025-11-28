'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Waves } from '@/components/shared/Waves'
import { Button } from '@/components/ui/button'
import styles from '../auth/page.module.css'

export default function AtualizarSenha() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      setError('Erro ao atualizar a senha.')
    } else {
      alert('Senha atualizada com sucesso!')
      router.push('/dashboard')
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
            <h1 className={styles.title}>Criar Nova Senha</h1>

            <form onSubmit={handleUpdate} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="password">Nova senha</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirme sua senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <Button type="submit" size="lg" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
            </form>

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