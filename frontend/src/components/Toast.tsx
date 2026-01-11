import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [visible, setVisible] = useState(false);

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ message, type });
    setVisible(true);
    setTimeout(() => setVisible(false), 3500);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.type === 'success' ? '#4caf50' : toast.type === 'error' ? '#f44336' : '#23264a',
            color: '#fff',
            padding: '14px 32px',
            borderRadius: 8,
            boxShadow: '0 2px 12px #0002',
            fontSize: 18,
            zIndex: 9999,
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.3s',
            pointerEvents: 'none',
          }}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
