import React, { useState } from 'react';
import { X, Download, ChevronRight } from 'lucide-react';

interface DownloadStatementModalProps {
  onClose: () => void;
  onDownload: (startDate: string, endDate: string) => void;
}

const DownloadStatementModal: React.FC<DownloadStatementModalProps> = ({ onClose, onDownload }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const presets = [
    { label: 'today', getRange: () => { const d = new Date().toISOString().split('T')[0]; return [d, d]; } },
    { label: 'yesterday', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().split('T')[0]; return [s, s]; } },
    { label: 'last 7 days', getRange: () => { const d = new Date(); const end = d.toISOString().split('T')[0]; d.setDate(d.getDate() - 7); return [d.toISOString().split('T')[0], end]; } },
    { label: 'this month', getRange: () => { const d = new Date(); const end = d.toISOString().split('T')[0]; d.setDate(1); return [d.toISOString().split('T')[0], end]; } },
    { label: 'all time', getRange: () => ['2000-01-01', new Date().toISOString().split('T')[0]] },
  ];

  const handlePreset = (getRange: () => string[]) => {
    const [start, end] = getRange();
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content animate-in" style={{ maxWidth: '400px', padding: '1.5rem', borderRadius: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
              <Download size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Download Statement</h2>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: 0 }}>Configure your report range</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ width: '48px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Presets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => handlePreset(p.getRange)}
              style={{
                textAlign: 'left', height: '48px', padding: '0 1rem', borderRadius: '12px',
                border: '1px solid var(--border)', background: 'var(--bg-0)',
                fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              {p.label} <ChevronRight size={12} style={{ opacity: 0.3 }} />
            </button>
          ))}
        </div>

        {/* Date Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem', display: 'block' }}>From</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.625rem 0.75rem' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem', display: 'block' }}>To</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.625rem 0.75rem' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onDownload(startDate, endDate)}
          className="btn-primary"
          style={{ width: '100%', gap: '0.5rem' }}
        >
          Generate PDF Statement
        </button>
      </div>
    </div>
  );
};

export default DownloadStatementModal;
