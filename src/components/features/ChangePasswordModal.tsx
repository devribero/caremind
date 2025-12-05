'use client';

import { ChangeEvent, useState } from 'react';
import styles from './ChangePasswordModal.module.css';
import { Eye, EyeOff, Lock, X } from 'lucide-react';

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerIcon}>
            <Lock size={24} />
          </div>
          <div className={styles.headerText}>
            <h2>Alterar Senha</h2>
            <p>Atualize sua senha para manter sua conta segura</p>
          </div>
          <button onClick={handleClose} className={styles.closeButton} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Senha Atual</label>
            <div className={styles.inputWrapper}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                className={styles.input}
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                disabled={loading}
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="newPassword">Nova Senha</label>
            <div className={styles.inputWrapper}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                className={styles.input}
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                disabled={loading}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmNewPassword">Confirmar Nova Senha</label>
            <div className={styles.inputWrapper}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmNewPassword"
                name="confirmNewPassword"
                className={styles.input}
                value={passwordData.confirmNewPassword}
                onChange={handlePasswordChange}
                disabled={loading}
                placeholder="Repita a nova senha"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
