'use client';

import React, { useMemo, useState } from 'react';

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: '4px 0 8px' }}>{title}</h3>

      <label>
        <span>Título *</span>
        <input
          name="titulo"
          type="text"
          required
          value={form.titulo}
          onChange={handleChange}
          placeholder="Ex.: Consulta com cardiologista"
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
      </label>

      <label>
        <span>Descrição</span>
        <textarea
          name="descricao"
          value={form.descricao ?? ''}
          onChange={handleChange}
          placeholder="Observações, orientações, documentos..."
          rows={3}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
      </label>

      <label>
        <span>Data e Hora</span>
        <input
          name="data_hora"
          type="datetime-local"
          value={form.data_hora ? form.data_hora : ''}
          onChange={handleChange}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
      </label>

      <label>
        <span>Local</span>
        <input
          name="local"
          type="text"
          value={form.local ?? ''}
          onChange={handleChange}
          placeholder="Ex.: Hospital X, Clínica Y"
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
      </label>

      <label>
        <span>Tipo</span>
        <select
          name="tipo"
          value={form.tipo || 'consulta'}
          onChange={handleChange}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
        >
          <option value="consulta">Consulta</option>
          <option value="exame">Exame</option>
          <option value="procedimento">Procedimento</option>
          <option value="outros">Outros</option>
        </select>
      </label>

      <label>
        <span>Lembrete (minutos antes)</span>
        <input
          name="lembrete_minutos"
          type="number"
          min={0}
          value={form.lembrete_minutos ?? 60}
          onChange={handleChange}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
      </label>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' }}>Cancelar</button>
        <button type="submit" disabled={submitting} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0400BA', color: 'white' }}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
