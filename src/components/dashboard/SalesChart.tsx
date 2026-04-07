import React, { useMemo } from 'react';
import type { Transaction } from '../../types';

interface SalesChartProps {
  transactions: Transaction[];
}

/**
 * Pure-CSS bar chart — zero external deps.
 * Replaces recharts AreaChart to eliminate the 500 server crash.
 */
const SalesChart: React.FC<SalesChartProps> = ({ transactions }) => {
  const data = useMemo(() => {
    const approved = transactions.filter(t => t.status === 'approved');
    if (approved.length === 0) return [];

    let maxDate = new Date(0);
    approved.forEach(t => { const d = new Date(t.date); if (d > maxDate) maxDate = d; });

    const minDate = new Date(maxDate);
    minDate.setDate(minDate.getDate() - 6);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: { label: string; sales: number; expenses: number }[] = [];

    const current = new Date(minDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(maxDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayTxns = approved.filter(t => t.date.split('T')[0] === dateStr);
      const sales = dayTxns.filter(t => t.type === 'sale').reduce((a, t) => a + t.amount, 0);
      const expenses = dayTxns.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
      result.push({ label: dayNames[current.getDay()], sales, expenses });
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [transactions]);

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => Math.max(d.sales, d.expenses)), 1);

  return (
    <div style={{ marginBottom: '2rem' }}>
      <p className="section-label">cash flow trend</p>
      <div className="card animate-in" style={{ padding: '1rem', animationDelay: '150ms' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%', justifyContent: 'center', flex: 1 }}>
                <div style={{
                  width: '40%',
                  height: `${Math.max((d.sales / maxVal) * 100, 2)}%`,
                  background: 'var(--green)',
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.7,
                  transition: 'height 0.4s ease',
                }} />
                <div style={{
                  width: '40%',
                  height: `${Math.max((d.expenses / maxVal) * 100, 2)}%`,
                  background: 'var(--red)',
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.7,
                  transition: 'height 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.5625rem', color: 'var(--text-3)' }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)', opacity: 0.7 }} />
            <span style={{ fontSize: '0.625rem', color: 'var(--text-3)' }}>income</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--red)', opacity: 0.7 }} />
            <span style={{ fontSize: '0.625rem', color: 'var(--text-3)' }}>expenses</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;
