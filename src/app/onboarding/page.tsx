'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import cardStyles from '@/components/MedicamentoCard.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega dados existentes do perfil/metadados para preencher o formulário
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      // Tenta pelos metadados do usuário
      const metaPhone = (user.user_metadata as any)?.phone as string | undefined;
      if (metaPhone) {
        setPhone(metaPhone);
        return;
      }
      // Fallback: tenta buscar no perfil caso eventualmente exista a coluna
      const { data } = await supabase
        .from('perfis')
        .select('telefone, phone')
        .eq('id', user.id)
        .single();
      const tablePhone = (data?.telefone as string) || (data?.phone as string);
      if (tablePhone) setPhone(tablePhone);
    };
    if (!authLoading) loadProfile();
  }, [user, authLoading, supabase]);

  const goToDashboardByProfile = async () => {
    // Busca o perfil para decidir o destino final
    const userId = user?.id;
    if (!userId) {
      router.push('/dashboard');
      return;
    }
    const { data } = await supabase
      .from('perfis')
      .select('tipo')
      .eq('user_id', userId)
      .single();

    const tipo = (data?.tipo as string | undefined)?.toLowerCase();
    // Rotas-alvo conforme requisito; se não existirem, usar fallback
    const target = tipo === 'familiar' ? '/familiar-dashboard' : '/dashboard';
    // Fallback para rota existente caso as específicas não existam
    router.push(target || '/dashboard');
  };

  const handleSaveContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (!user) throw new Error('Usuário não autenticado');
      // Atualiza metadados do usuário (armazenamento recomendado)
      const { error: metaErr } = await supabase.auth.updateUser({ data: { phone } });
      if (metaErr) throw metaErr;
      await goToDashboardByProfile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar dados';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    await goToDashboardByProfile();
  };

  if (authLoading) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        Carregando...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(135deg, #a8b8ff 0%, #9b7eff 100%)',
      }}
    >
      <div
        className={cardStyles.card}
        style={{
          width: '100%',
          maxWidth: 560,
        }}
      >
        <div style={{ marginBottom: 8, color: '#6b7280', fontSize: 14 }}>Passo 2 de 2</div>
        <h1 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700, color: '#111827' }}>Complete seu perfil</h1>
        <p style={{ marginBottom: 20, color: '#4b5563' }}>
          Informe seus dados adicionais. Você pode pular e fazer isso depois.
        </p>

        <form onSubmit={handleSaveContinue} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="phone" style={{ color: '#111827', fontWeight: 600 }}>Número (telefone)</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb' }}
            />
          </div>

          {error && (
            <div style={{ color: '#b00020', fontSize: 14 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: '#2563eb',
                color: 'white',
                border: 0,
                cursor: 'pointer',
                flex: 1,
              }}
            >
              {saving ? 'Salvando...' : 'Salvar e Continuar'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'transparent',
                color: '#2563eb',
                border: '1px solid #2563eb',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              Pular por enquanto
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
