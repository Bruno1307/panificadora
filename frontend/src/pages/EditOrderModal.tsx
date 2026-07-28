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
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', boxSizing:'border-box' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(15, 23, 42, 0.45)' }} />
      <div ref={ref} style={{ position:'relative', width:'100%', maxWidth:'100vw', boxSizing:'border-box', display:'flex', justifyContent:'center' }}>
        {children}
      </div>
    </div>
  );
}
