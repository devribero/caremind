"use client";

import { useEffect, useState, useRef, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'confirm';

type ToastPosition = {
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
};

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
  position?: ToastPosition;
  resolve?: (value: boolean) => void;
};

let emit: ((t: ToastItem) => void) | null = null;
let counter = 1;

export const toast = {
  success(message: string, position?: ToastPosition) {
    emit?.({ id: counter++, type: 'success', message, position });
  },
  error(message: string, position?: ToastPosition) {
    emit?.({ id: counter++, type: 'error', message, position });
  },
  info(message: string, position?: ToastPosition) {
    emit?.({ id: counter++, type: 'info', message, position });
  },
  confirm(message: string, position?: ToastPosition) {
    return new Promise<boolean>((resolve) => {
      emit?.({ 
        id: counter++, 
        type: 'confirm', 
        message, 
        position,
        resolve 
      });
    });
  },
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toastRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    emit = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      if (t.type !== 'confirm') {
        setTimeout(() => {
          setItems((prev) => prev.filter((i) => i.id !== t.id));
        }, 3500);
      }
    };
    return () => { emit = null; };
  }, []);

  const getPositionStyle = useCallback((item: ToastItem): React.CSSProperties => {
    if (item.type === 'confirm') {
      // Diálogo de confirmação sempre no topo central
      return {
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
      };
    }
    // Outros toasts no canto superior direito
    if (!item.position) {
      return { top: '16px', right: '16px' };
    }
    return item.position;
  }, []);

  const handleConfirm = useCallback((item: ToastItem, confirm: boolean) => {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    item.resolve?.(confirm);
  }, []);

  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          ref={(el) => {
            if (el) {
              toastRefs.current[item.id] = el;
            } else {
              delete toastRefs.current[item.id];
            }
          }}
          className="toast-message"
          style={{
            position: 'fixed',
            ...getPositionStyle(item),
            padding: item.type === 'confirm' ? '20px 24px' : '12px 16px',
            borderRadius: '12px',
            color: 'white',
            minWidth: item.type === 'confirm' ? '320px' : '260px',
            maxWidth: item.type === 'confirm' ? '400px' : '360px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            background: item.type === 'success' ? '#16a34a' : 
                       item.type === 'error' ? '#dc2626' : 
                       item.type === 'confirm' ? '#1f2937' : '#1f2937',
            zIndex: 9999,
            transition: 'opacity 0.3s, transform 0.3s',
            animation: 'slideIn 0.3s ease-out',
            textAlign: item.type === 'confirm' ? 'center' : 'left',
            fontSize: item.type === 'confirm' ? '16px' : '14px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ wordBreak: 'break-word' }}>{item.message}</div>
            {item.type === 'confirm' && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  onClick={() => handleConfirm(item, false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #4b5563',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    minWidth: '100px',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = '#6b7280';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#4b5563';
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleConfirm(item, true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#dc2626',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'background 0.2s',
                    minWidth: '100px',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#b91c1c')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#dc2626')}
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .toast-message {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
