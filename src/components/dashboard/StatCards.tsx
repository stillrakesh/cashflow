import React from 'react';
import type { DashboardStats, Role } from '../../types';
import { formatINR } from '../../utils/financeUtils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardsProps {
  stats: DashboardStats;
  role: Role;
  todaySales: number;
  todayExpenses: number;
}

const StatCards: React.FC<StatCardsProps> = ({ stats, role, todaySales, todayExpenses }) => {
  const isProfit = stats.netProfit >= 0;
  const isAdmin = role === 'admin';

  if (!isAdmin) {
    return (
      <div style={{ marginBottom: 'var(--spacing-section)' }}>
        <p className="section-label">your daily activity</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
          <div className="card" style={{ padding: '0.875rem' }}>
            <p className="text-label" style={{ marginBottom: '0.25rem' }}>your daily sales</p>
            <p className="text-number" style={{ color: 'var(--green)' }}>{formatINR(stats.totalSales)}</p>
          </div>
          <div className="card" style={{ padding: '0.875rem' }}>
            <p className="text-label" style={{ marginBottom: '0.25rem' }}>your daily expenses</p>
            <p className="text-number" style={{ color: 'var(--red)' }}>{formatINR(stats.totalExpenses)}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard Layout ──
  return (
    <div className="animate-in" style={{ marginBottom: 'var(--spacing-section)' }}>
      {/* 1. Today In / Today Out Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-section)' }}>
        <div style={{ padding: '12px', background: 'var(--green-soft)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <p className="text-label" style={{ color: 'var(--green)', fontSize: '0.625rem', marginBottom: '8px' }}>TODAY IN</p>
          <p className="text-number" style={{ color: 'var(--green)', fontSize: '1.25rem' }}>{formatINR(todaySales)}</p>
        </div>
        <div style={{ padding: '12px', background: 'var(--red-soft)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <p className="text-label" style={{ color: 'var(--red)', fontSize: '0.625rem', marginBottom: '8px' }}>TODAY OUT</p>
          <p className="text-number" style={{ color: 'var(--red)', fontSize: '1.25rem' }}>{formatINR(todayExpenses)}</p>
        </div>
      </div>

      <p className="section-label" style={{ marginBottom: 'var(--spacing-sm)' }}>CURRENT POSITION</p>

      {/* 2. Hero Card: Net Profit & Sub-stats */}
      <div className="card" style={{ padding: '24px 16px', textAlign: 'center', marginBottom: 'var(--spacing-section)' }}>
        <p className="text-label" style={{ marginBottom: '8px' }}>NET PROFIT</p>
        <p className="mono-xl" style={{ color: isProfit ? 'var(--green)' : 'var(--red)', fontSize: '2.5rem', marginBottom: '4px' }}>
          {formatINR(stats.netProfit)}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '20px' }}>
          {isProfit ? <TrendingUp size={14} color="var(--green)" /> : <TrendingDown size={14} color="var(--red)" />}
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>margin {stats.profitMargin.toFixed(1)}%</span>
        </div>

        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <p className="text-label" style={{ fontSize: '0.625rem', marginBottom: '4px' }}>MONEY IN</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <ArrowUpRight size={14} color="var(--green)" />
              <span className="text-number" style={{ fontSize: '1rem' }}>{formatINR(stats.totalSales)}</span>
            </div>
          </div>
          <div>
            <p className="text-label" style={{ fontSize: '0.625rem', marginBottom: '4px' }}>MONEY OUT</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <ArrowDownRight size={14} color="var(--red)" />
              <span className="text-number" style={{ fontSize: '1rem' }}>{formatINR(stats.totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Global Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
        <div className="card" style={{ padding: '12px' }}>
          <p className="text-label" style={{ fontSize: '0.625rem', marginBottom: '8px' }}>EST. COGS</p>
          <p className="text-number" style={{ color: 'var(--yellow)', fontSize: '1.125rem' }}>{formatINR(stats.cogs)}</p>
        </div>
        <div className="card" style={{ padding: '12px' }}>
          <p className="text-label" style={{ fontSize: '0.625rem', marginBottom: '8px' }}>AVG DAILY SALES</p>
          <p className="text-number" style={{ fontSize: '1.125rem' }}>{formatINR(stats.avgDailySales)}</p>
        </div>
        <div className="card" style={{ padding: '12px' }}>
          <p className="text-label" style={{ fontSize: '0.625rem', marginBottom: '8px' }}>AVAILABLE CASH</p>
          <p className="text-number" style={{ color: stats.availableCash >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '1.125rem' }}>{formatINR(stats.availableCash)}</p>
        </div>
        <div className="card" style={{ padding: '12px' }}>
          <p className="text-label" style={{ fontSize: '0.625rem', marginBottom: '8px' }}>NET PROFIT</p>
          <p className="text-number" style={{ color: isProfit ? 'var(--green)' : 'var(--red)', fontSize: '1.125rem' }}>{formatINR(stats.netProfit)}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCards;
