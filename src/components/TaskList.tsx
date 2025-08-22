'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import styles from './TaskList.module.css';

interface Tarefa {
  id: number;
  texto: string;
  concluida: boolean;
  created_at: string;
  user_id: string;
}

interface TaskListProps {
  initialTarefas?: Tarefa[];
}

export default function TaskList({ initialTarefas = [] }: TaskListProps) {
  const { user } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>(initialTarefas);
  const [novoTexto, setNovoTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Função para obter o token de autenticação
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Carregar tarefas do usuário
  const carregarTarefas = async () => {
    if (!user) {
      setTarefas([]);
      return;
    }

    try {
      setLoading(true);
      const token = await getAuthToken();
      
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await fetch('/api/tarefas', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setTarefas(data);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao carregar tarefas');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Erro ao carregar tarefas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar tarefas quando o usuário estiver logado
  useEffect(() => {
    carregarTarefas();
  }, [user]);

  // Configurar real-time updates usando Supabase
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('tarefas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarefas',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Recarregar tarefas quando há mudanças
          carregarTarefas();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Adicionar nova tarefa
  const adicionarTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novoTexto.trim() || !user) return;

    try {
      const token = await getAuthToken();
      
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await fetch('/api/tarefas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          texto: novoTexto.trim(),
          concluida: false,
        }),
      });

      if (response.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      if (response.ok) {
        const novaTarefa = await response.json();
        setTarefas(prev => [novaTarefa, ...prev]);
        setNovoTexto('');
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao adicionar tarefa');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Erro ao adicionar tarefa:', err);
    }
  };

  // Alternar status de conclusão
  const alternarConclusao = async (id: number, concluida: boolean) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await fetch(`/api/tarefas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ concluida: !concluida }),
      });

      if (response.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      if (response.ok) {
        const tarefaAtualizada = await response.json();
        setTarefas(prev => 
          prev.map(tarefa => 
            tarefa.id === id ? tarefaAtualizada : tarefa
          )
        );
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao atualizar tarefa');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Erro ao atualizar tarefa:', err);
    }
  };

  // Excluir tarefa
  const excluirTarefa = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      const token = await getAuthToken();
      
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await fetch(`/api/tarefas/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      if (response.ok) {
        setTarefas(prev => prev.filter(tarefa => tarefa.id !== id));
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao excluir tarefa');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Erro ao excluir tarefa:', err);
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyMessage}>
          <p>Você precisa estar logado para ver suas tarefas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Minhas Tarefas
          <span className={styles.taskCount}>{tarefas.length}</span>
        </h2>
        <p className={styles.subtitle}>
          Olá, {user.email}! Organize suas tarefas de forma simples e eficiente.
        </p>
      </div>
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
          {error.includes('Sessão expirada') && (
            <button onClick={() => window.location.reload()}>
              Recarregar página
            </button>
          )}
        </div>
      )}

      {/* Formulário para adicionar tarefa */}
      <form onSubmit={adicionarTarefa} className={styles.addForm}>
        <input
          type="text"
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          placeholder="Digite uma nova tarefa..."
          className={styles.addInput}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!novoTexto.trim() || loading}
          className={styles.addButton}
        >
          {loading ? 'Adicionando...' : 'Adicionar'}
        </button>
      </form>

      {/* Lista de tarefas */}
      {loading && tarefas.length === 0 ? (
        <div className={styles.emptyMessage}>
          <p>Carregando suas tarefas...</p>
        </div>
      ) : tarefas.length === 0 ? (
        <div className={styles.emptyMessage}>
          <p>Nenhuma tarefa encontrada</p>
          <p>Adicione sua primeira tarefa acima para começar!</p>
        </div>
      ) : (
        <ul className={styles.taskList}>
          {tarefas.map((tarefa) => (
            <li key={tarefa.id} className={styles.tarefaContainer}>
              <button
                onClick={() => alternarConclusao(tarefa.id, tarefa.concluida)}
                className={`${styles.checkboxButton} ${
                  tarefa.concluida ? styles.checkboxChecked : ''
                }`}
              />
              
              <div className={styles.taskContent}>
                <p className={`${styles.tarefaTexto} ${
                  tarefa.concluida ? styles.tarefaConcluida : ''
                }`}>
                  {tarefa.texto}
                </p>
                <div className={styles.taskMeta}>
                  Criada em: {new Date(tarefa.created_at).toLocaleString('pt-BR')}
                </div>
              </div>
              
              <button
                onClick={() => excluirTarefa(tarefa.id)}
                className={styles.deleteButton}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}