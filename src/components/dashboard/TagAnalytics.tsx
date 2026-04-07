import React, { useState, useMemo } from 'react';
import type { Transaction } from '../../types';
import { CATEGORY_ICONS } from '../../types';
import {
  formatINR,
  getExpenseBreakdown,
  getRevenueByPayment,
} from '../../utils/financeUtils';

interface TagAnalyticsProps {
  transactions: Transaction[];
  onDrillDown?: (category: string) => void;
}

const COLORS = ['#666', '#888', '#aaa', '#555', '#999', '#777', '#bbb', '#444', '#ccc', '#ddd'];
const COLORS_DARK = ['#ccc', '#aaa', '#888', '#ddd', '#999', '#bbb', '#777', '#eee', '#666', '#555'];

type View = 'expenses' | 'revenue' | 'classification';

/**
 * Pure-CSS analytics component — zero recharts dependency.
 * Uses conic-gradient for the donut chart.
 */
const TagAnalytics: React.FC<TagAnalyticsProps> = ({ transactions, onDrillDown }) => {
  const [view, setView] = useState<View>('expenses');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const colors = isDark ? COLORS_DARK : COLORS;

  const expenseData = useMemo(() => getExpenseBreakdown(transactions), [transactions]);
  const revenueData = useMemo(() => getRevenueByPayment(transactions), [transactions]);

  const classificationData = useMemo(() => {
    const approved = transactions.filter(t => t.type === 'expense' && t.status === 'approved');
    const total = approved.reduce((a, t) => a + t.amount, 0);
    if (!total) return [];
    const groups: Record<string, number> = { fixed: 0, variable: 0, 'one-time': 0 };
    approved.forEach(t => {
      const cls = t.classification || 'variable';
      groups[cls] = (groups[cls] || 0) + t.amount;
    });
    return Object.entries(groups)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, percentage: Math.round((value / total) * 100) }));
  }, [transactions]);

  const activeData = view === 'expenses' ? expenseData : view === 'revenue' ? revenueData : classificationData;
  const totalValue = activeData.reduce((a, d) => a + d.value, 0);

  // Build conic-gradient stops for the donut
  const conicStops = useMemo(() => {
    if (activeData.length === 0) return 'var(--bg-3)';
    let cumulative = 0;
    const stops: string[] = [];
    activeData.forEach((item, i) => {
      const pct = (item.value / totalValue) * 100;
      const color = colors[i % colors.length];
      stops.push(`${color} ${cumulative}% ${cumulative + pct}%`);
      cumulative += pct;
    });
    return stops.join(', ');
  }, [activeData, totalValue, colors]);

  return (
    <div className="animate-in">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.75rem' }}>
        {(['expenses', 'revenue', 'classification'] as View[]).map(tab => (
          <button
            key={tab}
            className={`chip ${view === tab ? 'active' : ''}`}
            onClick={() => setView(tab)}
            style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}
          >
            {tab === 'classification' ? 'cost type' : tab}
          </button>
        ))}
      </div>

      {/* CSS Donut Chart */}
      <div className="card" style={{ padding: '1.5rem 1rem 1rem', marginBottom: '1rem' }}>
        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{
            width: '144px',
            height: '144px',
            borderRadius: '50%',
            background: `conic-gradient(${conicStops})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <p style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>total</p>
              <p className="mono" style={{ fontSize: '0.9375rem', margin: 0 }}>{formatINR(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown list */}
      <div className="card" style={{ padding: '0.25rem 0' }}>
        {activeData.map((item, i) => {
          const icon = view === 'expenses' ? (CATEGORY_ICONS[item.name.toLowerCase()] || '') : '';
          return (
            <div
              key={item.name}
              onClick={() => view === 'expenses' && onDrillDown?.(item.name.toLowerCase())}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem',
                cursor: view === 'expenses' ? 'pointer' : 'default',
                borderBottom: i < activeData.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {icon && <span style={{ fontSize: '0.875rem', width: '20px', textAlign: 'center' }}>{icon}</span>}
              {!icon && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />}
              <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-1)' }}>{item.name}</span>
              <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{formatINR(item.value)}</span>
              <div style={{ width: '40px' }}>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${item.percentage}%`, background: colors[i % colors.length] }} />
                </div>
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)', minWidth: '26px', textAlign: 'right' }}>{item.percentage}%</span>
            </div>
          );
        })}
      </div>

      {/* Cash flow */}
      <div style={{ marginTop: '1.5rem' }}>
        <p className="section-label">cash flow</p>
        <div className="card" style={{ padding: '1rem' }}>
          {(() => {
            const approved = transactions.filter(t => t.status === 'approved');
            const totalIn = approved.filter(t => t.type === 'sale').reduce((a, t) => a + t.amount, 0);
            const totalOut = approved.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
            const net = totalIn - totalOut;
            const maxVal = Math.max(totalIn, totalOut) || 1;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>money in</span>
                    <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--green)' }}>{formatINR(totalIn)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${(totalIn / maxVal) * 100}%`, background: 'var(--green)' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>money out</span>
                    <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{formatINR(totalOut)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${(totalOut / maxVal) * 100}%`, background: 'var(--red)' }} />
                  </div>
                </div>
                <div className="divider" style={{ margin: '0.25rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>available</span>
                  <span className="mono" style={{
                    fontSize: '1.125rem', fontWeight: 500,
                    color: net >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>{formatINR(net)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default TagAnalytics;
