import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Plus, Edit2, Trash2, DollarSign,
  ChevronDown, CheckCircle2, Filter
} from 'lucide-react';
import type { StaffMember, StaffTransaction, StaffTransactionType, Transaction, User, PaymentType } from '../../types';
import { formatINR } from '../../utils/financeUtils';
import ConfirmModal from '../shared/ConfirmModal';
import AlertModal from '../shared/AlertModal';
import CustomSelect from '../shared/CustomSelect';
import DatePicker from '../shared/DatePicker';

interface StaffLedgerProps {
  staffMember: StaffMember;
  staffTransactions: StaffTransaction[];
  orgId: string;
  currentUser: User;
  onSaveTransaction: (staffTxn: StaffTransaction, globalTxn?: Transaction) => Promise<void>;
  onDeleteTransaction: (staffTxnId: string, globalTxnId?: string) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onUpdateStaff: (staff: StaffMember) => Promise<void>;
  onRestore?: () => Promise<void>;
  onBack: () => void;
}

const TXN_TYPE_LABELS: Record<StaffTransactionType, { label: string; color: string; bg: string; sign: 1 | -1 }> = {
  salary:        { label: 'Salary',        color: 'var(--green)',  bg: 'var(--green-soft)',  sign: -1 },
  advance:       { label: 'Advance Salary',color: 'var(--green)', bg: 'var(--green-soft)', sign: -1 },
  bonus:         { label: 'Bonus',         color: 'var(--green)',  bg: 'var(--green-soft)',  sign: -1 },
  incentive:     { label: 'Incentive',     color: 'var(--blue)',   bg: 'var(--blue-soft)',   sign: -1 },
  reimbursement: { label: 'Reimburse',     color: 'var(--blue)',   bg: 'var(--blue-soft)',   sign: -1 },
  deduction:     { label: 'Deduction',     color: 'var(--red)',    bg: 'var(--red-soft)',    sign:  1 },
  penalty:       { label: 'Penalty',       color: 'var(--red)',    bg: 'var(--red-soft)',    sign:  1 },
  adjustment:    { label: 'Adjustment',    color: 'var(--text-2)', bg: 'var(--bg-2)',        sign:  1 },
};

const StaffLedger: React.FC<StaffLedgerProps> = ({
  staffMember, staffTransactions, orgId, currentUser,
  onSaveTransaction, onDeleteTransaction, onEdit, onDelete, onUpdateStaff, onRestore, onBack
}) => {
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [txnType, setTxnType] = useState<StaffTransactionType>('salary');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [txnNotes, setTxnNotes] = useState('');
  const [txnPayment, setTxnPayment] = useState<PaymentType>('cash');
  const [txnPeriod, setTxnPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // --- Filter state ---
  type FilterMode = 'month' | 'all' | 'last3' | 'last6' | 'custom';
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonthOnly, setFilterMonthOnly] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const filterMonth = filterMode === 'month' ? `${filterYear}-${filterMonthOnly}` : 'all';

  // For custom/preset ranges, compute date boundaries
  const dateRange = useMemo((): { from: string; to: string } | null => {
    const now = new Date();
    if (filterMode === 'all') return null;
    if (filterMode === 'month') return null; // handled by filterMonth
    if (filterMode === 'last3') {
      const from = new Date(now); from.setMonth(now.getMonth() - 2); from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    if (filterMode === 'last6') {
      const from = new Date(now); from.setMonth(now.getMonth() - 5); from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    if (filterMode === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return null;
  }, [filterMode, customFrom, customTo]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    staffTransactions.forEach(t => {
      if (t.date) years.add(t.date.slice(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [staffTransactions]);

  const monthsList = [
    { val: '01', label: 'Jan' }, { val: '02', label: 'Feb' }, { val: '03', label: 'Mar' },
    { val: '04', label: 'Apr' }, { val: '05', label: 'May' }, { val: '06', label: 'Jun' },
    { val: '07', label: 'Jul' }, { val: '08', label: 'Aug' }, { val: '09', label: 'Sep' },
    { val: '10', label: 'Oct' }, { val: '11', label: 'Nov' }, { val: '12', label: 'Dec' }
  ];

  const filterLabel = (() => {
    if (filterMode === 'all') return 'All Time';
    if (filterMode === 'last3') return 'Last 3 Months';
    if (filterMode === 'last6') return 'Last 6 Months';
    if (filterMode === 'custom' && customFrom && customTo) {
      const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return `${fmt(customFrom)} – ${fmt(customTo)}`;
    }
    const m = monthsList.find(x => x.val === filterMonthOnly);
    return `${m?.label} ${filterYear}`;
  })();

  // Modals state
  const [confirmAction, setConfirmAction] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);

  // Financial summary
  const summary = useMemo(() => {
    // Total lifetime across all months
    const totalSalaryPaid = staffTransactions.filter(t => t.type === 'salary' || t.type === 'advance').reduce((a, t) => a + t.amount, 0);
    const totalBonuses = staffTransactions.filter(t => t.type === 'bonus' || t.type === 'incentive' || t.type === 'reimbursement').reduce((a, t) => a + t.amount, 0);
    
    // Filter transactions for calculations based on the filterMonth
    const thisMonthTxns = filterMonth === 'all' ? [] : staffTransactions.filter(t => {
      const period = t.period || t.date.slice(0, 7);
      return period === filterMonth;
    });

    const thisMonthSalary = thisMonthTxns.filter(t => t.type === 'salary' || t.type === 'advance').reduce((a, t) => a + t.amount, 0);
    const thisMonthDeductions = thisMonthTxns.filter(t => t.type === 'deduction' || t.type === 'penalty').reduce((a, t) => a + t.amount, 0);
    
    // Attendance-based calculation for daily/monthly staff
    const daysWorked = (filterMonth !== 'all' && staffMember.monthlyAttendance?.[filterMonth]) || 0;
    const effectiveSalary = filterMonth !== 'all' ? (staffMember.historicalSalaries?.[filterMonth] ?? staffMember.salaryAmount) : staffMember.salaryAmount;
    const expectedSalary = staffMember.salaryBasis === 'daily' 
      ? (effectiveSalary * daysWorked)
      : effectiveSalary;

    const hasJoinedAtSelectedMonth = filterMonth === 'all' || staffMember.joiningDate.slice(0, 7) <= filterMonth;
    const pendingSalary = (filterMonth !== 'all' && hasJoinedAtSelectedMonth) 
      ? Math.max(0, expectedSalary - thisMonthDeductions - thisMonthSalary) 
      : 0;
    
    const netPayable = pendingSalary;
    
    // Expected liability for the month (Salary - Deductions)
    const monthExpectedLiability = Math.max(0, expectedSalary - thisMonthDeductions);
    
    // Outstanding Advances (Total Advances - Total Salary/Incentive/Adjustment offsets)
    // For simplicity, let's track total advances vs total deductions across ALL time
    const lifetimeAdvances = staffTransactions.filter(t => t.type === 'advance').reduce((a, t) => a + t.amount, 0);
    const lifetimeDeductions = staffTransactions.filter(t => t.type === 'deduction' || t.type === 'penalty').reduce((a, t) => a + t.amount, 0);
    const outstandingAdvance = Math.max(0, lifetimeAdvances - lifetimeDeductions);

    const totalLifetime = totalSalaryPaid + totalBonuses;
    const lastTxn = staffTransactions.length > 0
      ? staffTransactions.sort((a, b) => b.date.localeCompare(a.date))[0]
      : null;

    return { 
      totalSalaryPaid, pendingSalary, netPayable, totalLifetime, lastTxn, 
      thisMonthSalary, thisMonthDeductions, daysWorked, expectedSalary: monthExpectedLiability,
      outstandingAdvance, isSettled: filterMonth !== 'all' && hasJoinedAtSelectedMonth && pendingSalary <= 0 && thisMonthSalary > 0
    };
  }, [staffTransactions, staffMember, filterMonth]);

  const filteredTxns = useMemo(() => {
    let txns = [...staffTransactions];
    if (filterMode === 'month') {
      txns = txns.filter(t => (t.period || t.date.slice(0, 7)) === filterMonth);
    } else if (dateRange) {
      txns = txns.filter(t => {
        const d = (t.period ? t.period + '-01' : t.date).slice(0, 10);
        return d >= dateRange.from && d <= dateRange.to;
      });
    }
    return txns.sort((a, b) => b.date.localeCompare(a.date));
  }, [staffTransactions, filterMode, filterMonth, dateRange]);

  const handleAddTransaction = async () => {
    const amt = parseFloat(txnAmount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      const id = 'stxn_' + Date.now().toString(36);
      const globalId = 'txn_' + Date.now().toString(36) + '_s';
      const dateIso = new Date(txnDate).toISOString();

      const staffTxn: StaffTransaction = {
        id, orgId,
        staffId: staffMember.id,
        staffName: staffMember.name,
        type: txnType,
        amount: amt,
        date: dateIso,
        notes: txnNotes.trim() || '',
        paymentMethod: txnPayment,
        addedBy: currentUser.id,
        addedByName: currentUser.name,
        referenceId: `${txnType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        globalTxnId: globalId,
        period: txnPeriod,
      };

      const noGlobalTxnTypes = ['deduction', 'penalty', 'adjustment'];
      const shouldCreateGlobal = !noGlobalTxnTypes.includes(txnType);

      if (shouldCreateGlobal) {
        const globalTxn: Transaction = {
          id: globalId,
          orgId,
          type: 'expense',
          amount: amt,
          date: dateIso,
          notes: `[Staff] ${TXN_TYPE_LABELS[txnType].label} — ${staffMember.name}${txnNotes ? ': ' + txnNotes : ''}`,
          status: 'approved',
          userId: currentUser.id,
          userName: currentUser.name,
          category: txnType === 'salary' ? 'salary' : txnType === 'advance' ? 'salary' : 'misc',
          paymentType: txnPayment,
          classification: 'fixed',
          createdAt: new Date().toISOString(),
          vendor: staffMember.name,
        };
        await onSaveTransaction(staffTxn, globalTxn);
      } else {
        await onSaveTransaction(staffTxn); // Internal ledger only
      }

      setTxnAmount('');
      setTxnNotes('');
      setTxnDate(new Date().toISOString().split('T')[0]);
      setShowAddTxn(false);
    } catch (err: any) {
      console.error(err);
      setAlertMsg(err.message || 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  const statusColor = staffMember.status === 'active' ? 'var(--green)' : staffMember.status === 'on-leave' ? 'var(--yellow)' : 'var(--text-3)';

  return (
    <div className="animate-in">
      {/* Header Row 1: Back + Name + Edit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem', marginBottom: '0.5rem' }}>
        <button onClick={onBack} className="btn-secondary" style={{ width: '36px', height: '36px', padding: 0, flexShrink: 0 }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staffMember.name}</h2>
            <span style={{ fontSize: '0.5625rem', padding: '2px 6px', borderRadius: '4px', background: statusColor + '20', color: statusColor, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>
              {staffMember.status}
            </span>
            {summary.isSettled && (
              <span style={{ fontSize: '0.5625rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--green-soft)', color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                <CheckCircle2 size={9} /> SETTLED
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>{staffMember.position}</p>
        </div>
        <button onClick={onEdit} className="btn-secondary" style={{ padding: '0 0.75rem', height: '36px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <Edit2 size={12} /> Edit
        </button>
      </div>

      {/* Header Row 2: Filter Pill */}
      <div style={{ marginBottom: '1.25rem', position: 'relative', zIndex: 50 }}>
        <button
          onClick={() => setShowFilterPanel(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-full)',
            background: 'var(--bg-2)', border: '1px solid var(--border-strong)',
            color: 'var(--text-1)', fontSize: '0.75rem', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Filter size={12} color="var(--text-3)" />
          <span>{filterLabel}</span>
          <ChevronDown size={12} color="var(--text-3)" style={{ transform: showFilterPanel ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
        </button>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="card animate-in" style={{ marginTop: '0.5rem', padding: '1rem', border: '1px solid var(--border-strong)' }}>
            {/* Presets */}
            <p style={{ fontSize: '0.5625rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Quick Select</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
              {([
                { mode: 'month', label: 'By Month' },
                { mode: 'last3', label: 'Last 3 Months' },
                { mode: 'last6', label: 'Last 6 Months' },
                { mode: 'all', label: 'All Time' },
                { mode: 'custom', label: 'Custom Range' },
              ] as { mode: FilterMode; label: string }[]).map(opt => (
                <button key={opt.mode} type="button"
                  onClick={() => setFilterMode(opt.mode)}
                  style={{
                    padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)',
                    border: '1px solid', fontSize: '0.75rem', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    borderColor: filterMode === opt.mode ? 'var(--blue)' : 'var(--border)',
                    background: filterMode === opt.mode ? 'var(--blue-soft)' : 'transparent',
                    color: filterMode === opt.mode ? 'var(--blue)' : 'var(--text-2)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Month picker row */}
            {filterMode === 'month' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <CustomSelect value={filterYear} onChange={setFilterYear} options={availableYears.map(y => ({ value: y, label: y }))} minWidth="80px" />
                <CustomSelect value={filterMonthOnly} onChange={setFilterMonthOnly} options={monthsList.map(m => ({ value: m.val, label: m.label }))} minWidth="80px" />
              </div>
            )}

            {/* Custom date range */}
            {filterMode === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                <div>
                  <p style={{ fontSize: '0.5625rem', color: 'var(--text-3)', margin: '0 0 4px', textTransform: 'uppercase' }}>From</p>
                  <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="Start date" />
                </div>
                <div>
                  <p style={{ fontSize: '0.5625rem', color: 'var(--text-3)', margin: '0 0 4px', textTransform: 'uppercase' }}>To</p>
                  <DatePicker value={customTo} onChange={setCustomTo} placeholder="End date" minDate={customFrom || undefined} />
                </div>
              </div>
            )}

            {filterMode !== 'month' && filterMode !== 'custom' && (
              <button onClick={() => setShowFilterPanel(false)} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}>Apply</button>
            )}
            {(filterMode === 'month' || filterMode === 'custom') && (
              <button onClick={() => setShowFilterPanel(false)} className="btn-primary" style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}>Apply</button>
            )}
          </div>
        )}
      </div>

      {filterMonth !== 'all' && staffMember.joiningDate.slice(0, 7) > filterMonth && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', background: 'var(--bg-2)', border: '1px dashed var(--border)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-3)' }}>
            This member joined on <strong>{new Date(staffMember.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>.
            <br />No payroll records for {new Date(filterMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
      )}

      {/* Attendance & Summary Cards */}
      {filterMonth !== 'all' && (
        <div className="card animate-in" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--blue-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} color="var(--blue)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>Attendance Tracker</p>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                {staffMember.salaryBasis === 'daily' ? `Days worked in ${new Date(filterMonth + '-01').toLocaleDateString('en-IN', { month: 'short' })}` : `Presence / Holidays tracking`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={() => {
                const days = Math.max(0, summary.daysWorked - 1);
                const newAtt = { ...(staffMember.monthlyAttendance || {}), [filterMonth]: days };
                onUpdateStaff({ ...staffMember, monthlyAttendance: newAtt });
              }}
              className="btn-secondary" style={{ padding: '0 0.75rem', height: '32px' }}>-</button>
            <span style={{ minWidth: '30px', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>{summary.daysWorked}</span>
            <button 
              onClick={() => {
                const days = summary.daysWorked + 1;
                const newAtt = { ...(staffMember.monthlyAttendance || {}), [filterMonth]: days };
                onUpdateStaff({ ...staffMember, monthlyAttendance: newAtt });
              }}
              className="btn-secondary" style={{ padding: '0 0.75rem', height: '32px' }}>+</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '0.875rem', borderLeft: '3px solid var(--blue)' }}>
          <p className="text-label" style={{ fontSize: '0.5625rem', color: 'var(--blue)', marginBottom: '5px' }}>{staffMember.salaryBasis === 'daily' ? 'EXPECTED EARNINGS' : 'MONTHLY SALARY'}</p>
          <p className="mono" style={{ fontSize: '1.125rem', fontWeight: 700 }}>{formatINR(summary.expectedSalary)}</p>
          {staffMember.salaryBasis === 'daily' && (
             <p style={{ margin: 0, fontSize: '0.5625rem', color: 'var(--text-3)' }}>{formatINR(staffMember.salaryAmount)}/day × {summary.daysWorked} days</p>
          )}
        </div>
        <div className="card" style={{ padding: '0.875rem', borderLeft: '3px solid var(--green)' }}>
          <p className="text-label" style={{ fontSize: '0.5625rem', marginBottom: '5px', color: 'var(--green)' }}>
            {filterMonth === 'all' ? 'LIFETIME PAID' : `PAID IN ${new Date(filterMonth + '-01').toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}`}
          </p>
          <p className="mono" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--green)' }}>
            {formatINR(filterMonth === 'all' ? summary.totalSalaryPaid : summary.thisMonthSalary)}
          </p>
          {filterMonth !== 'all' && summary.thisMonthDeductions > 0 && (
             <p style={{ margin: 0, fontSize: '0.5625rem', color: 'var(--red)' }}>Less Deductions: {formatINR(summary.thisMonthDeductions)}</p>
          )}
        </div>
      </div>

      {/* Net Payable Banner */}
      {summary.pendingSalary > 0 && (
        <div className="card animate-in" style={{ padding: '1rem', marginBottom: '1.25rem', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>Net Payable</p>
            <p className="mono" style={{ margin: '4px 0 0', fontSize: '1.375rem', fontWeight: 700, color: 'var(--green)' }}>{formatINR(summary.netPayable)}</p>
          </div>
        </div>
      )}

      {/* Add Transaction Button */}
      <button
        onClick={() => setShowAddTxn(v => !v)}
        className="btn-primary"
        style={{ width: '100%', gap: '0.5rem', marginBottom: '1.25rem', justifyContent: 'center' }}
      >
        <Plus size={16} /> Record Payment
        <ChevronDown size={14} style={{ marginLeft: 'auto', transform: showAddTxn ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Add Transaction Form */}
      {showAddTxn && (
        <div className="card animate-in" style={{ padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--blue-soft)' }}>
          <p className="section-label" style={{ marginBottom: '1rem' }}>record payment</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
            {(Object.keys(TXN_TYPE_LABELS) as StaffTransactionType[]).map(type => (
              <button key={type} onClick={() => setTxnType(type)}
                style={{ padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 600, border: '1px solid', borderColor: txnType === type ? TXN_TYPE_LABELS[type].color : 'var(--border)', background: txnType === type ? TXN_TYPE_LABELS[type].bg : 'transparent', color: txnType === type ? TXN_TYPE_LABELS[type].color : 'var(--text-2)', cursor: 'pointer' }}>
                {TXN_TYPE_LABELS[type].label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
            <div>
              <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Amount (₹)</label>
              <input className="input" type="number" min="1" value={txnAmount} onChange={e => setTxnAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Date</label>
              <DatePicker value={txnDate} onChange={setTxnDate} />
            </div>
          </div>

          <div style={{ marginBottom: '0.625rem' }}>
            <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Payment Method</label>
            <CustomSelect
              value={txnPayment}
              onChange={v => setTxnPayment(v as PaymentType)}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'upi', label: 'UPI' },
                { value: 'bank', label: 'Bank Transfer' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>

          <div style={{ marginBottom: '0.625rem' }}>
            <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Salary For Month (Settlement Period)</label>
            <select className="input" value={txnPeriod} onChange={e => setTxnPeriod(e.target.value)} style={{ background: 'var(--blue-soft)', borderColor: 'var(--blue)' }}>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const val = d.toISOString().slice(0, 7);
                return <option key={val} value={val}>{d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</option>;
              })}
              <option value="all">Other / Global</option>
            </select>
            <p style={{ margin: '4px 0 0', fontSize: '0.625rem', color: 'var(--text-3)' }}>
              The payment will be recorded in cashflow on <strong>{new Date(txnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</strong> but settled against <strong>{new Date(txnPeriod + '-01').toLocaleDateString('en-IN', { month: 'long' })}</strong> salary.
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Notes (optional)</label>
            <input className="input" value={txnNotes} onChange={e => setTxnNotes(e.target.value)} placeholder="e.g. August salary, festival advance..." />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleAddTransaction} className="btn-primary" style={{ flex: 1 }} disabled={saving || !txnAmount}>
              {saving ? 'saving...' : `Record ${TXN_TYPE_LABELS[txnType].label}`}
            </button>
            <button onClick={() => setShowAddTxn(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Month Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <p className="section-label" style={{ margin: 0 }}>transaction ledger</p>
      </div>

      {/* Transactions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        {filteredTxns.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>
            No transactions {filterMonth !== 'all' ? `for ${new Date(filterMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}` : ''}
          </div>
        ) : (
          filteredTxns.map((t, i) => {
            const meta = TXN_TYPE_LABELS[t.type];
            return (
              <div key={t.id} style={{ padding: '0.875rem 1rem', borderBottom: i < filteredTxns.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <DollarSign size={14} color={meta.color} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{meta.label}</span>
                      <span style={{ fontSize: '0.5625rem', background: meta.bg, color: meta.color, padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>{t.paymentMethod.toUpperCase()}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                      Paid: {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {t.period && t.period !== t.date.slice(0, 7) && (
                        <span style={{ color: 'var(--blue)', fontWeight: 600 }}> · For {new Date(t.period + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                      )}
                      {t.notes && ` · ${t.notes}`}
                    </p>
                    {t.referenceId && <p style={{ margin: 0, fontSize: '0.5625rem', color: 'var(--text-4)', fontFamily: 'monospace' }}>{t.referenceId}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <p className="mono" style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: meta.color }}>
                    -{formatINR(t.amount)}
                  </p>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        title: 'Delete Transaction',
                        message: 'Delete this transaction? This will also remove it from the global cashflow.',
                        onConfirm: async () => {
                          setConfirmAction(null);
                          try {
                            await onDeleteTransaction(t.id, t.globalTxnId);
                          } catch (err: any) {
                            setAlertMsg(err.message || 'Failed to delete transaction.');
                          }
                        }
                      });
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-4)', padding: '0.25rem', cursor: 'pointer', display: 'flex' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lifetime Stats */}
      <p className="section-label">staff summary</p>
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total Salary Paid', value: formatINR(summary.totalSalaryPaid), color: 'var(--green)' },
          { label: 'Outstanding Advance', value: formatINR(summary.outstandingAdvance), color: summary.outstandingAdvance > 0 ? 'var(--yellow)' : 'var(--text-3)' },
          { label: 'Last Payment', value: summary.lastTxn ? new Date(summary.lastTxn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never', color: 'var(--text-2)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{label}</span>
            <span className="mono" style={{ fontSize: '0.875rem', fontWeight: 600, color }}>{value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0 0' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Joining Date</span>
          <span className="mono" style={{ fontSize: '0.875rem' }}>{new Date(staffMember.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Danger Zone / Restore */}
      {staffMember.status === 'active' ? (
        <button
          onClick={() => {
            setConfirmAction({
              title: 'Archive Staff',
              message: `Archive ${staffMember.name}? They will be marked inactive.`,
              onConfirm: async () => {
                setConfirmAction(null);
                try {
                  await onDelete();
                } catch (err: any) {
                  setAlertMsg(err.message || 'Failed to archive staff member.');
                }
              }
            });
          }}
          className="btn-danger"
          style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem' }}
        >
          <Trash2 size={14} /> Archive Staff Member
        </button>
      ) : (
        <button
          onClick={() => {
            setConfirmAction({
              title: 'Restore Staff',
              message: `Restore ${staffMember.name} to active staff?`,
              onConfirm: async () => {
                setConfirmAction(null);
                try {
                  if (onRestore) await onRestore();
                } catch (err: any) {
                  setAlertMsg(err.message || 'Failed to restore staff member.');
                }
              }
            });
          }}
          className="btn-primary"
          style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem' }}
        >
          <CheckCircle2 size={14} /> Restore Staff Member
        </button>
      )}

      <div style={{ height: '5rem' }} />

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {alertMsg && (
        <AlertModal
          message={alertMsg}
          onClose={() => setAlertMsg(null)}
        />
      )}
    </div>
  );
};

export default StaffLedger;
