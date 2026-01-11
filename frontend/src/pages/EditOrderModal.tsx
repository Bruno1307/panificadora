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
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:'transparent' }} />
      <div ref={ref} className="card" style={{ position:'relative', width:'100%', maxWidth:600, maxHeight:'90vh', overflow:'auto', borderRadius:12, boxShadow:'none', border:'none', padding:16, background: 'var(--card)' }}>
        {children}
      </div>
    </div>
  );
}
