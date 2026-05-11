import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface AlertModalProps {
  title?: string;
  message: string;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ title = 'Alert', message, onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card animate-in" style={{ width: '100%', maxWidth: '340px', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h2 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--yellow)' }}>
             <AlertCircle size={16} />
             {title}
           </h2>
           <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '1.25rem' }}>
           <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
             {message}
           </p>
           <button onClick={onClose} className="btn-secondary" style={{ width: '100%' }}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
