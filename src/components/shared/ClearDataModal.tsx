import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface ClearDataModalProps {
  onClear: (options: { from?: string, to?: string, all?: boolean }) => void;
  onClose: () => void;
}

const ClearDataModal: React.FC<ClearDataModalProps> = ({ onClear, onClose }) => {
  const [mode, setMode] = useState<'all' | 'range'>('range');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleExecute = () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm.');
      return;
    }
    if (mode === 'range' && (!fromDate || !toDate)) {
      alert('Please select both start and end dates.');
      return;
    }

    onClear({
      from: mode === 'range' ? fromDate : undefined,
      to: mode === 'range' ? toDate : undefined,
      all: mode === 'all'
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card animate-in" style={{ width: '100%', maxWidth: '380px', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Data Management</h2>
           <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '1.5rem' }}>
           <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>Select the cleanup scope. This action is permanent.</p>
           
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-2)', padding: '0.25rem', borderRadius: '12px' }}>
              <button onClick={() => setMode('range')} style={{ height: '40px', fontSize: '0.75rem', fontWeight: 500, borderRadius: '10px', border: 'none', background: mode === 'range' ? 'var(--bg-1)' : 'transparent', color: mode === 'range' ? 'var(--text-0)' : 'var(--text-3)', cursor: 'pointer' }}>Date Range</button>
              <button onClick={() => setMode('all')} style={{ height: '40px', fontSize: '0.75rem', fontWeight: 500, borderRadius: '10px', border: 'none', background: mode === 'all' ? 'var(--bg-1)' : 'transparent', color: mode === 'all' ? 'var(--text-0)' : 'var(--text-3)', cursor: 'pointer' }}>All History</button>
           </div>

           {mode === 'range' && (
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                   <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>From</label>
                   <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', padding: '0.5rem', color: 'var(--text-0)', fontSize: '0.75rem' }} />
                </div>
                <div>
                   <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>To</label>
                   <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', padding: '0.5rem', color: 'var(--text-0)', fontSize: '0.75rem' }} />
                </div>
             </div>
           )}

           <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(255, 107, 107, 0.2)', padding: '1rem', borderRadius: 'var(--radius-m)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                 <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0 }} />
                 <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--red)', margin: '0 0 0.25rem' }}>Safety Check</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--red)', opacity: 0.8, margin: 0 }}>Type <b>DELETE</b> below to confirm the wipe.</p>
                 </div>
              </div>
              <input 
                type="text" 
                placeholder="..." 
                value={confirmText}
                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                style={{ width: '100%', marginTop: '0.75rem', background: 'var(--bg-0)', border: '1px solid rgba(255, 107, 107, 0.2)', padding: '0.5rem', borderRadius: 'var(--radius-s)', color: 'var(--red)', fontSize: '0.875rem', fontWeight: 600, textAlign: 'center' }} 
              />
           </div>

           <button 
             onClick={handleExecute}
             className="btn-danger" 
             style={{ width: '100%', gap: '0.5rem' }}
           >
             <Trash2 size={16} /> Execute Data Purge
           </button>
        </div>
      </div>
    </div>
  );
};

export default ClearDataModal;
