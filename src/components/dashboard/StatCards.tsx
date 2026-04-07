import React from 'react';
import type { DashboardStats, Role } from '../../types';
import { formatINR } from '../../utils/financeUtils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardsProps {
  stats: DashboardStats;
  role: Role;
}

const StatCards: React.FC<StatCardsProps> = ({ stats, role }) => {
  const isProfit = stats.netProfit >= 0;
  const isAdmin = role === 'admin';

  return (
    <div style={{ marginBottom: '2rem' }}>
      <p className="section-label">{isAdmin ? 'current position' : 'your daily activity'}</p>
      
      {isAdmin ? (
        <div className="card animate-in" style={{
          background: 'var(--bg-card)',
          padding: '1.5rem',
          borderRadius: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          marginBottom: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Soft glowing background effect like the reference */}
          <div style={{
            position: 'absolute',
            top: '-50%', left: '-20%', width: '150%', height: '150%',
            background: 'radial-gradient(circle, rgba(162, 255, 134, 0.05) 0%, rgba(0,0,0,0) 70%)',
            zIndex: 0, pointerEvents: 'none'
          }} />

          <div style={{ zIndex: 1, position: 'relative' }}>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-3)',
              margin: '0 0 0.5rem',
              display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center'
            }}>
               net profit
            </p>
            
            <h2 className="mono" style={{
               fontSize: '2.5rem',
               fontWeight: 500,
               color: isProfit ? 'var(--green)' : 'var(--red)',
               margin: '0 0 0.25rem',
               lineHeight: 1
            }}>
              {formatINR(stats.netProfit)}
            </h2>

            <p style={{
               fontSize: '0.875rem',
               color: 'var(--text-2)',
               margin: 0,
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
            }}>
              {isProfit ? <TrendingUp size={14} color="var(--green)" /> : <TrendingDown size={14} color="var(--red)" />}
              margin {stats.profitMargin.toFixed(1)}%
            </p>
          </div>
          
          {/* Action / Quick Stats Row at bottom of card */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', 
            width: '100%', marginTop: '1.5rem', paddingTop: '1.25rem',
            borderTop: '1px dashed var(--border)', zIndex: 1, position: 'relative'
          }}>
             <div>
               <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>money in</p>
               <p className="mono" style={{ fontSize: '1rem', color: 'var(--text-0)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                 <ArrowUpRight size={14} color="var(--green)" /> {formatINR(stats.totalSales)}
               </p>
             </div>
             <div>
               <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>money out</p>
               <p className="mono" style={{ fontSize: '1rem', color: 'var(--text-0)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                 <ArrowDownRight size={14} color="var(--red)" /> {formatINR(stats.totalExpenses)}
               </p>
             </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>your daily sales</p>
            <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--green)' }}>{formatINR(stats.totalSales)}</p>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>your daily expenses</p>
            <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--red)' }}>{formatINR(stats.totalExpenses)}</p>
          </div>
        </div>
      )}

      {/* Secondary Metrics */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="card animate-in" style={{ padding: '0.875rem', animationDelay: '50ms' }}>
             <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>est. cogs</p>
             <p className="mono" style={{ fontSize: '1rem', color: 'var(--yellow)', margin: 0 }}>{formatINR(stats.cogs)}</p>
          </div>
          <div className="card animate-in" style={{ padding: '0.875rem', animationDelay: '100ms' }}>
             <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>avg daily sales</p>
             <p className="mono" style={{ fontSize: '1rem', color: 'var(--text-0)', margin: 0 }}>{formatINR(stats.avgDailySales)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCards;
