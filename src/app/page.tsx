import TaskList from '../components/TaskList'; 
import styles from './page.module.css';     

async function getTarefas() {
  try {
    const response = await fetch('http://localhost:3000/api/tarefas', {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Falha ao buscar os dados da API');
    }
    return response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function Home() {
  const tarefas = await getTarefas();

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Minhas Tarefas (Web)</h1>
      </div>

      <TaskList initialTarefas={tarefas} />
    </main>
  );
}