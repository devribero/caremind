'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { Header } from '@/components/headers/HeaderDashboard';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AddMedicamentoForm } from '@/components/forms/AddMedicamentoForm';
import { Modal } from '@/components/Modal';
import MedicamentoCard from '@/components/MedicamentoCard';

// Estilos
import styles from './page.module.css';

type Medicamento = {
  id: string;
  nome: string;
  dosagem?: string;
  frequencia?: any;
  quantidade?: number;
  created_at: string;
};

export default function Remedios() {
    // Hooks e estados (sem alterações)
    const { user } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingMedicamento, setEditingMedicamento] = useState<Medicamento | null>(null);

    // Funções (sem alterações)
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);
    const handleOpenAddForm = () => setShowAddForm(true);
    const handleCancelAddForm = () => setShowAddForm(false);
    const handleCancelEditForm = () => {
        setShowEditForm(false);
        setEditingMedicamento(null);
    };
    
    const handleSaveMedicamento = async (
        nome: string, dosagem: string | null, frequencia: any, quantidade: number
    ) => {
        // ... sua lógica de salvar ...
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { alert('Usuário não autenticado. Faça login para continuar.'); return; }
        const response = await fetch('/api/medicamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ nome, dosagem, frequencia, quantidade }),
        });
        if (!response.ok) { const errorData = await response.json().catch(() => ({})); alert(errorData.erro || 'Falha ao salvar medicamento.'); return; }
        const novo: Medicamento = await response.json();
        setMedicamentos((prev) => [novo, ...prev]);
        setShowAddForm(false);
    };

    const handleEditClick = (med: Medicamento) => {
        setEditingMedicamento(med);
        setShowEditForm(true);
    };

    const handleUpdateMedicamento = async (
        nome: string, dosagem: string | null, frequencia: any, quantidade: number
    ) => {
        if (!editingMedicamento) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { alert('Usuário não autenticado. Faça login para continuar.'); return; }

        // Optimistic update
        const original = medicamentos;
        const updatedLocal: Medicamento = {
            ...editingMedicamento,
            nome,
            dosagem: dosagem ?? undefined,
            frequencia,
            quantidade,
        };
        setMedicamentos(prev => prev.map(m => m.id === editingMedicamento.id ? updatedLocal : m));

        try {
            const response = await fetch(`/api/medicamentos/${editingMedicamento.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ nome, dosagem, frequencia, quantidade })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Falha ao atualizar medicamento.');
            }
            const atualizado: Medicamento = await response.json();
            setMedicamentos(prev => prev.map(m => m.id === atualizado.id ? atualizado : m));
            setShowEditForm(false);
            setEditingMedicamento(null);
        } catch (err: any) {
            alert(err.message);
            // rollback
            setMedicamentos(original);
        }
    };

    const handleDeleteMedicamento = async (id: string) => {
        const confirmar = confirm('Tem certeza que deseja excluir este medicamento?');
        if (!confirmar) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { alert('Usuário não autenticado. Faça login para continuar.'); return; }

        // Optimistic removal
        const original = medicamentos;
        setMedicamentos(prev => prev.filter(m => m.id !== id));

        try {
            const response = await fetch(`/api/medicamentos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (!response.ok && response.status !== 204) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Falha ao excluir medicamento.');
            }
        } catch (err: any) {
            alert(err.message);
            // rollback
            setMedicamentos(original);
        }
    };
    
    useEffect(() => {
        const fetchMedicamentos = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Usuário não autenticado. Faça login para continuar.');
                const response = await fetch('/api/medicamentos', { method: 'GET', headers: { 'Authorization': `Bearer ${session.access_token}` } });
                if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.erro || 'Falha ao carregar os medicamentos.'); }
                const data: Medicamento[] = await response.json();
                setMedicamentos(data);
            } catch (err: any) { setError(err.message); } finally { setLoading(false); }
        };
        fetchMedicamentos();
    }, [supabase]);

    // --- RENDER CONTENT SIMPLIFICADO ---
    const renderContent = () => {
        if (loading) {
            return <FullScreenLoader />;
        }
        if (error) {
            return <p className={styles.errorText}>Erro: {error}</p>;
        }
        if (medicamentos.length > 0) {
            // Apenas renderiza a grade de cards
            return (
                <div className={styles.gridContainer}>
                    {medicamentos.map((medicamento) => (
                        <MedicamentoCard
                            key={medicamento.id}
                            medicamento={medicamento}
                            onEdit={handleEditClick}
                            onDelete={handleDeleteMedicamento}
                        />
                    ))}
                </div>
            );
        }
        // Mensagem de estado vazio
        return (
            <div className={styles.emptyState}>
                <p>Nenhum medicamento encontrado.</p>
                <p>Clique em "Adicionar Medicamento" acima para começar.</p>
            </div>
        );
    };

    return (
        <main className={styles.main}>
            <Header isMenuOpen={isMenuOpen} onMenuToggle={toggleMenu} />
            <Sidebar isOpen={isMenuOpen} onClose={closeMenu} />
            
            <div className={`${isMenuOpen ? styles.contentPushed : ''} ${styles.mainContent}`}>
                <div className={styles.content}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.content_title}>Remédios</h1>
                    </div>
                    
                    <section className={styles.content_info}>
                        {/* --- CORREÇÃO: Botão sutil adicionado aqui --- */}
                        {!loading && !error && (
                            <div className={styles.actionsContainer}>
                                <button className={styles.addButton} onClick={handleOpenAddForm}>
                                    <span className={styles.addIcon}>+</span>
                                    Adicionar Medicamento
                                </button>
                            </div>
                        )}

                        {/* O conteúdo (cards ou mensagem) é renderizado abaixo */}
                        {renderContent()}
                    </section>
                </div>
            </div>

            <Modal isOpen={showAddForm} onClose={handleCancelAddForm} title="Adicionar medicamento">
                <AddMedicamentoForm onSave={handleSaveMedicamento} onCancel={handleCancelAddForm} />
            </Modal>

            <Modal isOpen={showEditForm} onClose={handleCancelEditForm} title="Editar medicamento">
                {editingMedicamento && (
                    <AddMedicamentoForm
                        onSave={handleUpdateMedicamento}
                        onCancel={handleCancelEditForm}
                        medicamento={{
                            id: editingMedicamento.id,
                            nome: editingMedicamento.nome,
                            dosagem: editingMedicamento.dosagem ?? null,
                            quantidade: editingMedicamento.quantidade ?? 0,
                            frequencia: editingMedicamento.frequencia ?? null,
                        } as any}
                    />
                )}
            </Modal>
        </main>
    );
}