'use client';
import { useState } from 'react';
import styles from './AddForm.module.css';

interface AddMedicamentoFormProps {
  onSave: (nome: string, dosagem: string, data: string) => Promise<void>;
  onCancel: () => void;
}

export function AddMedicamentoForm({ onSave, onCancel }: AddMedicamentoFormProps) {
  const [nome, setNome] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 16)); // Padrão: data e hora atual
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !data) {
      alert('Por favor, preencha o nome e a data.');
      return;
    }
    setLoading(true);
    await onSave(nome, dosagem, data);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="nome">Nome do Medicamento</label>
        <input
          id="nome"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="dosagem">Dosagem (ex: 500mg)</label>
        <input
          id="dosagem"
          type="text"
          value={dosagem}
          onChange={(e) => setDosagem(e.target.value)}
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