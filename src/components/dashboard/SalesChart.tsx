import React, { useMemo, useState } from 'react';
import type { Transaction } from '../../types';
import { formatINR } from '../../utils/financeUtils';

interface SalesChartProps {
  transactions: Transaction[];
}

/**
 * Pure-CSS interactive bar chart — zero external deps.
 * Replaces recharts to eliminate the 500 server crash, with full touch/hover support.
 */
const SalesChart: React.FC<SalesChartProps> = ({ transactions }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const approved = transactions.filter(t => t.status === 'approved');
    if (approved.length === 0) return [];

    let maxDate = new Date(0);
    approved.forEach(t => { const d = new Date(t.date); if (d > maxDate) maxDate = d; });

    const minDate = new Date(maxDate);
    minDate.setDate(minDate.getDate() - 6);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: { label: string; fullDate: string; sales: number; expenses: number }[] = [];

    const current = new Date(minDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(maxDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const dateStr = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const dayTxns = approved.filter(t => {
        const txnDateStr = new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        return txnDateStr === dateStr;
      });
      const sales = dayTxns.filter(t => t.type === 'sale').reduce((a, t) => a + t.amount, 0);
      const expenses = dayTxns.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
      
      const fullDate = current.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      result.push({ label: dayNames[current.getDay()], fullDate, sales, expenses });
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [transactions]);

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => Math.max(d.sales, d.expenses)), 1);
  const selectedData = selectedIndex !== null ? data[selectedIndex] : null;

  return (
    <div style={{ marginBottom: 'var(--spacing-section)' }}>
      <p className="section-label">cash flow trend</p>
      <div className="card animate-in" style={{ padding: 'var(--spacing-card)', animationDelay: '150ms' }}>
        
        {/* Interactive Tooltip / Info Box */}
        <div style={{
          height: '64px',
          marginBottom: 'var(--spacing-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-2)',
          borderRadius: 'var(--radius-m)',
          transition: 'all 0.2s ease',
          opacity: 1,
        }}>
          {selectedData ? (
            <>
              <div className="text-label" style={{ textTransform: 'lowercase', marginBottom: '0.2rem' }}>
                {selectedData.fullDate.toLowerCase()}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span className="text-number" style={{ fontSize: '0.8125rem', color: 'var(--green)' }}>
                  +{formatINR(selectedData.sales)}
                </span>
                <span className="text-number" style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>
                  -{formatINR(selectedData.expenses)}
                </span>
                <div style={{ width: '1px', height: '12px', background: 'var(--border)' }} />
                <span className="text-number" style={{ fontSize: '0.8125rem', color: 'var(--text-0)' }}>
                  {formatINR(selectedData.sales - selectedData.expenses)} net
                </span>
              </div>
            </>
          ) : (
            <div className="text-label" style={{ textTransform: 'lowercase' }}>
              tap a bar to view insights
            </div>
          )}
        </div>

        {/* Chart Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-sm)', height: '140px' }}>
          {data.map((d, i) => {
            const isSelected = selectedIndex === i;
            const isDimmed = selectedIndex !== null && !isSelected;

            return (
              <div 
                key={i} 
                onClick={() => setSelectedIndex(isSelected ? null : i)}
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '4px', 
                  height: '100%', 
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  opacity: isDimmed ? 0.35 : 1,
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s cubic-bezier(0.3, 0.7, 0.4, 1)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%', justifyContent: 'center', flex: 1 }}>
                  <div style={{
                    width: '40%',
                    height: `${Math.max((d.sales / maxVal) * 100, 2)}%`,
                    background: 'var(--green)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s ease',
                  }} />
                  <div style={{
                    width: '40%',
                    height: `${Math.max((d.expenses / maxVal) * 100, 2)}%`,
                    background: 'var(--red)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s ease',
                  }} />
                </div>
                <span className="text-label" style={{ 
                  color: isSelected ? 'var(--text-0)' : 'var(--text-3)',
                  transition: 'color 0.2s',
                  textTransform: 'lowercase'
                }}>
                  {d.label.toLowerCase()}
                </span>
              </div>
            );
          })}
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-card)', justifyContent: 'center', marginTop: 'var(--spacing-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)' }} />
            <span className="text-label" style={{ textTransform: 'lowercase' }}>income</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--red)' }} />
            <span className="text-label" style={{ textTransform: 'lowercase' }}>expenses</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;
