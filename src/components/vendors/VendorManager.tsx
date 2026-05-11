import React, { useState, useMemo } from 'react';
import {
  Truck, Search, Plus, ChevronRight, ArrowLeft,
  AlertCircle, Filter, ChevronDown
} from 'lucide-react';
import type { Vendor, VendorTransaction, Transaction, User } from '../../types';
import { formatINR } from '../../utils/financeUtils';
import VendorForm from './VendorForm';
import VendorDetail from './VendorDetail';
import CustomSelect from '../shared/CustomSelect';
import DatePicker from '../shared/DatePicker';

interface VendorManagerProps {
  vendors: Vendor[];
  vendorTransactions: VendorTransaction[];
  orgId: string;
  currentUser: User;
  onSaveVendor: (vendor: Vendor) => Promise<void>;
  onDeleteVendor: (vendorId: string) => Promise<void>;
  onSaveVendorTransaction: (vt: VendorTransaction, gt?: Transaction) => Promise<void>;
  onDeleteVendorTransaction: (vtId: string, gtId?: string) => Promise<void>;
  onBack: () => void;
}

const VendorManager: React.FC<VendorManagerProps> = ({
  vendors, vendorTransactions, orgId, currentUser,
  onSaveVendor, onDeleteVendor, onSaveVendorTransaction, onDeleteVendorTransaction, onBack
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | 'all'>('active');

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
    if (filterMode === 'last3') {
      const from = new Date(now); from.setMonth(now.getMonth() - 2); from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    if (filterMode === 'last6') {
      const from = new Date(now); from.setMonth(now.getMonth() - 5); from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    if (filterMode === 'custom' && customFrom && customTo) return { from: customFrom, to: customTo };
    return null;
  }, [filterMode, customFrom, customTo]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    vendorTransactions.forEach(t => { if (t.date) years.add(t.date.slice(0, 4)); });
    return Array.from(years).sort().reverse();
  }, [vendorTransactions]);

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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Per-vendor balance map
  const vendorBalances = useMemo(() => {
    const map: Record<string, { balance: number; overdueBalance: number; advanceBalance: number; totalCredit: number; totalPayments: number; lastDate: string }> = {};
    vendors.forEach(v => { map[v.id] = { balance: 0, overdueBalance: 0, advanceBalance: 0, totalCredit: 0, totalPayments: 0, lastDate: '' }; });

    vendorTransactions.forEach(t => {
      if (!map[t.vendorId]) map[t.vendorId] = { balance: 0, overdueBalance: 0, advanceBalance: 0, totalCredit: 0, totalPayments: 0, lastDate: '' };
      const m = map[t.vendorId];
      if (t.type === 'credit')     { m.balance += t.amount; m.totalCredit += t.amount; }
      if (t.type === 'payment')    { m.balance -= t.amount; m.totalPayments += t.amount; }
      if (t.type === 'advance')    { m.balance -= t.amount; m.totalPayments += t.amount; }
      if (t.type === 'return')     { m.balance -= t.amount; }
      if (t.type === 'purchase')   { m.totalPayments += t.amount; }
      if (!m.lastDate || t.date > m.lastDate) m.lastDate = t.date;
    });

    Object.values(map).forEach(m => {
      m.overdueBalance = Math.max(0, m.balance);
      m.advanceBalance = Math.max(0, -m.balance);
    });

    return map;
  }, [vendors, vendorTransactions]);

  const globalStats = useMemo(() => {
    const activeVendors = vendors.filter(v => v.status === 'active');
    let totalOverdue = 0, totalAdvance = 0;
    Object.values(vendorBalances).forEach(m => { totalOverdue += m.overdueBalance; totalAdvance += m.advanceBalance; });
    const overdueVendors = activeVendors.filter(v => (vendorBalances[v.id]?.overdueBalance || 0) > 0);

    let totalPurchases = 0;
    let totalPaid = 0;
    vendorTransactions.forEach(t => {
      let match = false;
      if (filterMode === 'all') {
        match = true;
      } else if (filterMode === 'month') {
        match = t.date?.slice(0, 7) === filterMonth;
      } else if (dateRange) {
        const d = t.date?.slice(0, 10) || '';
        match = d >= dateRange.from && d <= dateRange.to;
      }
      if (match) {
        if (t.type === 'purchase' || t.type === 'credit') totalPurchases += t.amount;
        if (t.type === 'payment' || t.type === 'advance') totalPaid += t.amount;
      }
    });

    return { activeCount: activeVendors.length, totalOverdue, totalAdvance, overdueCount: overdueVendors.length, totalPurchases, totalPaid };
  }, [vendors, vendorBalances, vendorTransactions, filterMode, filterMonth, dateRange]);

  const filteredVendors = vendors.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || (v.category || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const selectedVendor = vendors.find(v => v.id === selectedId);

  // ── Routing ─────────────────────────────────────────────────────────────
  if (showForm || editingVendor) {
    return (
      <VendorForm
        orgId={orgId}
        existingVendor={editingVendor || undefined}
        onSave={async (v) => { await onSaveVendor(v); setShowForm(false); setEditingVendor(null); }}
        onClose={() => { setShowForm(false); setEditingVendor(null); }}
      />
    );
  }

  if (selectedId && selectedVendor) {
    return (
      <VendorDetail
        vendor={selectedVendor}
        vendorTransactions={vendorTransactions.filter(t => t.vendorId === selectedId)}
        orgId={orgId}
        currentUser={currentUser}
        onSaveTransaction={onSaveVendorTransaction}
        onDeleteTransaction={onDeleteVendorTransaction}
        onEdit={() => setEditingVendor(selectedVendor)}
        onDelete={async () => { await onDeleteVendor(selectedVendor.id); setSelectedId(null); }}
        onRestore={async () => { await onSaveVendor({ ...selectedVendor, status: 'active', updatedAt: new Date().toISOString() }); setSelectedId(null); }}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  // ── List View ─────────────────────────────────────────────────────────
  return (
    <div className="animate-in">
      {/* Header */}
      <div className="screen-header" style={{ paddingBottom: '0.5rem' }}>
        <button onClick={onBack} className="btn-ghost" style={{ padding: '0.5rem 0.5rem 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-2)' }}>
          <ArrowLeft size={16} /> back
        </button>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ gap: '0.375rem' }}>
          <Plus size={14} /> Add Vendor
        </button>
      </div>

      <h1 className="text-title" style={{ fontSize: '1.375rem', marginBottom: '0.25rem' }}>Vendors</h1>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
        {globalStats.activeCount} active suppliers
      </p>

      {/* Global Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '12px', background: 'var(--blue-soft)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <p className="text-label" style={{ fontSize: '0.5625rem', marginBottom: '6px', color: 'var(--blue)' }}>
            {filterMode === 'all' ? 'TOTAL PURCHASES' : `PURCHASES · ${filterLabel.toUpperCase()}`}
          </p>
          <p className="mono" style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--blue)', margin: 0 }}>{formatINR(globalStats.totalPurchases)}</p>
        </div>
        <div style={{ padding: '12px', background: 'var(--green-soft)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <p className="text-label" style={{ fontSize: '0.5625rem', marginBottom: '6px', color: 'var(--green)' }}>
            {filterMode === 'all' ? 'TOTAL PAID' : `PAID · ${filterLabel.toUpperCase()}`}
          </p>
          <p className="mono" style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--green)', margin: 0 }}>{formatINR(globalStats.totalPaid)}</p>
        </div>
      </div>

      {/* Search + Status + Filter — single toolbar row */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1.25rem', position: 'relative', zIndex: 50 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input type="text" placeholder="search vendors..." className="input" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem' }} />
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
            { value: 'all', label: 'All' },
          ]}
          minWidth="90px"
        />
      </div>

      {/* Vendor List */}
      {filteredVendors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
          <Truck size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p style={{ fontSize: '0.875rem' }}>No vendors found. Add your first supplier.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filteredVendors.map(vendor => {
            const bal = vendorBalances[vendor.id] || { balance: 0, overdueBalance: 0, advanceBalance: 0, lastDate: '' };
            const vendorTxnsMonth = filterMonth === 'all' ? [] : vendorTransactions.filter(t => t.vendorId === vendor.id && (t.date && t.date.slice(0, 7) === filterMonth));
            const purchasedMonth = vendorTxnsMonth.filter(t => t.type === 'purchase' || t.type === 'credit').reduce((a, t) => a + t.amount, 0);
            const paidMonth = vendorTxnsMonth.filter(t => t.type === 'payment' || t.type === 'advance').reduce((a, t) => a + t.amount, 0);

            return (
              <button key={vendor.id} className="card" onClick={() => setSelectedId(vendor.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', width: '100%', textAlign: 'left', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: bal.overdueBalance > 0 ? 'var(--red-soft)' : 'var(--bg-2)', border: '2px solid', borderColor: bal.overdueBalance > 0 ? 'var(--red)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', fontWeight: 700, color: bal.overdueBalance > 0 ? 'var(--red)' : 'var(--text-2)', flexShrink: 0 }}>
                    {vendor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{vendor.name}</p>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                      {vendor.category || 'Supplier'}{bal.lastDate ? ` · Last: ${new Date(bal.lastDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      {bal.overdueBalance > 0 && (
                        <span style={{ fontSize: '0.5625rem', background: 'var(--red-soft)', color: 'var(--red)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          OWE {formatINR(bal.overdueBalance)}
                        </span>
                      )}
                      {bal.advanceBalance > 0 && (
                        <span style={{ fontSize: '0.5625rem', background: 'var(--blue-soft)', color: 'var(--blue)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          ADV {formatINR(bal.advanceBalance)}
                        </span>
                      )}
                      {filterMonth !== 'all' && purchasedMonth > 0 && (
                        <span style={{ fontSize: '0.5625rem', background: 'var(--bg-2)', color: 'var(--text-1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          +{formatINR(purchasedMonth)} IN {new Date(filterMonth + '-01').toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}
                        </span>
                      )}
                      {filterMonth !== 'all' && paidMonth > 0 && (
                        <span style={{ fontSize: '0.5625rem', background: 'var(--green-soft)', color: 'var(--green)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          -{formatINR(paidMonth)} IN {new Date(filterMonth + '-01').toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}
                        </span>
                      )}
                      {bal.balance === 0 && vendorTransactions.some(t => t.vendorId === vendor.id) && (
                        <span style={{ fontSize: '0.5625rem', background: 'var(--green-soft)', color: 'var(--green)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>✓ SETTLED</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mono" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: bal.balance > 0 ? 'var(--red)' : bal.balance < 0 ? 'var(--blue)' : 'var(--text-2)' }}>
                      {formatINR(Math.abs(bal.balance))}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.5rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                      {bal.balance > 0 ? 'payable' : bal.balance < 0 ? 'advance' : 'settled'}
                    </p>
                  </div>
                  <ChevronRight size={16} color="var(--text-4)" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Overdue Alert Summary */}
      {globalStats.overdueCount > 0 && (
        <div className="card animate-in" style={{ marginTop: '1.5rem', padding: '1rem', borderLeft: '3px solid var(--red)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
            <AlertCircle size={16} color="var(--red)" />
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--red)' }}>Outstanding Payables</p>
          </div>
          {vendors.filter(v => v.status === 'active' && (vendorBalances[v.id]?.overdueBalance || 0) > 0).map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8125rem' }}>{v.name}</span>
              <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--red)', fontWeight: 600 }}>{formatINR(vendorBalances[v.id]?.overdueBalance || 0)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: '5rem' }} />
    </div>
  );
};

export default VendorManager;
