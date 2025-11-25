'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useIdoso } from '@/contexts/IdosoContext';
import { FullScreenLoader } from '@/components/features/FullScreenLoader';
import DashboardClient from '@/components/features/DashboardClient';

export default function FamiliarDashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { idosoSelecionadoId, listaIdososVinculados, loading: idososLoading } = useIdoso();

  // O PrivateLayout já cuida da verificação de autenticação

  // Só mostra loader enquanto carrega os idosos vinculados
  if (idososLoading) {
    return <FullScreenLoader />;
  }

  const tipo = (profile?.tipo || user?.user_metadata?.account_type) as string | undefined;
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
