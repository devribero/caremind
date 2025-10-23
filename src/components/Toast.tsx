"use client";

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

type ToastItem = { id: number; type: ToastType; message: string };

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
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    emit = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== t.id));
      }, 3500);
    };
    return () => { emit = null; };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
      {items.map((i) => (
        <div key={i.id} style={{
          padding: '10px 14px',
          borderRadius: 8,
          color: 'white',
          minWidth: 240,
          boxShadow: '0 6px 24px rgba(0,0,0,0.15)'
        , background: i.type === 'success' ? '#16a34a' : i.type === 'error' ? '#dc2626' : '#1f2937'}}>
          {i.message}
        </div>
      ))}
    </div>
  );
}
