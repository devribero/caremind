'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Componentes e hooks
import { Header } from '@/components/headers/HeaderDashboard';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AddRotinaForm } from '@/components/forms/AddRotinaForm'; // IMPORTANTE: Crie este componente
import { Modal } from '@/components/Modal';
import RotinaCard from '@/components/RotinasCard'; // IMPORTANTE: Use o RotinasCard

// Estilos (pode usar o mesmo do 'remedios' ou criar um novo)
import styles from './page.module.css';

// Tipo para os dados de uma rotina
type Rotina = {
  id: string;
  titulo: string;
  descricao?: string;
  frequencia?: any;
  created_at: string;
};

export default function Rotinas() {
    // Hooks e estados
    const { user } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [rotinas, setRotinas] = useState<Rotina[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRotina, setEditingRotina] = useState<Rotina | null>(null);

    // Funções de menu e formulário
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);
    const handleOpenAddForm = () => setShowAddForm(true);
    const handleCancelAddForm = () => setShowAddForm(false);
    const handleCancelEditForm = () => {
        setShowEditForm(false);
        setEditingRotina(null);
    };
    
    // Salvar nova rotina
    const handleSaveRotina = async (
        titulo: string, descricao: string | null, frequencia: any
    ) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { alert('Usuário não autenticado.'); return; }
        
        const response = await fetch('/api/rotinas', { // Endpoint de rotinas
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ titulo, descricao, frequencia }),
        });

        if (!response.ok) { const errorData = await response.json().catch(() => ({})); alert(errorData.erro || 'Falha ao salvar rotina.'); return; }
        
        const nova: Rotina = await response.json();
        setRotinas((prev) => [nova, ...prev]);
        setShowAddForm(false);
    };

    // Abrir modal de edição
    const handleEditClick = (rot: Rotina) => {
        setEditingRotina(rot);
        setShowEditForm(true);
    };

    // Atualizar uma rotina existente
    const handleUpdateRotina = async (
        titulo: string, descricao: string | null, frequencia: any
    ) => {
        if (!editingRotina) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { alert('Usuário não autenticado.'); return; }

        const original = rotinas;
        const updatedLocal: Rotina = { ...editingRotina, titulo, descricao: descricao ?? undefined, frequencia };
        setRotinas(prev => prev.map(r => r.id === editingRotina.id ? updatedLocal : r));

        try {
            const response = await fetch(`/api/rotinas/${editingRotina.id}`, { // Endpoint de rotinas
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ titulo, descricao, frequencia })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Falha ao atualizar rotina.');
            }
            const atualizada: Rotina = await response.json();
            setRotinas(prev => prev.map(r => r.id === atualizada.id ? atualizada : r));
            setShowEditForm(false);
            setEditingRotina(null);
        } catch (err: any) {
            alert(err.message);
            setRotinas(original); // Reverte em caso de erro
        }
    };

    // Excluir uma rotina
    const handleDeleteRotina = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta rotina?')) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { alert('Usuário não autenticado.'); return; }

        const original = rotinas;
        setRotinas(prev => prev.filter(r => r.id !== id));

        try {
            const response = await fetch(`/api/rotinas/${id}`, { // Endpoint de rotinas
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (!response.ok && response.status !== 204) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Falha ao excluir rotina.');
            }
        } catch (err: any) {
            alert(err.message);
            setRotinas(original); // Reverte em caso de erro
        }
    };
    
    // Buscar rotinas ao carregar a página
    useEffect(() => {
        const fetchRotinas = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Usuário não autenticado.');
                const response = await fetch('/api/rotinas', { method: 'GET', headers: { 'Authorization': `Bearer ${session.access_token}` } });
                if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.erro || 'Falha ao carregar as rotinas.'); }
                const data: Rotina[] = await response.json();
                setRotinas(data);
            } catch (err: any) { setError(err.message); } finally { setLoading(false); }
        };
        fetchRotinas();
    }, [supabase]);

    // Função para renderizar o conteúdo principal
    const renderContent = () => {
        if (loading) return <FullScreenLoader />;
        if (error) return <p className={styles.errorText}>Erro: {error}</p>;
        if (rotinas.length > 0) {
            return (
                <div className={styles.gridContainer}>
                    {rotinas.map((rotina) => (
                        <RotinaCard
                            key={rotina.id}
                            rotina={rotina}
                            onEdit={handleEditClick}
                            onDelete={handleDeleteRotina}
                        />
                    ))}
                </div>
            );
        }
        return (
            <div className={styles.emptyState}>
                <p>Nenhuma rotina encontrada.</p>
                <p>Clique em "Adicionar Rotina" acima para começar.</p>
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
                        <h1 className={styles.content_title}>Rotinas</h1>
                    </div>
                    
                    <section className={styles.content_info}>
                        {!loading && !error && (
                            <div className={styles.actionsContainer}>
                                <button className={styles.addButton} onClick={handleOpenAddForm}>
                                    <span className={styles.addIcon}>+</span>
                                    Adicionar Rotina
                                </button>
                            </div>
                        )}
                        {renderContent()}
                    </section>
                </div>
            </div>

            {/* Modal para Adicionar */}
            <Modal isOpen={showAddForm} onClose={handleCancelAddForm} title="Adicionar rotina">
                <AddRotinaForm onSave={handleSaveRotina} onCancel={handleCancelAddForm} />
            </Modal>

            {/* Modal para Editar */}
            <Modal isOpen={showEditForm} onClose={handleCancelEditForm} title="Editar rotina">
                {editingRotina && (
                    <AddRotinaForm
                        onSave={handleUpdateRotina}
                        onCancel={handleCancelEditForm}
                        rotina={editingRotina}
                    />
                )}
            </Modal>
        </main>
    );
}