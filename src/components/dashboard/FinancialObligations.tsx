import React, { useMemo } from 'react';
import { AlertCircle, Users, Truck, Calendar } from 'lucide-react';
import type { StaffMember, StaffTransaction, VendorTransaction, RecurringExpense } from '../../types';
import { formatINR } from '../../utils/financeUtils';

interface FinancialObligationsProps {
  staffMembers: StaffMember[];
  staffTransactions: StaffTransaction[];
  vendorTransactions: VendorTransaction[];
  recurringExpenses: RecurringExpense[];
}

const FinancialObligations: React.FC<FinancialObligationsProps> = ({
  staffMembers, staffTransactions, vendorTransactions, recurringExpenses
}) => {
  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7); // e.g. "2025-05"

  // ── Salary Payable ─────────────────────────────────────────────────────
  const salaryObligations = useMemo(() => {
    const activeStaff = (staffMembers || []).filter(s => s.status === 'active');

    return activeStaff.map(staff => {
      // What has been paid this month (salary type only)
      const paidThisMonth = (staffTransactions || [])
        .filter(t =>
          t.staffId === staff.id &&
          t.type === 'salary' &&
          t.date && t.date.slice(0, 7) === currentMonthKey
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyDue = staff.salaryBasis === 'daily'
        ? staff.salaryAmount * now.getDate() // rough estimate to current day of month
        : staff.salaryAmount;

      const outstanding = Math.max(0, monthlyDue - paidThisMonth);

      return { staff, monthlyDue, paidThisMonth, outstanding };
    }).filter(s => s.outstanding > 0);
  }, [staffMembers, staffTransactions, currentMonthKey]);

  const totalSalaryPayable = salaryObligations.reduce((sum, s) => sum + s.outstanding, 0);

  // ── Vendor Payables Ageing ─────────────────────────────────────────────
  const vendorAgeingItems = useMemo(() => {
    const creditMap: Record<string, { vendorName: string; amount: number; dueDate?: string; daysOverdue: number; invoiceNo?: string }[]> = {};

    (vendorTransactions || [])
      .filter(t => t.type === 'credit')
      .forEach(t => {
        // Check if this credit has been partially/fully paid by looking at net vendor balance
        // For simplicity, surface credits that have a dueDate set
        if (!t.dueDate) return;
        const daysLeft = Math.ceil((new Date(t.dueDate).getTime() - now.getTime()) / 86400000);
        // Show if due within 30 days or already overdue
        if (daysLeft > 30) return;
        if (!creditMap[t.vendorId]) creditMap[t.vendorId] = [];
        creditMap[t.vendorId].push({
          vendorName: t.vendorName,
          amount: t.amount,
          dueDate: t.dueDate,
          daysOverdue: daysLeft < 0 ? Math.abs(daysLeft) : 0,
          invoiceNo: t.invoiceNo,
        });
      });

    return Object.entries(creditMap).flatMap(([, items]) => items)
      .sort((a, b) => (a.daysOverdue > 0 ? -a.daysOverdue : 999) - (b.daysOverdue > 0 ? -b.daysOverdue : 999));
  }, [vendorTransactions]);

  // ── Upcoming Recurring Expenses (next 14 days) ────────────────────────
  const upcomingRecurring = useMemo(() => {
    return (recurringExpenses || [])
      .filter(r => r.status === 'active')
      .map(r => {
        let nextDueDate: Date | null = null;
        if (r.frequency === 'monthly' && r.dayOfMonth) {
          const d = new Date(now.getFullYear(), now.getMonth(), r.dayOfMonth);
          if (d < now) d.setMonth(d.getMonth() + 1);
          nextDueDate = d;
        } else if (r.frequency === 'weekly' && r.dayOfWeek !== undefined) {
          const d = new Date(now);
          const diff = (r.dayOfWeek - d.getDay() + 7) % 7 || 7;
          d.setDate(d.getDate() + diff);
          nextDueDate = d;
        }
        if (!nextDueDate) return null;
        const daysUntil = Math.ceil((nextDueDate.getTime() - now.getTime()) / 86400000);
        if (daysUntil > 14) return null;
        return { rec: r, nextDueDate, daysUntil };
      })
      .filter(Boolean) as { rec: RecurringExpense; nextDueDate: Date; daysUntil: number }[];
  }, [recurringExpenses]);

  const totalUpcomingRecurring = upcomingRecurring.reduce((s, r) => s + r.rec.amount, 0);

  const totalObligations = totalSalaryPayable + totalUpcomingRecurring;

  if (salaryObligations.length === 0 && vendorAgeingItems.length === 0 && upcomingRecurring.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: 'var(--spacing-section)' }}>
      <p className="section-label" style={{ marginBottom: '0.75rem' }}>financial obligations</p>

      {/* Summary Banner */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '0.75rem', background: 'var(--red-soft)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <AlertCircle size={16} color="var(--red)" />
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--red)' }}>Upcoming Outflows</p>
            <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-3)' }}>Salary unpaid + recurring due in 14d</p>
          </div>
        </div>
        <p className="mono" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--red)' }}>{formatINR(totalObligations)}</p>
      </div>

      {/* Salary Payable */}
      {salaryObligations.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '0.75rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <Users size={13} color="var(--text-2)" />
            <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Salary Payable — {currentMonthKey}</p>
            <span className="mono" style={{ marginLeft: 'auto', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--red)' }}>{formatINR(totalSalaryPayable)}</span>
          </div>
          {salaryObligations.map(({ staff, monthlyDue, paidThisMonth, outstanding }) => (
            <div key={staff.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>{staff.name}</p>
                <p style={{ margin: 0, fontSize: '0.625rem', color: 'var(--text-3)' }}>
                  {staff.position} · Paid {formatINR(paidThisMonth)} of {formatINR(monthlyDue)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="mono" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--red)' }}>{formatINR(outstanding)}</p>
                <p style={{ margin: 0, fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>pending</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vendor AP Ageing */}
      {vendorAgeingItems.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '0.75rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <Truck size={13} color="var(--text-2)" />
            <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vendor Credits Due Soon</p>
          </div>
          {vendorAgeingItems.map((item, i) => {
            const isOverdue = item.daysOverdue > 0;
            const daysLeft = item.dueDate ? Math.ceil((new Date(item.dueDate).getTime() - now.getTime()) / 86400000) : 0;
            return (
              <div key={i} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>{item.vendorName}</p>
                    <span style={{ fontSize: '0.5rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, background: isOverdue ? 'var(--red-soft)' : 'var(--yellow-soft)', color: isOverdue ? 'var(--red)' : 'var(--yellow)' }}>
                      {isOverdue ? `${item.daysOverdue}d OVERDUE` : daysLeft === 0 ? 'DUE TODAY' : `${daysLeft}d left`}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.625rem', color: 'var(--text-3)' }}>
                    {item.dueDate && `Pay by ${new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                    {item.invoiceNo && ` · #${item.invoiceNo}`}
                  </p>
                </div>
                <p className="mono" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: isOverdue ? 'var(--red)' : 'var(--yellow)' }}>{formatINR(item.amount)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming Recurring */}
      {upcomingRecurring.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <Calendar size={13} color="var(--text-2)" />
            <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fixed Costs Due (14 days)</p>
            <span className="mono" style={{ marginLeft: 'auto', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-1)' }}>{formatINR(totalUpcomingRecurring)}</span>
          </div>
          {upcomingRecurring.map(({ rec, daysUntil }) => (
            <div key={rec.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>{rec.name}</p>
                <p style={{ margin: 0, fontSize: '0.625rem', color: 'var(--text-3)' }}>
                  {rec.category} · {daysUntil === 0 ? 'Due today' : `In ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}
                </p>
              </div>
              <p className="mono" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>{formatINR(rec.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FinancialObligations;
