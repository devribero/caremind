'use client';

import React, { useMemo, useState, useEffect } from 'react';
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
    data_hora: compromisso?.data_hora ?? new Date().toISOString().slice(0, 16),
    local: compromisso?.local ?? '',
    tipo: (compromisso?.tipo as any) || 'consulta',
    lembrete_minutos: compromisso?.lembrete_minutos ?? 60,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const title = useMemo(() => (compromisso ? 'Editar Compromisso' : 'Adicionar Compromisso'), [compromisso]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'lembrete_minutos' ? Number(value) : value,
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!form.titulo || form.titulo.trim() === '') {
      errors.titulo = 'O título é obrigatório';
    }
    
    if (!form.data_hora) {
      errors.data_hora = 'A data e hora são obrigatórias';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    try {
      await onSave({ ...form });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Efeito para rolar até o primeiro erro quando houver validação
  useEffect(() => {
    const firstError = Object.keys(formErrors)[0];
    if (firstError) {
      const element = document.querySelector(`[data-field="${firstError}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [formErrors]);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={`${styles.formGroup} ${formErrors.titulo ? styles.hasError : ''}`} data-field="titulo">
        <label htmlFor="titulo">
          Título
          {formErrors.titulo && <span className={styles.errorText}> - {formErrors.titulo}</span>}
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          value={form.titulo}
          onChange={(e) => {
            setForm(prev => ({ ...prev, titulo: e.target.value }));
            if (formErrors.titulo) {
              setFormErrors(prev => ({ ...prev, titulo: '' }));
            }
          }}
          placeholder="Ex.: Consulta com cardiologista"
          className={formErrors.titulo ? styles.inputError : ''}
          aria-invalid={!!formErrors.titulo}
          aria-describedby={formErrors.titulo ? 'titulo-error' : undefined}
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

      <div className={`${styles.formGroup} ${formErrors.data_hora ? styles.hasError : ''}`} data-field="data_hora">
        <label htmlFor="data_hora">
          Data e Hora
          {formErrors.data_hora && <span className={styles.errorText}> - {formErrors.data_hora}</span>}
        </label>
        <input
          id="data_hora"
          name="data_hora"
          type="datetime-local"
          value={form.data_hora || ''}
          onChange={(e) => {
            setForm(prev => ({ ...prev, data_hora: e.target.value }));
            if (formErrors.data_hora) {
              setFormErrors(prev => ({ ...prev, data_hora: '' }));
            }
          }}
          className={formErrors.data_hora ? styles.inputError : ''}
          aria-invalid={!!formErrors.data_hora}
          aria-describedby={formErrors.data_hora ? 'data_hora-error' : undefined}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="local">Local (opcional)</label>
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
        <select
          id="lembrete_minutos"
          name="lembrete_minutos"
          className={styles.select}
          value={form.lembrete_minutos ?? 60}
          onChange={handleChange}
        >
          <option value="5">5 minutos antes</option>
          <option value="15">15 minutos antes</option>
          <option value="30">30 minutos antes</option>
          <option value="60">1 hora antes</option>
          <option value="1440">1 dia antes</option>
          <option value="2880">2 dias antes</option>
        </select>
      </div>

      <div className={styles.buttonGroup}>
        <button 
          type="button" 
          onClick={onCancel} 
          className={styles.cancelButton}
          disabled={submitting}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={submitting} 
          className={`${styles.saveButton} ${submitting ? styles.loading : ''}`}
        >
          {submitting ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Salvando...</span>
            </>
          ) : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
