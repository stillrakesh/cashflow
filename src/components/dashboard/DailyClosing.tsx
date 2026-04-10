import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  Lock
} from 'lucide-react';
import { formatINR } from '../../utils/financeUtils';
import type { Transaction, DailyReport } from '../../types';

interface DailyClosingProps {
  transactions: Transaction[];
  onSaveReport: (report: DailyReport) => Promise<void>;
  existingReports: DailyReport[];
  onBack: () => void;
}

const DailyClosing: React.FC<DailyClosingProps> = ({ 
  transactions, onSaveReport, existingReports, onBack 
}) => {
  const [selectedDate, setSelectedDate] = useState(() => 
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [actualCash, setActualCash] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate totals for selected date
  const reportData = useMemo(() => {
    const dayTxns = transactions.filter(t => 
      new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === selectedDate &&
      t.status === 'approved'
    );

    const sales = dayTxns.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const expenses = dayTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const expectedCashBalance = dayTxns
      .filter(t => t.account === 'Cash')
      .reduce((sum, t) => t.type === 'sale' ? sum + t.amount : sum - t.amount, 0);

    return {
      sales,
      expenses,
      profit: sales - expenses,
      expectedCash: Math.max(0, expectedCashBalance),
      transactionCount: dayTxns.length
    };
  }, [transactions, selectedDate]);

  const isAlreadyClosed = existingReports.some(r => r.id === selectedDate);
  const cashVal = parseFloat(actualCash) || 0;
  const discrepancy = cashVal - reportData.expectedCash;

  const handleCloseDay = async () => {
    if (isAlreadyClosed) return;
    setIsSubmitting(true);
    try {
      const report: DailyReport = {
        id: selectedDate,
        orgId: '', // Added by DB helper
        date: selectedDate,
        sales: reportData.sales,
        expenses: reportData.expenses,
        profit: reportData.profit,
        expectedCash: reportData.expectedCash,
        actualCash: cashVal,
        discrepancy: discrepancy,
        status: 'closed',
        closedAt: new Date().toISOString(),
        closedBy: 'admin' // Placeholder, usually from Auth
      };
      await onSaveReport(report);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onBack();
      }, 2000);
    } catch (err) {
      console.error('Failed to close day:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="card glass animate-in" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '50%', background: 'var(--green-soft)', 
          color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <CheckCircle2 size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Day Closed Successfully</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem' }}>The financial records for {selectedDate} are now locked.</p>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-card)', marginBottom: '1.25rem' }}>
        <button onClick={onBack} className="btn-ghost" style={{ width: '40px', height: '40px', padding:0 }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-title" style={{ fontSize: '1.375rem' }}>Financial Closing</h1>
          <p className="text-label" style={{ textTransform: 'none', margin: 0, fontSize: '0.8125rem' }}>Daily reconciliation & lock</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="card" style={{ padding: '0.875rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Calendar size={16} style={{ color: 'var(--text-3)' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-1)' }}>{selectedDate}</span>
            </div>
            <input 
              type="date" 
              value={selectedDate}
              max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '0.75rem', color: 'var(--text-1)' }}
            />
          </div>
          {isAlreadyClosed && (
            <div style={{ 
              marginTop: '0.75rem', padding: '0.625rem', borderRadius: '8px', 
              background: 'var(--yellow-soft)', color: 'var(--yellow)',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 500
            }}>
              <Lock size={12} />
              This day is already closed.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="card" style={{ padding: '1rem', background: 'var(--bg-1)' }}>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Sales</p>
            <p className="text-number" style={{ fontSize: '1.125rem', color: 'var(--green)', fontWeight: 600 }}>{formatINR(reportData.sales).replace('₹', 'Rs. ')}</p>
          </div>
          <div className="card" style={{ padding: '1rem', background: 'var(--bg-1)' }}>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Expenses</p>
            <p className="text-number" style={{ fontSize: '1.125rem', color: 'var(--red)', fontWeight: 600 }}>{formatINR(reportData.expenses).replace('₹', 'Rs. ')}</p>
          </div>
        </div>

        {!isAlreadyClosed && (
          <div className="card" style={{ padding: '1.25rem', marginTop: '0.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ 
                width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-2)', 
                color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 0.75rem'
              }}>
                <Calculator size={20} />
              </div>
              <h3 className="text-heading" style={{ fontSize: '1rem', fontWeight: 600 }}>Cash Reconciliation</h3>
              <p className="text-label" style={{ textTransform: 'none', fontSize: '0.75rem' }}>Match system records with physical cash</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem 1.25rem', background: 'var(--bg-1)', borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', fontWeight: 600 }}>System Expected Cash</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>calculated from digital entries</p>
                </div>
                <span className="text-number" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-0)' }}>
                  {formatINR(reportData.expectedCash).replace('₹', 'Rs. ')}
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Physical Cash Counted</label>
                  {actualCash && (
                    <span style={{ fontSize: '0.625rem', color: discrepancy === 0 ? 'var(--green)' : 'var(--text-2)' }}>
                      {discrepancy === 0 ? 'STATUS: PERFECT MATCH' : 'RECALCULATING...'}
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '0.875rem' }}>Rs.</span>
                  <input 
                    type="number" 
                    className="input text-number" 
                    placeholder="0.00"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    style={{ paddingLeft: '2.75rem', fontSize: '1.375rem', height: '56px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-2)' }}
                  />
                </div>
              </div>

              {actualCash && (
                <div className="animate-in" style={{ 
                  padding: '1rem 1.25rem', borderRadius: '12px', 
                  background: discrepancy === 0 ? 'var(--green-soft)' : (discrepancy > 0 ? 'var(--blue-soft)' : 'var(--red-soft)'),
                  color: discrepancy === 0 ? 'var(--green)' : (discrepancy > 0 ? 'var(--blue)' : 'var(--red)'),
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  border: `1px solid ${discrepancy === 0 ? 'var(--green)' : (discrepancy > 0 ? 'var(--blue)' : 'var(--red)')}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    {discrepancy === 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span className="text-heading" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {discrepancy === 0 ? 'Balanced' : (discrepancy > 0 ? 'Cash Surplus' : 'Cash Shortage')}
                    </span>
                  </div>
                  <span className="text-number" style={{ fontSize: '1rem', fontWeight: 600 }}>
                    {formatINR(Math.abs(discrepancy)).replace('₹', 'Rs. ')}
                  </span>
                </div>
              )}

              <button 
                onClick={handleCloseDay}
                disabled={isSubmitting || !actualCash}
                className="btn-primary" 
                style={{ width: '100%', height: '52px', borderRadius: '14px', marginTop: '0.5rem', fontSize: '0.9375rem', fontWeight: 600 }}
              >
                {isSubmitting ? 'Finalizing...' : `Close Day Records`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyClosing;
