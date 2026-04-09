import React, { useMemo } from 'react';
import { Wallet, Landmark, Smartphone, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Transaction, OpeningBalances } from '../../types';
import { formatINR } from '../../utils/financeUtils';

interface AccountsOverviewProps {
  transactions: Transaction[];
  openingBalances: OpeningBalances;
}

const AccountsOverview: React.FC<AccountsOverviewProps> = ({ transactions, openingBalances }) => {
  const accountStats = useMemo(() => {
    const stats = {
      Cash: { balance: openingBalances.Cash || 0, lastTxns: [] as Transaction[] },
      UPI: { balance: openingBalances.UPI || 0, lastTxns: [] as Transaction[] },
      Bank: { balance: openingBalances.Bank || 0, lastTxns: [] as Transaction[] },
    };

    // Calculate balances
    transactions.forEach(t => {
      const acc = t.account as keyof typeof stats;
      if (stats[acc]) {
        if (t.type === 'sale') stats[acc].balance += t.amount;
        else stats[acc].balance -= t.amount;
      }
    });

    // Get last 5 txns per account
    Object.keys(stats).forEach(acc => {
      stats[acc as keyof typeof stats].lastTxns = transactions
        .filter(t => t.account === acc)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    });

    return stats;
  }, [transactions]);

  const totalBalance = Object.values(accountStats).reduce((acc, curr) => acc + curr.balance, 0);

  const getIcon = (acc: string) => {
    switch (acc) {
      case 'Cash': return <Wallet size={18} />;
      case 'UPI': return <Smartphone size={18} />;
      case 'Bank': return <Landmark size={18} />;
      default: return <Wallet size={18} />;
    }
  };

  return (
    <div className="screen animate-in">
      <div className="screen-header" style={{ paddingBottom: 'var(--spacing-sm)' }}>
        <div>
          <p className="text-label" style={{ marginBottom: '0.125rem' }}>financial standing</p>
          <h1 className="text-title">Accounts</h1>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="card" style={{ padding: 'var(--spacing-section)', marginBottom: 'var(--spacing-section)', textAlign: 'center' }}>
        <p className="text-label" style={{ marginBottom: 'var(--spacing-sm)' }}>total available balance</p>
        <p className="mono-xl" style={{ margin: 0, color: totalBalance >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {formatINR(totalBalance)}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-section)' }}>
        {Object.entries(accountStats).map(([name, data]) => (
          <div key={name}>
            {/* Account Title & Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-m)', color: 'var(--text-1)' }}>
                  {getIcon(name)}
                </div>
                <h3 className="text-heading">{name}</h3>
              </div>
              <p className="text-number" style={{ fontSize: '1.125rem', color: data.balance >= 0 ? 'var(--text-0)' : 'var(--red)' }}>
                {formatINR(data.balance)}
              </p>
            </div>

            {/* Last 5 Transactions for this account */}
            <div className="card" style={{ padding: '0.5rem var(--spacing-card)' }}>
              {data.lastTxns.length === 0 ? (
                <p className="text-label" style={{ padding: '1.5rem 0', textAlign: 'center', fontStyle: 'italic', textTransform: 'none' }}>No transactions recorded for this account</p>
              ) : (
                data.lastTxns.map((t, idx) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 0', borderBottom: idx === data.lastTxns.length - 1 ? 'none' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ color: t.type === 'sale' ? 'var(--green)' : 'var(--red)' }}>
                        {t.type === 'sale' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div>
                        <p className="text-heading" style={{ fontSize: '0.8125rem' }}>{t.notes || t.category}</p>
                        <p className="text-label" style={{ textTransform: 'none' }}>{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                      </div>
                    </div>
                    <p className="text-number" style={{ fontSize: '0.8125rem', color: t.type === 'sale' ? 'var(--green)' : 'var(--text-1)' }}>
                      {t.type === 'sale' ? '+' : '-'}{formatINR(t.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: '5rem' }} />
    </div>
  );
};

export default AccountsOverview;
