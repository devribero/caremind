'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useIdoso } from '@/contexts/IdosoContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import DashboardClient from '@/components/DashboardClient';

export default function FamiliarDashboardPage() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const { idosoSelecionadoId, listaIdososVinculados, loading: idososLoading } = useIdoso();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [loading, user, router]);

  if (loading || idososLoading) {
    return <FullScreenLoader />;
  }

  if (!user) return null;

  const tipo = (profile?.tipo || user.user_metadata?.account_type) as string | undefined;
  const isFamiliar = (tipo || '').toLowerCase() === 'familiar';

  if (!isFamiliar) {
    return (
      <main style={{ padding: 24 }}>
        <h2>Esta página é exclusiva para usuários do tipo Familiar.</h2>
      </main>
    );
  }

  if (!listaIdososVinculados.length) {
    return (
      <main style={{ padding: 24 }}>
        <h2>Nenhum idoso vinculado.</h2>
        <p>Adicione um idoso na página de Perfil &gt; Família.</p>
      </main>
    );
  }

  if (!idosoSelecionadoId) {
    return (
      <main style={{ padding: 24 }}>
        <h2>Nenhum idoso selecionado.</h2>
        <p>Selecione um idoso no seletor no topo para visualizar o dashboard.</p>
      </main>
    );
  }

  return (
    <DashboardClient readOnly idosoId={idosoSelecionadoId} />
  );
}
