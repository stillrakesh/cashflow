import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = true, onConfirm, onCancel
}) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card animate-in" style={{ width: '100%', maxWidth: '340px', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h2 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: isDanger ? 'var(--red)' : 'var(--text-0)' }}>
             {isDanger && <AlertTriangle size={16} />}
             {title}
           </h2>
           <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '1.25rem' }}>
           <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
             {message}
           </p>
           <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>{cancelText}</button>
             <button onClick={onConfirm} className={isDanger ? "btn-danger" : "btn-primary"} style={{ flex: 1 }}>{confirmText}</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
