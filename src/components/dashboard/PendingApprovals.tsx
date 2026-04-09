import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ChevronLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Transaction } from '../../types';
import { formatINR } from '../../utils/financeUtils';

interface PendingApprovalsProps {
  transactions: Transaction[];
  onApprove: (id: string) => void;
  onReject: (id: string, comment: string) => void;
  onClose: () => void;
}

const PendingApprovals: React.FC<PendingApprovalsProps> = ({ transactions, onApprove, onReject, onClose }) => {
  const pendingTxns = useMemo(() => 
    transactions.filter(t => t.status === 'pending')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [transactions]);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const handleRejectSubmit = () => {
    if (rejectId && comment.trim()) {
      onReject(rejectId, comment.trim());
      setRejectId(null);
      setComment('');
    }
  };

  return (
    <div className="screen animate-in">
      <div className="screen-header" style={{ paddingBottom: 'var(--spacing-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ width: '48px' }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="text-label" style={{ marginBottom: '0.125rem' }}>admin action required</p>
            <h1 className="text-title">Approvals</h1>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 var(--spacing-card)' }}>
        {pendingTxns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <CheckCircle2 size={48} color="var(--green)" style={{ opacity: 0.2, marginBottom: 'var(--spacing-sm)' }} />
            <p className="text-light" style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>All caught up! No pending approvals.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-card)' }}>
            {pendingTxns.map(t => (
              <div key={t.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ color: t.type === 'sale' ? 'var(--green)' : 'var(--red)', marginTop: '0.2rem' }}>
                      {t.type === 'sale' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <p className="text-heading" style={{ fontSize: '0.875rem' }}>{t.notes || t.category}</p>
                      <p className="text-label" style={{ textTransform: 'none' }}>
                        Entered by {t.userName} · {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <p className="text-number" style={{ fontSize: '0.9375rem' }}>
                    {formatINR(t.amount)}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <button 
                    onClick={() => onApprove(t.id)}
                    className="btn-primary"
                    style={{ flex: 1, gap: '0.375rem' }}
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button 
                    onClick={() => setRejectId(t.id)}
                    className="btn-secondary"
                    style={{ flex: 1, gap: '0.375rem' }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectId && (
        <div className="sheet-overlay" style={{ zIndex: 1000 }} onClick={() => setRejectId(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ padding: 'var(--spacing-section)' }}>
            <h3 className="text-heading" style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Reject Transaction</h3>
            <p className="text-label" style={{ textTransform: 'none', marginBottom: 'var(--spacing-section)' }}>Please provide a reason why this entry is being rejected.</p>
            
            <textarea 
              autoFocus
              className="input text-regular"
              style={{ width: '100%', height: '6rem', marginBottom: 'var(--spacing-section)', padding: '0.75rem', fontSize: '0.875rem' }}
              placeholder="e.g. Wrong amount, missing receipt..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button onClick={() => setRejectId(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button 
                onClick={handleRejectSubmit} 
                className="btn-danger" 
                style={{ flex: 1 }}
                disabled={!comment.trim()}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: '5rem' }} />
    </div>
  );
};

export default PendingApprovals;
