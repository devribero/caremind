"use client";

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'confirm';

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
  resolve?: (value: boolean) => void;
};

let emit: ((t: ToastItem) => void) | null = null;
let counter = 1;

export const toast = {
  success(message: string) {
    emit?.({ id: counter++, type: 'success', message });
  },
  error(message: string) {
    emit?.({ id: counter++, type: 'error', message });
  },
  info(message: string) {
    emit?.({ id: counter++, type: 'info', message });
  },
  confirm(message: string) {
    return new Promise<boolean>((resolve) => {
      emit?.({ id: counter++, type: 'confirm', message, resolve });
    });
  },
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

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

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
      {items.map((i) => (
        <div
          key={i.id}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            color: 'white',
            minWidth: 260,
            maxWidth: 360,
            boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
            background: i.type === 'success' ? '#16a34a' : i.type === 'error' ? '#dc2626' : i.type === 'confirm' ? '#111827' : '#1f2937',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ wordBreak: 'break-word' }}>{i.message}</div>
            {i.type === 'confirm' && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setItems((prev) => prev.filter((x) => x.id !== i.id));
                    i.resolve?.(true);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#16a34a',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Confirmar
                </button>
                <button
                  onClick={() => {
                    setItems((prev) => prev.filter((x) => x.id !== i.id));
                    i.resolve?.(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #4b5563',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
