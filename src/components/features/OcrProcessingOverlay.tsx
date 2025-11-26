'use client';

import React, { useState, useEffect } from 'react';
import styles from './OcrProcessingOverlay.module.css';

interface OcrProcessingOverlayProps {
  isVisible: boolean;
  status: 'uploading' | 'processing' | 'analyzing' | 'validating' | 'success' | 'error';
  errorMessage?: string;
  onClose?: () => void;
}

const statusMessages: Record<string, { title: string; description: string }> = {
  uploading: {
    title: 'Enviando foto...',
    description: 'Aguarde enquanto fazemos o upload da imagem',
  },
  processing: {
    title: 'Processando receita...',
    description: 'Estamos preparando a imagem para análise',
  },
  analyzing: {
    title: 'Analisando medicamentos...',
    description: 'Nossa IA está identificando os medicamentos na receita',
  },
  validating: {
    title: 'Quase lá!',
    description: 'Preparando os dados para sua validação',
  },
  success: {
    title: 'Concluído!',
    description: 'Medicamentos identificados com sucesso',
  },
  error: {
    title: 'Ops! Algo deu errado',
    description: 'Não foi possível processar a receita',
  },
};

const statusProgress: Record<string, number> = {
  uploading: 20,
  processing: 45,
  analyzing: 70,
  validating: 90,
  success: 100,
  error: 100,
};

export function OcrProcessingOverlay({
  isVisible,
  status,
  errorMessage,
  onClose,
}: OcrProcessingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Atualiza o progresso alvo baseado no status
  useEffect(() => {
    setProgress(statusProgress[status] || 0);
  }, [status]);

  // Animação suave do progresso
  useEffect(() => {
    if (displayProgress < progress) {
      const timer = setTimeout(() => {
        setDisplayProgress(prev => Math.min(prev + 1, progress));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [displayProgress, progress]);

  // Reset quando ficar invisível
  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setDisplayProgress(0);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const { title, description } = statusMessages[status] || statusMessages.processing;
  const isError = status === 'error';
  const isSuccess = status === 'success';

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.iconContainer}>
          {isError ? (
            <div className={styles.errorIcon}>❌</div>
          ) : isSuccess ? (
            <div className={styles.successIcon}>✅</div>
          ) : (
            <div className={styles.loadingIcon}>
              <div className={styles.spinner}></div>
              <span className={styles.pillIcon}>💊</span>
            </div>
          )}
        </div>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>
          {isError && errorMessage ? errorMessage : description}
        </p>

        {!isError && !isSuccess && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <span className={styles.progressText}>{displayProgress}%</span>
          </div>
        )}

        {(isError || isSuccess) && onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            {isError ? 'Tentar novamente' : 'Continuar'}
          </button>
        )}

        {!isError && !isSuccess && (
          <p className={styles.hint}>
            Isso pode levar alguns segundos...
          </p>
        )}
      </div>
    </div>
  );
}

