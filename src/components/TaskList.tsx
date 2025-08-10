// Em: src/app/components/TaskList.tsx

"use client";

import React, { useState } from 'react';
import styles from './TaskList.module.css';

const API_BASE_URL = '/api/tarefas';

interface Tarefa {
  id: number;
  texto: string;
  concluida: boolean;
}

interface TaskListProps {
  initialTarefas: Tarefa[];
}

export default function TaskList({ initialTarefas }: TaskListProps) {
  const [tarefas, setTarefas] = useState(initialTarefas);
  const [error, setError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState(''); // <-- Estado para o novo texto

  // --- NOVA FUNÇÃO PARA ADICIONAR TAREFA ---
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault(); // Previne o recarregamento da página
    if (newTaskText.trim() === '') return;

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: newTaskText }),
      });
      if (!response.ok) throw new Error('Falha ao salvar a tarefa');

      const addedTask = await response.json();
      // Adiciona a nova tarefa no topo da lista e limpa o input
      setTarefas([addedTask, ...tarefas]);
      setNewTaskText('');
    } catch (err) {
      setError("Não foi possível adicionar a tarefa.");
    }
  };

  const handleDeletarTarefa = async (id: number) => { /* ... sua função continua a mesma ... */ };
  const handleConcluirTarefa = async (tarefa: Tarefa) => { /* ... sua função continua a mesma ... */ };

  return (
    <div className={styles.container}>
      {/* --- FORMULÁRIO DE ADIÇÃO --- */}
      <form onSubmit={handleAddTask} className={styles.addForm}>
        <input
          type="text"
          className={styles.addInput}
          placeholder="O que precisa ser feito?"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
        />
        <button type="submit" className={styles.addButton}>Adicionar</button>
      </form>

      {error && <p className={styles.errorText}>{error}</p>}
      
      {/* --- LISTA DE TAREFAS --- */}
      <ul className={styles.taskList}>
        {tarefas.length === 0 ? (
          <p className={styles.emptyText}>Nenhuma tarefa cadastrada.</p>
        ) : (
          tarefas.map(item => (
            <li key={item.id} className={styles.tarefaContainer}>
              <button onClick={() => handleConcluirTarefa(item)} className={styles.iconButton}>
                {item.concluida ? '✅' : '🔲'}
              </button>
              <p className={`${styles.tarefaTexto} ${item.concluida ? styles.tarefaConcluida : ''}`}>
                {item.texto}
              </p>
              <button onClick={() => handleDeletarTarefa(item.id)} className={styles.iconButton}>
                🗑️
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

// Obs: Colei as funções handleDeletar e handleConcluir aqui para referência,
// mas você pode apenas adicionar a nova handleAddTask e o form no seu arquivo existente.