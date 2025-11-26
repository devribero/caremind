'use client';

import { Modal } from './Modal';
import { AlertTriangle, Info } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  danger = true,
  isLoading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={title}>
      <div className={styles.dialogContent}>
        <div className={styles.iconWrapper}>
          <div className={`${styles.iconCircle} ${danger ? styles.danger : styles.info}`}>
            {danger ? <AlertTriangle size={28} /> : <Info size={28} />}
          </div>
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttons}>
          <button 
            onClick={handleCancel}
            className={`${styles.button} ${styles.cancelButton}`}
            disabled={isLoading}
            type="button"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`${styles.button} ${danger ? styles.dangerButton : styles.confirmButton}`}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? 'Aguarde...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
