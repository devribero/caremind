'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardClient from '@/components/features/DashboardClient';
import { useProfile } from '@/hooks/useProfile';

export default function Dashboard() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();

  // Redireciona para familiar-dashboard se o usuário for do tipo familiar
  useEffect(() => {
    if (!profileLoading && profile?.tipo?.toLowerCase() === 'familiar') {
      router.replace('/familiar-dashboard');
    }
  }, [profile?.tipo, profileLoading, router]);

  // O PrivateLayout já cuida da verificação de autenticação
  // Aqui só renderizamos o DashboardClient
  return <DashboardClient />;
}