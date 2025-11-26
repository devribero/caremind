"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

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

  const handleConfirm = useCallback((item: ToastItem, confirm: boolean) => {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    item.resolve?.(confirm);
  }, []);

  return (
    <>
      {/* Overlay para confirm */}
      {items.some(item => item.type === 'confirm') && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(17, 24, 39, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9998,
            animation: 'fadeIn 0.2s ease-out',
          }}
        />
      )}

      {items.map((item) => {
        if (item.type === 'confirm') {
          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) toastRefs.current[item.id] = el;
                else delete toastRefs.current[item.id];
              }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                padding: '24px',
                borderRadius: '16px',
                background: 'white',
                minWidth: '360px',
                maxWidth: '420px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                zIndex: 9999,
                animation: 'modalIn 0.25s ease-out',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#fef2f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <AlertTriangle size={28} color="#dc2626" />
                </div>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#1e293b',
                  }}
                >
                  Confirmar exclusão
                </h3>
                <p
                  style={{
                    margin: '0 0 24px',
                    fontSize: '0.95rem',
                    color: '#64748b',
                    lineHeight: 1.5,
                  }}
                >
                  {item.message}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb',
                  }}
                >
                  <button
                    onClick={() => handleConfirm(item, false)}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#f1f5f9',
                      color: '#475569',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      minWidth: '120px',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleConfirm(item, true)}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#dc2626',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      minWidth: '120px',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#b91c1c';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#dc2626';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // Toast normal (success, error, info)
        const positionStyle: React.CSSProperties = item.position 
          ? item.position 
          : { top: '16px', right: '16px' };

        return (
          <div
            key={item.id}
            ref={(el) => {
              if (el) toastRefs.current[item.id] = el;
              else delete toastRefs.current[item.id];
            }}
            style={{
              position: 'fixed',
              ...positionStyle,
              padding: '12px 16px',
              borderRadius: '12px',
              color: 'white',
              minWidth: '260px',
              maxWidth: '360px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              background: item.type === 'success' ? '#16a34a' : 
                         item.type === 'error' ? '#dc2626' : '#1f2937',
              zIndex: 9999,
              animation: 'slideIn 0.3s ease-out',
              fontSize: '14px',
            }}
          >
            <div style={{ wordBreak: 'break-word' }}>{item.message}</div>
          </div>
        );
      })}

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
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  );
}
