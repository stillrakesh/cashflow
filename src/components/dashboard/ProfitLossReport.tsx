import React, { useMemo, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import type { Transaction, StaffTransaction, CategoryConfig } from '../../types';
import { formatINR, getExpenseClassification } from '../../utils/financeUtils';

interface ProfitLossReportProps {
  transactions: Transaction[];
  staffTransactions: StaffTransaction[];
  customCategories: CategoryConfig[];
  onBack: () => void;
}

const ProfitLossReport: React.FC<ProfitLossReportProps> = ({
  transactions, staffTransactions, customCategories, onBack
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.toISOString().slice(0, 7));

  const report = useMemo(() => {
    const approved = (transactions || []).filter(t =>
      t.status === 'approved' && t.date && t.date.slice(0, 7) === selectedMonth
    );

    const sales = approved.filter(t => t.type === 'sale');
    const expenses = approved.filter(t => t.type === 'expense');

    const totalRevenue = sales.reduce((s, t) => s + t.amount, 0);

    // COGS = variable food/ingredient expenses
    const cogsCategories = ['vegetables', 'oil', 'dairy', 'meat', 'spices', 'beverages', 'gas', 'packaging'];
    const cogs = expenses
      .filter(t => cogsCategories.includes((t.category || '').toLowerCase()))
      .reduce((s, t) => s + t.amount, 0);

    const grossProfit = totalRevenue - cogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Fixed overhead
    const fixedExpenses = expenses
      .filter(t => getExpenseClassification(t.category, customCategories) === 'fixed')
      .reduce((s, t) => s + t.amount, 0);

    // Variable (non-COGS)
    const variableExpenses = expenses
      .filter(t => {
        const cls = getExpenseClassification(t.category, customCategories);
        return cls === 'variable' && !cogsCategories.includes((t.category || '').toLowerCase());
      })
      .reduce((s, t) => s + t.amount, 0);

    // One-time / CapEx
    const oneTimeExpenses = expenses
      .filter(t => getExpenseClassification(t.category, customCategories) === 'one-time')
      .reduce((s, t) => s + t.amount, 0);

    // Staff costs this month (from staffTransactions)
    // We use 'period' if available (accrual basis), otherwise 'date'
    const staffCost = (staffTransactions || [])
      .filter(t => {
        const period = t.period || (t.date && t.date.slice(0, 7));
        return period === selectedMonth && (t.type === 'salary' || t.type === 'bonus');
      })
      .reduce((s, t) => s + t.amount, 0);

    const totalOperatingCosts = fixedExpenses + variableExpenses + staffCost;
    const ebitda = grossProfit - totalOperatingCosts;
    const netProfit = ebitda - oneTimeExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Breakdown by category
    const byCategory: Record<string, number> = {};
    expenses.forEach(t => {
      const cat = t.category || 'misc';
      byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    });
    const categoryBreakdown = Object.entries(byCategory)
      .map(([name, amount]) => ({ name, amount, pct: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    // Revenue by payment type
    const byPayment: Record<string, number> = {};
    sales.forEach(t => { const p = t.paymentType || 'other'; byPayment[p] = (byPayment[p] || 0) + t.amount; });

    return {
      totalRevenue, cogs, grossProfit, grossMargin,
      fixedExpenses, variableExpenses, oneTimeExpenses, staffCost,
      totalOperatingCosts, ebitda, netProfit, netMargin,
      categoryBreakdown, byPayment,
      txnCount: sales.length,
    };
  }, [transactions, staffTransactions, selectedMonth, customCategories]);

  const Row = ({ label, value, color, bold, indent }: { label: string; value: number; color?: string; bold?: boolean; indent?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 1rem', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.8125rem', paddingLeft: indent ? '1rem' : 0, color: 'var(--text-2)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span className="mono" style={{ fontSize: '0.875rem', fontWeight: bold ? 700 : 500, color: color || (value >= 0 ? 'var(--text-0)' : 'var(--red)') }}>{formatINR(value)}</span>
    </div>
  );

  const SectionHeader = ({ label, value, color }: { label: string; value: number; color?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-2)' }}>{label}</span>
      <span className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: color || 'var(--text-0)' }}>{formatINR(value)}</span>
    </div>
  );

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <button onClick={onBack} className="btn-secondary" style={{ width: '40px', height: '40px', padding: 0, flexShrink: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>P&L Statement</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>Profit & Loss Report</p>
        </div>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-m)', padding: '0.375rem 0.625rem', fontSize: '0.75rem', color: 'var(--text-0)', fontFamily: 'inherit', outline: 'none' }}>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const val = d.toISOString().slice(0, 7);
            return <option key={val} value={val}>{d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</option>;
          })}
        </select>
      </div>

      {/* Margin KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Gross Margin', value: report.grossMargin, color: report.grossMargin >= 30 ? 'var(--green)' : 'var(--yellow)' },
          { label: 'Net Margin', value: report.netMargin, color: report.netMargin >= 15 ? 'var(--green)' : report.netMargin >= 0 ? 'var(--yellow)' : 'var(--red)' },
          { label: 'Transactions', value: report.txnCount, isCount: true },
        ].map(({ label, value, color, isCount }) => (
          <div key={label} className="card" style={{ padding: '0.875rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.5rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
            <p className="mono" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: color || 'var(--text-0)' }}>
              {isCount ? value : `${value.toFixed(1)}%`}
            </p>
          </div>
        ))}
      </div>

      {/* P&L Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.25rem' }}>
        <SectionHeader label="Revenue" value={report.totalRevenue} color="var(--green)" />
        <Row label="Total Sales" value={report.totalRevenue} color="var(--green)" />

        <SectionHeader label="Cost of Goods Sold (COGS)" value={-report.cogs} color="var(--red)" />
        <Row label="Ingredients & Materials" value={report.cogs} indent />

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Gross Profit</span>
          <span className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: report.grossProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatINR(report.grossProfit)}</span>
        </div>

        <SectionHeader label="Operating Expenses" value={-report.totalOperatingCosts} color="var(--red)" />
        {report.fixedExpenses > 0 && <Row label="Fixed Overhead (rent, utilities…)" value={report.fixedExpenses} indent />}
        {report.staffCost > 0 && <Row label="Staff Salary & Bonus" value={report.staffCost} indent />}
        {report.variableExpenses > 0 && <Row label="Variable Costs" value={report.variableExpenses} indent />}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>EBITDA</span>
          <span className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: report.ebitda >= 0 ? 'var(--blue)' : 'var(--red)' }}>{formatINR(report.ebitda)}</span>
        </div>

        {report.oneTimeExpenses > 0 && (
          <>
            <SectionHeader label="One-Time / CapEx" value={-report.oneTimeExpenses} color="var(--yellow)" />
            <Row label="Equipment, Repairs, Renovation…" value={report.oneTimeExpenses} indent />
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: report.netProfit >= 0 ? 'var(--green-soft)' : 'var(--red-soft)' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800 }}>NET PROFIT</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {report.netProfit >= 0 ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
            <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: report.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatINR(report.netProfit)}</span>
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <p className="section-label" style={{ marginBottom: '0.75rem' }}>expense breakdown</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.25rem' }}>
        {report.categoryBreakdown.length === 0
          ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>No expenses this month</div>
          : report.categoryBreakdown.map((c, i) => (
            <div key={i} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, textTransform: 'capitalize' }}>{c.name}</span>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>{c.pct.toFixed(1)}% of revenue</span>
                  <span className="mono" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatINR(c.amount)}</span>
                </div>
              </div>
              <div style={{ height: '3px', background: 'var(--bg-2)', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${Math.min(100, c.pct)}%`, background: 'var(--blue)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          ))
        }
      </div>

      {/* Revenue by Payment */}
      <p className="section-label" style={{ marginBottom: '0.75rem' }}>revenue by payment method</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        {Object.entries(report.byPayment).length === 0
          ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>No sales this month</div>
          : Object.entries(report.byPayment).map(([method, amount], i) => (
            <div key={i} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, textTransform: 'uppercase' }}>{method}</span>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>{report.totalRevenue > 0 ? ((amount / report.totalRevenue) * 100).toFixed(0) : 0}%</span>
                <span className="mono" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--green)' }}>{formatINR(amount)}</span>
              </div>
            </div>
          ))
        }
      </div>

      <div style={{ height: '5rem' }} />
    </div>
  );
};

export default ProfitLossReport;
