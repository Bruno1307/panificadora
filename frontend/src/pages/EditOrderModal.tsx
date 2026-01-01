import React, { useRef, useEffect } from 'react';

export default function EditOrderModal({ onClose, children, escEnabled }: { onClose: () => void, children?: React.ReactNode, escEnabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!escEnabled) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, escEnabled]);

  return (
    <div
      ref={ref}
      className="card"
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:1000 }}
    >
      {children}
    </div>
  );
}
