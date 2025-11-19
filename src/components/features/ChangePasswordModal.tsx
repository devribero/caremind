'use client';

import { ChangeEvent, useState } from 'react';
import styles from './ChangePasswordModal.module.css';

interface ChangePasswordModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: { currentPassword: string; newPassword: string; confirmNewPassword: string }) => Promise<void>;
  loading: boolean;
}

export function ChangePasswordModal({ show, onClose, onSave, loading }: ChangePasswordModalProps) {
  const [passwordData, setPasswordData] = useState<{
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [error, setError] = useState('');

  if (!show) return null;

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveClick();
  };

  const handleSaveClick = async () => {
    if (!passwordData.currentPassword) {
      setError("Por favor, informe a senha atual");
      return;
    }
    if (!passwordData.newPassword) {
      setError("Por favor, informe a nova senha");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setError("As novas senhas não coincidem!");
      return;
    }
    
    try {
      await onSave({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword
      });
      
      // Limpa o formulário após o sucesso
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
    } catch (err) {
      // O erro será tratado no onSave
    }
  };

  const handleClose = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setError('');
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Alterar Senha</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
          <label htmlFor="currentPassword">Senha Atual</label>
          <input
            type="password"
            id="currentPassword"
            name="currentPassword"
            className={styles.input}
            value={passwordData.currentPassword}
            onChange={handlePasswordChange}
            disabled={loading}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="newPassword">Nova Senha</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            className={styles.input}
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            disabled={loading}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="confirmNewPassword">Confirmar Nova Senha</label>
          <input
            type="password"
            id="confirmNewPassword"
            name="confirmNewPassword"
            className={styles.input}
            value={passwordData.confirmNewPassword}
            onChange={handlePasswordChange}
            disabled={loading}
          />
        </div>
        
        <div className={styles.modalFooter}>
          <button
            type="button"
            onClick={handleClose}
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
