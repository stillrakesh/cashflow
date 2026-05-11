import React, { useState, useMemo } from 'react';
import { Users, Search, Plus, ChevronRight, ArrowLeft, AlertCircle, TrendingDown, Filter, ChevronDown } from 'lucide-react';
import type { StaffMember, StaffTransaction, Transaction, User } from '../../types';
import { formatINR } from '../../utils/financeUtils';
import StaffLedger from './StaffLedger';
import StaffForm from './StaffForm';
import CustomSelect from '../shared/CustomSelect';
import DatePicker from '../shared/DatePicker';

interface StaffManagerProps {
  staff: StaffMember[];
  staffTransactions: StaffTransaction[];
  orgId: string;
  currentUser: User;
  onSaveStaff: (staff: StaffMember) => Promise<void>;
  onDeleteStaff: (staffId: string) => Promise<void>;
  onSaveStaffTransaction: (staffTxn: StaffTransaction, globalTxn?: Transaction) => Promise<void>;
  onDeleteStaffTransaction: (staffTxnId: string, globalTxnId?: string) => Promise<void>;
  onBack: () => void;
}

const StaffManager: React.FC<StaffManagerProps> = ({
  staff, staffTransactions, orgId, currentUser,
  onSaveStaff, onDeleteStaff, onSaveStaffTransaction, onDeleteStaffTransaction, onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');

  // --- Advanced filter ---
  type FilterMode = 'month' | 'all' | 'last3' | 'last6' | 'custom';
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonthOnly, setFilterMonthOnly] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const filterMonth = filterMode === 'month' ? `${filterYear}-${filterMonthOnly}` : 'all';

  const dateRange = useMemo((): { from: string; to: string } | null => {
    const now = new Date();
    if (filterMode === 'all' || filterMode === 'month') return null;
    
    // For last3 and last6, we want to include the entirely of the current month.
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    if (filterMode === 'last3') {
      const from = new Date(now); from.setMonth(now.getMonth() - 2); from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: endOfCurrentMonth.toISOString().slice(0, 10) };
    }
    if (filterMode === 'last6') {
      const from = new Date(now); from.setMonth(now.getMonth() - 5); from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: endOfCurrentMonth.toISOString().slice(0, 10) };
    }
    if (filterMode === 'custom' && customFrom && customTo) return { from: customFrom, to: customTo };
    return null;
  }, [filterMode, customFrom, customTo]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    staffTransactions.forEach(t => { if (t.date) years.add(t.date.slice(0, 4)); });
    return Array.from(years).sort().reverse();
  }, [staffTransactions]);

  const months = [
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
    const m = months.find(x => x.val === filterMonthOnly);
    return `${m?.label} ${filterYear}`;
  })();

  // Filter transactions for stats — works for all modes
  const filteredTxnsForStats = useMemo(() => {
    if (filterMode === 'all') return staffTransactions;
    if (filterMode === 'month') return staffTransactions.filter(t => (t.period || t.date.slice(0, 7)) === filterMonth);
    if (dateRange) return staffTransactions.filter(t => {
      const d = (t.period ? t.period + '-01' : t.date).slice(0, 10);
      return d >= dateRange.from && d <= dateRange.to;
    });
    return [];
  }, [staffTransactions, filterMode, filterMonth, dateRange]);



  const globalStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    // Build the YYYY-MM month list covered by this filter
    const buildCoveredMonths = (): string[] => {
      let fromStr: string;
      let toStr: string;

      if (filterMode === 'month') {
        return [filterMonth];
      } else if (filterMode === 'last3') {
        const from = new Date(now); from.setMonth(now.getMonth() - 2); from.setDate(1);
        fromStr = from.toISOString().slice(0, 7);
        toStr = currentMonth;
      } else if (filterMode === 'last6') {
        const from = new Date(now); from.setMonth(now.getMonth() - 5); from.setDate(1);
        fromStr = from.toISOString().slice(0, 7);
        toStr = currentMonth;
      } else if (filterMode === 'custom' && customFrom && customTo) {
        fromStr = customFrom.slice(0, 7);
        toStr = customTo.slice(0, 7);
      } else if (filterMode === 'all') {
        // From the earliest joining month among all staff through today
        if (staff.length === 0) return [currentMonth];
        const earliest = staff.reduce(
          (min, s) => s.joiningDate.slice(0, 7) < min ? s.joiningDate.slice(0, 7) : min,
          staff[0].joiningDate.slice(0, 7)
        );
        fromStr = earliest;
        toStr = currentMonth;
      } else {
        return [];
      }

      const months: string[] = [];
      const cur = new Date(fromStr + '-01');
      const end = new Date(toStr + '-01');
      while (cur <= end) {
        months.push(cur.toISOString().slice(0, 7));
        cur.setMonth(cur.getMonth() + 1);
      }
      return months;
    };

    const coveredMonths = buildCoveredMonths();

    // Expected Payroll = salary obligation per staff × per covered month they had joined
    let totalLiability = 0;
    coveredMonths.forEach(mo => {
      staff.forEach(s => {
        if (s.joiningDate.slice(0, 7) > mo) return; // joined after this month, skip
        
        const monthTxns = staffTransactions.filter(t =>
          t.staffId === s.id && (t.period || t.date.slice(0, 7)) === mo
        );
        
        // Smart heuristic for inactive staff: assume they were active up to the last month they had any activity
        // (transaction, attendance). Only applies to past months.
        if (s.status !== 'active') {
          if (mo >= currentMonth) return; // For current or future months, inactive staff are strictly inactive.
          const txnMons = staffTransactions.filter(t => t.staffId === s.id).map(t => t.period || t.date.slice(0, 7));
          const attMons = Object.keys(s.monthlyAttendance || {});
          const allDates = [...txnMons, ...attMons];
          allDates.sort();
          const lastActiveMo = allDates.length > 0 ? allDates[allDates.length - 1] : s.joiningDate.slice(0, 7);
          
          if (mo > lastActiveMo) return; // they had left before this month
        }

        const deductions = monthTxns
          .filter(t => t.type === 'deduction' || t.type === 'penalty')
          .reduce((a, t) => a + t.amount, 0);
        const days = s.monthlyAttendance?.[mo] || 0;
        const effectiveSalary = s.historicalSalaries?.[mo] ?? s.salaryAmount;
        const baseSalary = s.salaryBasis === 'daily' ? effectiveSalary * days : effectiveSalary;
        totalLiability += Math.max(0, baseSalary - deductions);
      });
    });

    // Total Paid = cash out from filteredTxnsForStats (already scoped by filter mode)
    let fixedPaid = 0;
    let variablePaid = 0;
    filteredTxnsForStats.forEach(t => {
      const s = staff.find(m => m.id === t.staffId);
      if (t.type === 'deduction' || t.type === 'penalty') return;
      if (t.type === 'salary' || t.type === 'advance') {
        if (s?.salaryBasis === 'monthly') fixedPaid += t.amount;
        else variablePaid += t.amount;
      } else if (t.type === 'bonus' || t.type === 'incentive' || t.type === 'reimbursement') {
        variablePaid += t.amount;
      }
    });

    const activeCount = staff.filter(s => {
      // For global active count, we only count staff who are currently active or were active in the filtered period.
      let isActive = s.status === 'active';
      if (s.status !== 'active') {
        const txnMons = staffTransactions.filter(t => t.staffId === s.id).map(t => t.period || t.date.slice(0, 7));
        const attMons = Object.keys(s.monthlyAttendance || {});
        const allDates = [...txnMons, ...attMons];
        allDates.sort();
        const lastActiveMo = allDates.length > 0 ? allDates[allDates.length - 1] : s.joiningDate.slice(0, 7);
        
        if (filterMode === 'month') {
          if (filterMonth < currentMonth && filterMonth <= lastActiveMo) isActive = true;
        } else if (filterMode === 'last3') {
          const fromDate = new Date(); fromDate.setMonth(new Date().getMonth() - 2);
          if (lastActiveMo >= fromDate.toISOString().slice(0, 7)) isActive = true;
        } else if (filterMode === 'last6') {
          const fromDate = new Date(); fromDate.setMonth(new Date().getMonth() - 5);
          if (lastActiveMo >= fromDate.toISOString().slice(0, 7)) isActive = true;
        } else if (filterMode === 'custom' && customFrom) {
          if (lastActiveMo >= customFrom.slice(0, 7)) isActive = true;
        } else if (filterMode === 'all') {
          isActive = true;
        }
      }
      if (!isActive) return false;
      
      if (filterMode === 'month') return s.joiningDate.slice(0, 7) <= filterMonth;
      if (dateRange) return s.joiningDate.slice(0, 10) <= dateRange.to;
      return true;
    }).length;

    return {
      totalMonthlyPayroll: totalLiability,
      totalPaidThisMonth: fixedPaid + variablePaid,
      fixedPaid, variablePaid, activeCount,
    };
  }, [staff, staffTransactions, filteredTxnsForStats, filterMode, filterMonth, dateRange, customFrom, customTo]);

  const filteredStaff = staff.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.position.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Determine if staff is considered "active" for the filtered period
    let isActiveInPeriod = s.status === 'active';
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    
    if (s.status !== 'active') {
      const txnMons = staffTransactions.filter(t => t.staffId === s.id).map(t => t.period || t.date.slice(0, 7));
      const attMons = Object.keys(s.monthlyAttendance || {});
      const allDates = [...txnMons, ...attMons];
      allDates.sort();
      const lastActiveMo = allDates.length > 0 ? allDates[allDates.length - 1] : s.joiningDate.slice(0, 7);
      
      if (filterMode === 'month') {
        if (filterMonth < currentMonth && filterMonth <= lastActiveMo) isActiveInPeriod = true;
      } else if (filterMode === 'last3') {
        const fromDate = new Date(); fromDate.setMonth(new Date().getMonth() - 2);
        if (lastActiveMo >= fromDate.toISOString().slice(0, 7)) isActiveInPeriod = true;
      } else if (filterMode === 'last6') {
        const fromDate = new Date(); fromDate.setMonth(new Date().getMonth() - 5);
        if (lastActiveMo >= fromDate.toISOString().slice(0, 7)) isActiveInPeriod = true;
      } else if (filterMode === 'custom' && customFrom) {
        if (lastActiveMo >= customFrom.slice(0, 7)) isActiveInPeriod = true;
      } else if (filterMode === 'all') {
        isActiveInPeriod = true;
      }
    }
    
    const matchStatus = filterStatus === 'all' || 
                        (filterStatus === 'active' ? isActiveInPeriod : !isActiveInPeriod);
                        
    // Joining check: ensure they joined on or before the end of the filtered period
    let hasJoined = true;
    if (filterMode === 'month') {
      hasJoined = s.joiningDate.slice(0, 7) <= filterMonth;
    } else if (dateRange) {
      hasJoined = s.joiningDate.slice(0, 10) <= dateRange.to;
    }

    return matchSearch && matchStatus && hasJoined;
  });




  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  if (showAddForm || editingStaff) {
    return (
      <StaffForm
        orgId={orgId}
        currentUser={currentUser}
        existingStaff={editingStaff || undefined}
        onSave={async (s) => { await onSaveStaff(s); setShowAddForm(false); setEditingStaff(null); }}
        onClose={() => { setShowAddForm(false); setEditingStaff(null); }}
      />
    );
  }

  if (selectedStaffId && selectedStaff) {
    return (
      <StaffLedger
        staffMember={selectedStaff}
        staffTransactions={staffTransactions.filter(t => t.staffId === selectedStaffId)}
        orgId={orgId}
        currentUser={currentUser}
        onSaveTransaction={onSaveStaffTransaction}
        onDeleteTransaction={onDeleteStaffTransaction}
        onEdit={() => setEditingStaff(selectedStaff)}
        onDelete={async () => { await onDeleteStaff(selectedStaff.id); setSelectedStaffId(null); }}
        onUpdateStaff={onSaveStaff}
        onRestore={async () => { await onSaveStaff({ ...selectedStaff, status: 'active', updatedAt: new Date().toISOString() }); setSelectedStaffId(null); }}
        onBack={() => setSelectedStaffId(null)}
      />
    );
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="screen-header" style={{ paddingBottom: '0.5rem' }}>
        <button onClick={onBack} className="btn-ghost" style={{ padding: '0.5rem 0.5rem 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-2)' }}>
          <ArrowLeft size={16} /> back
        </button>
        <button onClick={() => setShowAddForm(true)} className="btn-primary" style={{ gap: '0.375rem' }}>
          <Plus size={14} /> Add Staff
        </button>
      </div>

      <h1 className="text-title" style={{ fontSize: '1.375rem', marginBottom: '0.25rem' }}>Staff & Payroll</h1>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
        {globalStats.activeCount} active members
      </p>

      {/* Global Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '12px', background: 'var(--blue-soft)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <p className="text-label" style={{ fontSize: '0.5625rem', marginBottom: '6px', color: 'var(--blue)' }}>EXPECTED PAYROLL</p>
          <p className="mono" style={{ fontSize: '1.125rem', fontWeight: 600 }}>{formatINR(globalStats.totalMonthlyPayroll)}</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.5625rem', color: 'var(--text-3)' }}>
            {filterMode === 'all' ? `${globalStats.activeCount} active staff (this month)` : filterLabel}
          </p>
        </div>
        <div style={{ padding: '12px', background: 'var(--green-soft)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <p className="text-label" style={{ fontSize: '0.5625rem', marginBottom: '6px', color: 'var(--green)' }}>
            {filterMode === 'all' ? 'TOTAL PAID' : `PAID · ${filterLabel.toUpperCase()}`}
          </p>
          <p className="mono" style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--green)' }}>{formatINR(globalStats.totalPaidThisMonth)}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.5rem', color: 'var(--text-3)' }}>Fixed: {formatINR(globalStats.fixedPaid)}</span>
            <span style={{ fontSize: '0.5rem', color: 'var(--text-3)' }}>Var: {formatINR(globalStats.variablePaid)}</span>
          </div>
        </div>
      </div>

      {/* Search + Status + Filter — single toolbar row */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1.25rem', position: 'relative', zIndex: 50 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input type="text" placeholder="search staff..." className="input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem' }} />
        </div>

        {/* Filter icon button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFilterPanel(v => !v)}
            title={filterLabel}
            style={{
              width: '40px', height: '40px', borderRadius: 'var(--radius-m)',
              background: filterMode !== 'month' ? 'var(--blue-soft)' : 'var(--bg-2)',
              border: `1px solid ${filterMode !== 'month' ? 'var(--blue)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, position: 'relative',
            }}
          >
            <Filter size={15} color={filterMode !== 'month' ? 'var(--blue)' : 'var(--text-2)'} />
            {filterMode !== 'month' && (
              <span style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue)' }} />
            )}
          </button>

          {/* Dropdown filter panel */}
          {showFilterPanel && (
            <div className="card animate-in" style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
              width: '260px', padding: '1rem', border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-modal)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <p style={{ fontSize: '0.5625rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Filter Period</p>
                <button onClick={() => setShowFilterPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
                {([
                  { mode: 'month', label: 'By Month' },
                  { mode: 'last3', label: 'Last 3 Mo.' },
                  { mode: 'last6', label: 'Last 6 Mo.' },
                  { mode: 'all', label: 'All Time' },
                  { mode: 'custom', label: 'Custom' },
                ] as { mode: FilterMode; label: string }[]).map(opt => (
                  <button key={opt.mode} type="button" onClick={() => setFilterMode(opt.mode)}
                    style={{ padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)', border: '1px solid', fontSize: '0.6875rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', borderColor: filterMode === opt.mode ? 'var(--blue)' : 'var(--border)', background: filterMode === opt.mode ? 'var(--blue-soft)' : 'transparent', color: filterMode === opt.mode ? 'var(--blue)' : 'var(--text-2)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {filterMode === 'month' && (
                <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.625rem' }}>
                  <CustomSelect value={filterYear} onChange={setFilterYear} options={availableYears.map(y => ({ value: y, label: y }))} minWidth="75px" />
                  <CustomSelect value={filterMonthOnly} onChange={setFilterMonthOnly} options={months.map(m => ({ value: m.val, label: m.label }))} minWidth="70px" />
                </div>
              )}
              {filterMode === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.625rem' }}>
                  <div>
                    <p style={{ fontSize: '0.5rem', color: 'var(--text-3)', margin: '0 0 3px', textTransform: 'uppercase' }}>From</p>
                    <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="Start" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.5rem', color: 'var(--text-3)', margin: '0 0 3px', textTransform: 'uppercase' }}>To</p>
                    <DatePicker value={customTo} onChange={setCustomTo} placeholder="End" minDate={customFrom || undefined} />
                  </div>
                </div>
              )}
              <button onClick={() => setShowFilterPanel(false)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}>Apply</button>
            </div>
          )}
        </div>

        <CustomSelect
          value={filterStatus}
          onChange={v => setFilterStatus(v as any)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'all', label: 'All Staff' },
          ]}
          minWidth="95px"
        />
      </div>

      {/* Staff List */}
      {filteredStaff.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
          <Users size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p style={{ fontSize: '0.875rem' }}>No staff found. Add your first team member.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filteredStaff.map(member => {
            const isMonthly = member.salaryBasis === 'monthly';
            const paidThisMonth = filteredTxnsForStats.filter(t => t.staffId === member.id && (t.type === 'salary' || t.type === 'advance')).reduce((a, t) => a + t.amount, 0);
            const deductionsThisMonth = filteredTxnsForStats.filter(t => t.staffId === member.id && (t.type === 'deduction' || t.type === 'penalty')).reduce((a, t) => a + t.amount, 0);
            
            const effectiveSalary = filterMonth !== 'all' ? (member.historicalSalaries?.[filterMonth] ?? member.salaryAmount) : member.salaryAmount;
            const hasJoinedAtMonth = filterMonth === 'all' || member.joiningDate.slice(0, 7) <= filterMonth;
            const pendingSalary = (isMonthly && filterMonth !== 'all' && hasJoinedAtMonth) ? Math.max(0, effectiveSalary - deductionsThisMonth - paidThisMonth) : 0;
            return (
              <button key={member.id} className="card" onClick={() => setSelectedStaffId(member.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', width: '100%', textAlign: 'left', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: member.status === 'active' ? 'var(--blue-soft)' : 'var(--bg-2)', border: '2px solid', borderColor: member.status === 'active' ? 'var(--blue)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', fontWeight: 700, color: member.status === 'active' ? 'var(--blue)' : 'var(--text-3)', flexShrink: 0 }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{member.name}</p>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-3)' }}>{member.position} {member.department ? `· ${member.department}` : ''}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {pendingSalary > 0 && (
                        <span style={{ fontSize: '0.5625rem', background: 'var(--yellow-soft)', color: 'var(--yellow)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          DUE {formatINR(pendingSalary)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mono" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{formatINR(effectiveSalary)}</p>
                    <p style={{ margin: 0, fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>/{member.salaryBasis === 'daily' ? 'day' : 'month'}</p>
                  </div>
                  <ChevronRight size={16} color="var(--text-4)" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pending Salary Alerts */}
      {filterMonth !== 'all' && staff.filter(s => {
        if (s.salaryBasis !== 'monthly') return false;
        const hasJoinedAtMonth = s.joiningDate.slice(0, 7) <= filterMonth;
        if (!hasJoinedAtMonth) return false;
        
        let isActive = s.status === 'active';
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        if (s.status !== 'active' && filterMonth < currentMonth) {
          const txnMons = staffTransactions.filter(t => t.staffId === s.id).map(t => t.period || t.date.slice(0, 7));
          const attMons = Object.keys(s.monthlyAttendance || {});
          const allDates = [...txnMons, ...attMons, s.updatedAt.slice(0, 7)];
          allDates.sort();
          const lastActiveMo = allDates.length > 0 ? allDates[allDates.length - 1] : s.joiningDate.slice(0, 7);
          if (filterMonth <= lastActiveMo) isActive = true;
        }
        return isActive;
      }).some(s => {
        const staffTxns = staffTransactions.filter(t => t.staffId === s.id);
        const paid = staffTxns.filter(t => {
          const period = t.period || t.date.slice(0, 7);
          return period === filterMonth && (t.type === 'salary' || t.type === 'advance');
        }).reduce((a, t) => a + t.amount, 0);
        const deductions = staffTxns.filter(t => {
          const period = t.period || t.date.slice(0, 7);
          return period === filterMonth && (t.type === 'deduction' || t.type === 'penalty');
        }).reduce((a, t) => a + t.amount, 0);
        const effectiveSalary = s.historicalSalaries?.[filterMonth] ?? s.salaryAmount;
        return (paid + deductions) < effectiveSalary;
      }) && (
        <div className="card animate-in" style={{ marginTop: '1.5rem', padding: '1rem', borderLeft: '3px solid var(--yellow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
            <AlertCircle size={16} color="var(--yellow)" />
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--yellow)' }}>Pending Salaries ({new Date(filterMonth + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})</p>
          </div>
          {staff.filter(s => {
            if (s.salaryBasis !== 'monthly') return false;
            const hasJoinedAtMonth = s.joiningDate.slice(0, 7) <= filterMonth;
            if (!hasJoinedAtMonth) return false;
            
            let isActive = s.status === 'active';
            const now = new Date();
            const currentMonth = now.toISOString().slice(0, 7);
            if (s.status !== 'active' && filterMonth < currentMonth) {
              const txnMons = staffTransactions.filter(t => t.staffId === s.id).map(t => t.period || t.date.slice(0, 7));
              const attMons = Object.keys(s.monthlyAttendance || {});
              const allDates = [...txnMons, ...attMons];
              allDates.sort();
              const lastActiveMo = allDates.length > 0 ? allDates[allDates.length - 1] : s.joiningDate.slice(0, 7);
              if (filterMonth <= lastActiveMo) isActive = true;
            }
            return isActive;
          }).map(s => {
            const staffTxns = staffTransactions.filter(t => t.staffId === s.id);
            const paid = staffTxns.filter(t => {
              const period = t.period || t.date.slice(0, 7);
              return period === filterMonth && (t.type === 'salary' || t.type === 'advance');
            }).reduce((a, t) => a + t.amount, 0);
            const deductions = staffTxns.filter(t => {
              const period = t.period || t.date.slice(0, 7);
              return period === filterMonth && (t.type === 'deduction' || t.type === 'penalty');
            }).reduce((a, t) => a + t.amount, 0);
            const effectiveSalary = s.historicalSalaries?.[filterMonth] ?? s.salaryAmount;
            const pending = effectiveSalary - deductions - paid;
            if (pending <= 0) return null;
            return (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingDown size={12} color="var(--yellow)" />
                  <span style={{ fontSize: '0.8125rem' }}>{s.name}</span>
                </div>
                <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--yellow)', fontWeight: 600 }}>{formatINR(pending)} pending</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: '5rem' }} />
    </div>
  );
};

export default StaffManager;
