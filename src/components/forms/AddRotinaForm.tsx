'use client';

import { useState } from 'react';
import styles from './AddForm.module.css';

interface AddRotinaFormProps {
  onSave: (titulo: string, descricao: string, data: string) => Promise<void>;
  onCancel: () => void;
}

export function AddRotinaForm({ onSave, onCancel }: AddRotinaFormProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  // Formatando a data atual de uma maneira mais segura
  const [data, setData] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !data) {
      alert('Por favor, preencha o título e a data.');
      return;
    }

    try {
      setLoading(true);
      // Validar se a data é válida antes de enviar
      const dateObj = new Date(data);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Data inválida');
      }
      await onSave(titulo, descricao, data);
    } catch (error) {
      alert('Erro ao salvar: Data inválida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="titulo">Título da Rotina</label>
        <input
          id="titulo"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="descricao">Descrição</label>
        <input
          id="descricao"
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="data">Data e Hora</label>
        <input
          id="data"
          type="datetime-local"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>
      <div className={styles.buttonGroup}>
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} className={styles.saveButton}>
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}