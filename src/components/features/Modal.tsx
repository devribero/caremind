// Em @/components/features/Modal.tsx

'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef(0);

  // Efeito para controlar a rolagem do body quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      // Salva a posição atual do scroll
      scrollPosition.current = window.scrollY;
      
      // Bloqueia a rolagem do body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition.current}px`;
      document.body.style.width = '100%';
      
      // Foca no modal quando ele é aberto para acessibilidade
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }
    
    // Limpa o efeito quando o componente é desmontado ou quando o modal é fechado
    return () => {
      // Restaura a rolagem do body
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      // Restaura a posição de rolagem
      if (isOpen) {
        window.scrollTo(0, scrollPosition.current);
      }
    };
  }, [isOpen]);

  // Efeito para fechar o modal com a tecla "Escape"
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Não renderiza nada se o modal não estiver aberto
  if (!isOpen) {
    return null;
  }

  // Usa createPortal para renderizar o modal no final do body
  // Isso evita problemas de z-index e contexto de empilhamento
  return createPortal(
    <div 
      className={styles.modalOverlay}
      onClick={(e) => {
        // Fecha o modal ao clicar fora do conteúdo
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className={styles.modalContent}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <h2 id="modal-title" className={styles.modalTitle}>
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
            aria-label="Fechar modal"
          >
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>,
    document.body // Onde o portal será renderizado
  );
}