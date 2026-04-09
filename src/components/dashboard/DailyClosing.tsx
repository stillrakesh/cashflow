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
    <div className="animate-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-card)', marginBottom: 'var(--spacing-section)' }}>
        <button onClick={onBack} className="btn-ghost" style={{ width: '48px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-title" style={{ fontSize: '1.5rem' }}>Daily Financial Closing</h1>
          <p className="text-label" style={{ textTransform: 'none', margin: 0 }}>Reconcile cash and lock daily records</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-card)' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--spacing-sm)' }}>
            <Calendar size={18} className="text-accent" />
            <span className="text-heading" style={{ fontSize: '0.875rem' }}>Select Closing Date</span>
          </div>
          <input 
            type="date" 
            className="input text-medium" 
            value={selectedDate}
            max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ fontSize: '1rem', padding: '0.75rem' }}
          />
          {isAlreadyClosed && (
            <div style={{ 
              marginTop: 'var(--spacing-sm)', padding: '0.75rem', borderRadius: 'var(--radius-m)', 
              background: 'var(--yellow-soft)', color: 'var(--yellow)',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem'
            }}>
              <Lock size={14} />
              This day is already closed and records are locked.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
          <div className="card">
            <p className="text-label" style={{ marginBottom: '0.5rem' }}>Total Sales</p>
            <p className="text-number" style={{ fontSize: '1.25rem', color: 'var(--green)' }}>{formatINR(reportData.sales)}</p>
          </div>
          <div className="card">
            <p className="text-label" style={{ marginBottom: '0.5rem' }}>Total Expenses</p>
            <p className="text-number" style={{ fontSize: '1.25rem', color: 'var(--red)' }}>{formatINR(reportData.expenses)}</p>
          </div>
        </div>

        {!isAlreadyClosed && (
          <div className="card" style={{ padding: 'var(--spacing-section)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-section)' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: 'var(--radius-m)', background: 'var(--bg-2)', 
                color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Calculator size={24} />
              </div>
              <h3 className="text-heading" style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Cash Reconciliation</h3>
              <p className="text-label" style={{ textTransform: 'none' }}>Enter the physical cash amount currently in hand</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-m)' }}>
                <span className="text-label" style={{ textTransform: 'none', color: 'var(--text-2)' }}>System Expected Cash:</span>
                <span className="text-number">{formatINR(reportData.expectedCash)}</span>
              </div>

              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>Physical Cash Counted</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>₹</span>
                  <input 
                    type="number" 
                    className="input text-number" 
                    placeholder="0.00"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    style={{ paddingLeft: '2.5rem', fontSize: '1.25rem' }}
                  />
                </div>
              </div>

              {actualCash && (
                <div className="animate-in" style={{ 
                  padding: '1rem', borderRadius: 'var(--radius-m)', 
                  background: discrepancy === 0 ? 'var(--green-soft)' : (discrepancy > 0 ? 'var(--blue-soft)' : 'var(--red-soft)'),
                  color: discrepancy === 0 ? 'var(--green)' : (discrepancy > 0 ? 'var(--blue)' : 'var(--red)'),
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  border: `1px solid ${discrepancy === 0 ? 'var(--green)' : (discrepancy > 0 ? 'var(--blue)' : 'var(--red)')}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {discrepancy === 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span className="text-heading" style={{ fontSize: '0.875rem' }}>
                      {discrepancy === 0 ? 'Balanced' : (discrepancy > 0 ? 'Surplus' : 'Shortage')}
                    </span>
                  </div>
                  <span className="text-number">{formatINR(Math.abs(discrepancy))}</span>
                </div>
              )}

              <button 
                onClick={handleCloseDay}
                disabled={isSubmitting || !actualCash}
                className="btn-primary" 
                style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
              >
                {isSubmitting ? 'Closing Day...' : `Finish & Close ${selectedDate}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyClosing;
