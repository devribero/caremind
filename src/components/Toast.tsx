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
            padding: '12px 16px',
            borderRadius: '8px',
            color: 'white',
            minWidth: '260px',
            maxWidth: '360px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
            background: item.type === 'success' ? '#16a34a' : 
                       item.type === 'error' ? '#dc2626' : 
                       item.type === 'confirm' ? '#111827' : '#1f2937',
            zIndex: 9999,
            transform: 'translateY(0)',
            transition: 'opacity 0.3s, transform 0.3s',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ wordBreak: 'break-word' }}>{item.message}</div>
            {item.type === 'confirm' && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => handleConfirm(item, true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#16a34a',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#15803d')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#16a34a')}
                >
                  Confirmar
                </button>
                <button
                  onClick={() => handleConfirm(item, false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #4b5563',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Cancelar
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
