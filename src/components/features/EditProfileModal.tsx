'use client';

import { useState, ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequest } from '@/hooks/useAuthRequest';
import styles from './EditProfileModal.module.css';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { fullName: string; phone: string; dob: string }) => void;
  initialData: {
    fullName: string;
    phone: string;
    dob: string;
  };
  loading?: boolean;
}

export function EditProfileModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  loading = false,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();
  const supabase = createClient();
  const { makeRequest } = useAuthRequest();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.fullName.trim()) {
      setError('O nome completo é obrigatório');
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      setError('Erro ao salvar as alterações. Tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Editar Perfil</h2>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">Nome Completo</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={styles.input}
              disabled={loading}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="phone">Telefone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={styles.input}
              disabled={loading}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="dob">Data de Nascimento</label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
              className={styles.input}
              disabled={loading}
            />
          </div>
          
          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={`${styles.button} ${styles.cancelButton}`}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.saveButton}`}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
