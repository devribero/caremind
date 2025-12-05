'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingModal } from '@/components/features/OnboardingModal';

export default function OnboardingPage() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phone, setPhone] = useState('');

  // Carrega dados existentes do perfil/metadados para preencher o formulário
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      // Abre o modal quando o usuário está carregado
      setIsModalOpen(true);

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

  const handleClose = () => {
    setIsModalOpen(false);
  };

  if (authLoading) {
    return (
      <main style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{
          fontSize: '1.1rem',
          color: '#64748b',
          fontWeight: 500
        }}>
          Carregando...
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {user && (
        <OnboardingModal
          isOpen={isModalOpen}
          onClose={handleClose}
          userId={user.id}
        />
      )}
    </main>
  );
}
