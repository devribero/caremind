'use client';

import React, { useMemo, useState } from 'react';
import styles from '@/components/forms/AddForm.module.css';

export type Compromisso = {
  id?: string;
  titulo: string;
  descricao?: string | null;
  data_hora?: string | null; // ISO string
  local?: string | null;
  tipo?: 'consulta' | 'exame' | 'procedimento' | 'outros';
  lembrete_minutos?: number | null;
};

export function AddEditCompromissoForm({
  compromisso,
  onSave,
  onCancel,
}: {
  compromisso?: Compromisso | null;
  onSave: (data: Compromisso) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Compromisso>(() => ({
    titulo: compromisso?.titulo || '',
    descricao: compromisso?.descricao ?? '',
    data_hora: compromisso?.data_hora ?? '',
    local: compromisso?.local ?? '',
    tipo: (compromisso?.tipo as any) || 'consulta',
    lembrete_minutos: compromisso?.lembrete_minutos ?? 60,
  }));
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => (compromisso ? 'Editar Compromisso' : 'Adicionar Compromisso'), [compromisso]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'lembrete_minutos' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo || form.titulo.trim() === '') return;
    setSubmitting(true);
    try {
      await onSave({ ...form });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="titulo">Título *</label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          value={form.titulo}
          onChange={handleChange}
          placeholder="Ex.: Consulta com cardiologista"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="descricao">Descrição (opcional)</label>
        <input
          id="descricao"
          name="descricao"
          type="text"
          value={form.descricao ?? ''}
          onChange={handleChange}
          placeholder="Observações, orientações, documentos..."
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="data_hora">Data e Hora</label>
        <input
          id="data_hora"
          name="data_hora"
          type="datetime-local"
          value={form.data_hora ? form.data_hora : ''}
          onChange={handleChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="local">Local</label>
        <input
          id="local"
          name="local"
          type="text"
          value={form.local ?? ''}
          onChange={handleChange}
          placeholder="Ex.: Hospital X, Clínica Y"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="tipo">Tipo</label>
        <select
          id="tipo"
          className={styles.select}
          name="tipo"
          value={form.tipo || 'consulta'}
          onChange={handleChange}
        >
          <option value="consulta">Consulta</option>
          <option value="exame">Exame</option>
          <option value="procedimento">Procedimento</option>
          <option value="outros">Outros</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="lembrete_minutos">Lembrete (minutos antes)</label>
        <input
          id="lembrete_minutos"
          name="lembrete_minutos"
          type="number"
          min={0}
          value={form.lembrete_minutos ?? 60}
          onChange={handleChange}
        />
        <div className={styles.hint}>Padrão: 60 minutos</div>
      </div>

      <div className={styles.buttonGroup}>
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Cancelar
        </button>
        <button type="submit" disabled={submitting} className={styles.saveButton}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
