'use client'

import pageStyles from '@/app/(dashboard)/perfil/page.module.css';
import modalStyles from '@/app/(dashboard)/perfil/modal.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import GerenciarIdososVinculados, { GerenciarIdososVinculadosRef } from '@/components/perfil/GerenciarIdososVinculados';
import AddIdosoModal from '@/components/modals/AddIdosoModal';
import { ToastContainer } from '@/components/Toast';

export default function FamiliaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showAddIdosoModal, setShowAddIdosoModal] = useState(false);
  const idososRef = useRef<GerenciarIdososVinculadosRef>(null);

  if (!user) {
    return (
      <main className={pageStyles.main}>
        <div className={pageStyles.mainContent}>
          <div className={pageStyles.content}>
            <p>Você precisa estar autenticado.</p>
          </div>
        </div>
      </main>
    );
  }

  const isFamiliar = user?.user_metadata?.account_type === 'familiar';
  if (!isFamiliar) {
    return (
      <main className={pageStyles.main}>
        <div className={pageStyles.mainContent}>
          <div className={pageStyles.content}>
            <p>Esta página é exclusiva para usuários do tipo Familiar.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={pageStyles.main}>
      <div className={pageStyles.mainContent}>
        <div className={pageStyles.content}>
          <ToastContainer />
          <div className={pageStyles.pageHeader}>
            <h1 className={pageStyles.content_title}>Família</h1>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button 
              className={pageStyles.actionButton}
              onClick={() => setShowAddIdosoModal(true)}
            >
              Adicionar Idoso
            </button>
            <button 
              className={pageStyles.actionButton}
              onClick={() => idososRef.current?.refresh()}
            >
              Atualizar Lista
            </button>
            <button 
              className={pageStyles.actionButton}
              onClick={() => router.push('/perfil')}
            >
              Voltar para Perfil
            </button>
          </div>

          <section className={pageStyles.content_info}>
            <div className={pageStyles.profileSection}>
              <GerenciarIdososVinculados ref={idososRef} />

              <AddIdosoModal
                isOpen={showAddIdosoModal}
                onClose={() => setShowAddIdosoModal(false)}
                onSuccess={() => {
                  idososRef.current?.refresh();
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
