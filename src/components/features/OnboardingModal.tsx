'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Modal } from './Modal';
import styles from './OnboardingModal.module.css';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export function OnboardingModal({ isOpen, onClose, userId }: OnboardingModalProps) {
    const router = useRouter();
    const supabase = createClient();

    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const goToDashboardByProfile = async () => {
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
        const target = tipo === 'familiar' ? '/familiar-dashboard' : '/dashboard';
        router.push(target || '/dashboard');
    };

    const handleSaveContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            // Atualiza metadados do usuário
            const { error: metaErr } = await supabase.auth.updateUser({ data: { phone } });
            if (metaErr) throw metaErr;

            onClose();
            await goToDashboardByProfile();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao salvar dados';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = async () => {
        onClose();
        await goToDashboardByProfile();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleSkip} title="Complete seu perfil">
            <div className={styles.onboardingContent}>
                <div className={styles.stepIndicator}>Passo 2 de 2</div>

                <p className={styles.description}>
                    Informe seus dados adicionais. Você pode pular e fazer isso depois.
                </p>

                <form onSubmit={handleSaveContinue} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="phone" className={styles.label}>
                            Número (telefone)
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className={styles.input}
                        />
                    </div>

                    {error && (
                        <div className={styles.error}>{error}</div>
                    )}

                    <div className={styles.buttonGroup}>
                        <button
                            type="submit"
                            disabled={saving}
                            className={styles.primaryButton}
                        >
                            {saving ? 'Salvando...' : 'Salvar e Continuar'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSkip}
                            className={styles.secondaryButton}
                        >
                            Pular por enquanto
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
