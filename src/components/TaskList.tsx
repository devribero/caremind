// Em: src/app/components/TaskList.tsx

"use client";

import React, { useState } from 'react';
import styles from './TaskList.module.css';

// URL base da API
const API_BASE_URL = '/api/tarefas';

// Interface que define a estrutura de uma tarefa
interface Tarefa {
  id: number;
  texto: string;
  concluida: boolean;
}

// Props que o componente recebe
interface TaskListProps {
  initialTarefas: Tarefa[];
}

export default function TaskList({ initialTarefas }: TaskListProps) {
  // Estados do componente
  const [tarefas, setTarefas] = useState(initialTarefas);
  const [error, setError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Função para adicionar nova tarefa
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault(); // Previne o recarregamento da página
    
    // Valida se o texto não está vazio
    if (newTaskText.trim() === '') return;

    setIsLoading(true);
    setError(null);

    try {
      // Faz a requisição para criar a tarefa
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: newTaskText }),
      });

      // Verifica se a requisição foi bem-sucedida
      if (!response.ok) {
        throw new Error('Falha ao salvar a tarefa');
      }

      // Pega a tarefa criada da resposta
      const addedTask = await response.json();
      
      // Adiciona a nova tarefa no topo da lista
      setTarefas([addedTask, ...tarefas]);
      
      // Limpa o campo de texto
      setNewTaskText('');
      
    } catch (err) {
      setError("Não foi possível adicionar a tarefa.");
      console.error('Erro ao adicionar tarefa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para deletar uma tarefa
  const handleDeletarTarefa = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      // Faz a requisição para deletar a tarefa
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      // Verifica se a requisição foi bem-sucedida
      if (!response.ok) {
        throw new Error('Falha ao deletar a tarefa');
      }

      // Remove a tarefa da lista local
      setTarefas(tarefas.filter(tarefa => tarefa.id !== id));
      
    } catch (err) {
      setError("Não foi possível deletar a tarefa.");
      console.error('Erro ao deletar tarefa:', err);
    }
  };

  // Função para marcar/desmarcar tarefa como concluída
  const handleConcluirTarefa = async (tarefa: Tarefa) => {
    try {
      // Inverte o status da tarefa
      const novoStatus = !tarefa.concluida;
      
      // Faz a requisição para atualizar a tarefa
      const response = await fetch(`${API_BASE_URL}/${tarefa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluida: novoStatus }),
      });

      // Verifica se a requisição foi bem-sucedida
      if (!response.ok) {
        throw new Error('Falha ao atualizar a tarefa');
      }

      // Atualiza a tarefa na lista local
      setTarefas(tarefas.map(t => 
        t.id === tarefa.id ? { ...t, concluida: novoStatus } : t
      ));
      
    } catch (err) {
      setError("Não foi possível atualizar a tarefa.");
      console.error('Erro ao atualizar tarefa:', err);
    }
  };

  return (
    <div className={styles.container}>
      {/* Formulário para adicionar nova tarefa */}
      <form onSubmit={handleAddTask} className={styles.addForm}>
        <input
          type="text"
          className={styles.addInput}
          placeholder="O que precisa ser feito?"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={styles.addButton}
          disabled={isLoading}
        >
          {isLoading ? 'Adicionando...' : 'Adicionar'}
        </button>
      </form>

      {/* Mensagem de erro */}
      {error && (
        <div className={styles.errorMessage}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      
      {/* Lista de tarefas */}
      <ul className={styles.taskList}>
        {tarefas.length === 0 ? (
          <li className={styles.emptyMessage}>
            <p>Nenhuma tarefa cadastrada.</p>
            <p>Adicione sua primeira tarefa acima!</p>
          </li>
        ) : (
          tarefas.map(tarefa => (
            <li key={tarefa.id} className={styles.tarefaContainer}>
              {/* Botão para marcar como concluída */}
              <button 
                onClick={() => handleConcluirTarefa(tarefa)} 
                className={styles.iconButton}
                title={tarefa.concluida ? 'Desmarcar como concluída' : 'Marcar como concluída'}
              >
                {tarefa.concluida ? '✅' : '🔲'}
              </button>
              
              {/* Texto da tarefa */}
              <p className={`${styles.tarefaTexto} ${tarefa.concluida ? styles.tarefaConcluida : ''}`}>
                {tarefa.texto}
              </p>
              
              {/* Botão para deletar */}
              <button 
                onClick={() => handleDeletarTarefa(tarefa.id)} 
                className={styles.iconButton}
                title="Excluir tarefa"
              >
                🗑️
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}