import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Plus, Trash2, Edit2, DollarSign,
  ChevronDown, CheckCircle2
} from 'lucide-react';
import type { Vendor, VendorTransaction, VendorTxnType, Transaction, User, PaymentType } from '../../types';
import { formatINR } from '../../utils/financeUtils';
import ConfirmModal from '../shared/ConfirmModal';
import AlertModal from '../shared/AlertModal';
import CustomSelect from '../shared/CustomSelect';
import DatePicker from '../shared/DatePicker';

// payment = we paid them        → cashflow expense, reduces our payable
// credit  = they gave on credit → increases our payable (no cash moves yet)
// advance = we paid in advance  → cashflow expense, creates their debt to us
// return  = goods returned      → reduces our payable
// adjustment = manual fix

const TXN_META: Record<VendorTxnType, { label: string; color: string; bg: string; description: string; affectsBalance: number }> = {
  purchase:   { label: 'Direct Purchase', color: 'var(--green)',  bg: 'var(--green-soft)',  description: 'Bought and paid immediately (No balance change)', affectsBalance: 0 },
  payment:    { label: 'Payment Made',    color: 'var(--green)',  bg: 'var(--green-soft)',  description: 'You paid the vendor',           affectsBalance: -1 },
  credit:     { label: 'Credit Received', color: 'var(--yellow)', bg: 'var(--yellow-soft)', description: 'Goods received on credit',       affectsBalance: +1 },
  advance:    { label: 'Advance Paid',    color: 'var(--blue)',   bg: 'var(--blue-soft)',   description: 'Advance payment to vendor',      affectsBalance: -1 },
  return:     { label: 'Goods Returned',  color: 'var(--text-2)', bg: 'var(--bg-2)',        description: 'Returned goods to vendor',       affectsBalance: -1 },
  adjustment: { label: 'Adjustment',      color: 'var(--text-3)', bg: 'var(--bg-2)',        description: 'Manual balance adjustment',      affectsBalance: 0  },
};

interface VendorDetailProps {
  vendor: Vendor;
  vendorTransactions: VendorTransaction[];
  orgId: string;
  currentUser: User;
  onSaveTransaction: (vt: VendorTransaction, gt?: Transaction) => Promise<void>;
  onDeleteTransaction: (vtId: string, gtId?: string) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onRestore?: () => Promise<void>;
  onBack: () => void;
}

const VendorDetail: React.FC<VendorDetailProps> = ({
  vendor, vendorTransactions, orgId, currentUser,
  onSaveTransaction, onDeleteTransaction, onEdit, onDelete, onRestore, onBack
}) => {
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [txnType, setTxnType] = useState<VendorTxnType>('payment');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [txnDueDate, setTxnDueDate] = useState('');
  const [txnNotes, setTxnNotes] = useState('');
  const [txnPayment, setTxnPayment] = useState<string>('cash');
  const [txnCategory, setTxnCategory] = useState('');
  const [txnInvoice, setTxnInvoice] = useState('');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonthOnly, setFilterMonthOnly] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const filterMonth = filterMonthOnly === 'all' ? 'all' : `${filterYear}-${filterMonthOnly}`;

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    vendorTransactions.forEach(t => { if (t.date) years.add(t.date.slice(0, 4)); });
    return Array.from(years).sort().reverse();
  }, [vendorTransactions]);

  const monthFilterOptions = [
    { val: 'all', label: 'All' },
    { val: '01', label: 'Jan' }, { val: '02', label: 'Feb' }, { val: '03', label: 'Mar' },
    { val: '04', label: 'Apr' }, { val: '05', label: 'May' }, { val: '06', label: 'Jun' },
    { val: '07', label: 'Jul' }, { val: '08', label: 'Aug' }, { val: '09', label: 'Sep' },
    { val: '10', label: 'Oct' }, { val: '11', label: 'Nov' }, { val: '12', label: 'Dec' }
  ];

  // ── Balance Logic ────────────────────────────────────────────────────────
  // Positive balance = we OWE the vendor (net payable)
  // Negative balance = vendor OWES US (net advance/credit)
  const summary = useMemo(() => {
    let balance = 0; // net amount WE owe vendor
    let totalCredit = 0;   // goods received on credit
    let totalPayments = 0; // cash we paid (payment + advance)
    let totalReturns = 0;

    vendorTransactions.forEach(t => {
      if (t.type === 'credit')     { balance += t.amount; totalCredit += t.amount; }
      if (t.type === 'payment')    { balance -= t.amount; totalPayments += t.amount; }
      if (t.type === 'advance')    { balance -= t.amount; totalPayments += t.amount; }
      if (t.type === 'return')     { balance -= t.amount; totalReturns += t.amount; }
      if (t.type === 'purchase')   { totalPayments += t.amount; } // Does not affect balance
      if (t.type === 'adjustment') { /* no default effect */ }
    });

    const overdueBalance = Math.max(0, balance);     // we owe them
    const advanceBalance = Math.max(0, -balance);    // they owe us

    const lastTxn = [...vendorTransactions].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
    return { balance, overdueBalance, advanceBalance, totalCredit, totalPayments, totalReturns, lastTxn };
  }, [vendorTransactions]);

  const filteredTxns = useMemo(() => {
    let txns = [...vendorTransactions];
    if (filterMonth !== 'all') txns = txns.filter(t => t.date.slice(0, 7) === filterMonth);
    return txns.sort((a, b) => b.date.localeCompare(a.date));
  }, [vendorTransactions, filterMonth]);

  const handleAddTransaction = async () => {
    const amt = parseFloat(txnAmount);
    if (!amt || amt <= 0) { setAlertMsg('Please enter a valid amount.'); return; }
    setSaving(true);
    try {
      const id = 'vtxn_' + Date.now().toString(36);
      const globalId = 'txn_' + Date.now().toString(36) + '_v';
      const dateIso = new Date(txnDate).toISOString();

      const vendorTxn: VendorTransaction = {
        id, orgId,
        vendorId: vendor.id,
        vendorName: vendor.name,
        type: txnType,
        amount: amt,
        date: dateIso,
        notes: txnNotes.trim() || '',
        category: txnCategory.trim() || vendor.category || '',
        invoiceNo: txnInvoice.trim() || '',
        addedBy: currentUser.id,
        addedByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };

      if (txnType === 'credit' && txnDueDate) {
        vendorTxn.dueDate = new Date(txnDueDate).toISOString();
      }

      if (txnType === 'payment' || txnType === 'advance' || txnType === 'purchase') {
        vendorTxn.globalTxnId = globalId;
        vendorTxn.paymentMethod = txnPayment;
      }

      let globalTxn: Transaction | undefined;
      if (txnType === 'payment' || txnType === 'advance' || txnType === 'purchase') {
        globalTxn = {
          id: globalId, orgId, type: 'expense',
          amount: amt, date: dateIso,
          notes: `[Vendor] ${TXN_META[txnType].label} — ${vendor.name}${txnNotes ? ': ' + txnNotes : ''}`,
          status: 'approved',
          userId: currentUser.id, userName: currentUser.name,
          category: txnCategory.trim() || vendor.category || 'misc',
          paymentType: txnPayment as PaymentType,
          classification: 'variable',
          createdAt: new Date().toISOString(),
          vendor: vendor.name,
        };
      }

      await onSaveTransaction(vendorTxn, globalTxn);
      setTxnAmount(''); setTxnNotes(''); setTxnInvoice(''); setTxnDueDate('');
      setTxnDate(new Date().toISOString().split('T')[0]);
      setShowAddTxn(false);
    } catch (err: any) {
      setAlertMsg(err.message || 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  const balanceColor = summary.balance > 0 ? 'var(--red)' : summary.balance < 0 ? 'var(--blue)' : 'var(--text-2)';
  const balanceLabel = summary.balance > 0 ? 'YOU OWE' : summary.balance < 0 ? 'THEY OWE YOU' : 'SETTLED';

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
        <button onClick={onBack} className="btn-secondary" style={{ width: '40px', height: '40px', padding: 0, flexShrink: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{vendor.name}</h1>
            <span style={{ fontSize: '0.5625rem', background: vendor.status === 'active' ? 'var(--green-soft)' : 'var(--bg-2)', color: vendor.status === 'active' ? 'var(--green)' : 'var(--text-3)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase' }}>
              {vendor.status}
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
            {vendor.category || 'Supplier'}{vendor.phone ? ` · ${vendor.phone}` : ''}
          </p>
        </div>
        <button onClick={onEdit} className="btn-secondary" style={{ height: '36px', padding: '0 0.75rem', gap: '0.375rem', fontSize: '0.75rem' }}>
          <Edit2 size={13} /> Edit
        </button>
      </div>

      {/* Balance Banner */}
      <div className="card animate-in" style={{ padding: '1.25rem', marginBottom: '1rem', background: summary.balance === 0 ? 'var(--bg-2)' : summary.balance > 0 ? 'var(--red-soft)' : 'var(--blue-soft)', border: `1px solid ${summary.balance === 0 ? 'var(--border)' : summary.balance > 0 ? 'var(--red)' : 'var(--blue)'}20` }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', color: balanceColor, textTransform: 'uppercase' }}>{balanceLabel}</p>
        <p className="mono" style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: balanceColor }}>
          {formatINR(Math.abs(summary.balance))}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '0.6875rem', color: 'var(--text-3)' }}>
          {summary.balance > 0
            ? 'Outstanding amount owed to vendor — pay to clear'
            : summary.balance < 0
            ? 'Advance / overpayment — vendor owes you this amount'
            : 'All payments settled ✓'}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Credit Given', value: formatINR(summary.totalCredit), color: 'var(--yellow)' },
          { label: 'Total Paid',   value: formatINR(summary.totalPayments), color: 'var(--green)' },
          { label: 'Returns',      value: formatINR(summary.totalReturns),  color: 'var(--text-2)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.5rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
            <p className="mono" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Record Transaction Button */}
      <button onClick={() => setShowAddTxn(v => !v)} className="btn-primary"
        style={{ width: '100%', gap: '0.5rem', marginBottom: '1.25rem', justifyContent: 'center' }}>
        <Plus size={16} /> Record Entry
        <ChevronDown size={14} style={{ marginLeft: 'auto', transform: showAddTxn ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Transaction Form */}
      {showAddTxn && (
        <div className="card animate-in" style={{ padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--blue-soft)' }}>
          <p className="section-label" style={{ marginBottom: '0.875rem' }}>record entry</p>

          {/* Type Selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
            {(Object.keys(TXN_META) as VendorTxnType[]).map(type => (
              <button key={type} onClick={() => setTxnType(type)}
                style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 600, border: '1px solid', cursor: 'pointer', borderColor: txnType === type ? TXN_META[type].color : 'var(--border)', background: txnType === type ? TXN_META[type].bg : 'transparent', color: txnType === type ? TXN_META[type].color : 'var(--text-2)' }}>
                {TXN_META[type].label}
              </button>
            ))}
          </div>

          <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-m)', padding: '0.625rem 0.75rem', marginBottom: '0.875rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
            {TXN_META[txnType].description}
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

          {(txnType === 'payment' || txnType === 'advance' || txnType === 'purchase') && (
            <div style={{ marginBottom: '0.625rem' }}>
              <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Payment Method</label>
              <CustomSelect
                value={txnPayment}
                onChange={setTxnPayment}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'upi', label: 'UPI' },
                  { value: 'bank', label: 'Bank Transfer' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
            <div>
              <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Category / Item</label>
              <input className="input" value={txnCategory} onChange={e => setTxnCategory(e.target.value)} placeholder={vendor.category || 'e.g. vegetables'} />
            </div>
            <div>
              <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Invoice No.</label>
              <input className="input" value={txnInvoice} onChange={e => setTxnInvoice(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {txnType === 'credit' && (
            <div style={{ marginBottom: '0.625rem' }}>
              <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Payment Due Date</label>
              <DatePicker value={txnDueDate} onChange={setTxnDueDate} placeholder="Select due date" minDate={txnDate || undefined} />
              <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', marginTop: '3px' }}>When must you pay this credit back?</p>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.5625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Notes</label>
            <input className="input" value={txnNotes} onChange={e => setTxnNotes(e.target.value)} placeholder="Optional note..." />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleAddTransaction} className="btn-primary" style={{ flex: 1 }} disabled={saving || !txnAmount}>
              {saving ? 'saving...' : `Save ${TXN_META[txnType].label}`}
            </button>
            <button onClick={() => setShowAddTxn(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Month Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <p className="section-label" style={{ margin: 0 }}>transaction ledger</p>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {filterMonthOnly !== 'all' && (
            <CustomSelect
              value={filterYear}
              onChange={setFilterYear}
              options={availableYears.map(y => ({ value: y, label: y }))}
              minWidth="72px"
            />
          )}
          <CustomSelect
            value={filterMonthOnly}
            onChange={setFilterMonthOnly}
            options={monthFilterOptions.map(m => ({ value: m.val, label: m.label }))}
            minWidth="68px"
          />
        </div>
      </div>

      {/* Transactions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        {filteredTxns.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>No entries yet for this period.</div>
        ) : (
          filteredTxns.map((t, i) => {
            const meta = TXN_META[t.type];
            const sign = t.type === 'credit' ? '+' : '-';
            return (
              <div key={t.id} style={{ padding: '0.875rem 1rem', borderBottom: i < filteredTxns.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <DollarSign size={14} color={meta.color} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{meta.label}</span>
                      {t.invoiceNo && <span style={{ fontSize: '0.5625rem', background: 'var(--bg-2)', color: 'var(--text-3)', padding: '1px 5px', borderRadius: '3px' }}>#{t.invoiceNo}</span>}
                      {t.type === 'credit' && t.dueDate && (() => {
                        const daysLeft = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86400000);
                        const isOverdue = daysLeft < 0;
                        const isDueSoon = daysLeft >= 0 && daysLeft <= 7;
                        return (
                          <span style={{ fontSize: '0.5rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, background: isOverdue ? 'var(--red-soft)' : isDueSoon ? 'var(--yellow-soft)' : 'var(--bg-2)', color: isOverdue ? 'var(--red)' : isDueSoon ? 'var(--yellow)' : 'var(--text-3)' }}>
                            {isOverdue ? `${Math.abs(daysLeft)}d OVERDUE` : daysLeft === 0 ? 'DUE TODAY' : `Due in ${daysLeft}d`}
                          </span>
                        );
                      })()}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                      {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {t.dueDate && ` · Pay by ${new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                      {t.category && ` · ${t.category}`}
                      {t.notes && ` · ${t.notes}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <p className="mono" style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: meta.color }}>{sign}{formatINR(t.amount)}</p>
                  <button onClick={() => setConfirmAction({ title: 'Delete Entry', message: 'Delete this entry? Cashflow records will also be removed.', onConfirm: async () => { setConfirmAction(null); try { await onDeleteTransaction(t.id, t.globalTxnId); } catch (err: any) { setAlertMsg(err.message || 'Delete failed.'); } } })}
                    style={{ background: 'none', border: 'none', color: 'var(--text-4)', padding: '0.25rem', cursor: 'pointer', display: 'flex' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Vendor Info */}
      {(vendor.gstNumber || vendor.address || vendor.email) && (
        <>
          <p className="section-label">vendor info</p>
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            {vendor.gstNumber && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>GST</span><span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{vendor.gstNumber}</span></div>}
            {vendor.email && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Email</span><span style={{ fontSize: '0.75rem' }}>{vendor.email}</span></div>}
            {vendor.address && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Address</span><span style={{ fontSize: '0.75rem', textAlign: 'right', maxWidth: '60%' }}>{vendor.address}</span></div>}
          </div>
        </>
      )}

      {/* Archive / Restore */}
      {vendor.status === 'active' ? (
        <button onClick={() => setConfirmAction({ title: 'Archive Vendor', message: `Archive "${vendor.name}"? They will be marked inactive.`, onConfirm: async () => { setConfirmAction(null); try { await onDelete(); } catch (err: any) { setAlertMsg(err.message || 'Failed to archive.'); } } })}
          className="btn-danger" style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem' }}>
          <Trash2 size={14} /> Archive Vendor
        </button>
      ) : (
        <button onClick={() => setConfirmAction({ title: 'Restore Vendor', message: `Restore "${vendor.name}" to active suppliers?`, onConfirm: async () => { setConfirmAction(null); try { if(onRestore) await onRestore(); } catch (err: any) { setAlertMsg(err.message || 'Failed to restore.'); } } })}
          className="btn-primary" style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem' }}>
          <CheckCircle2 size={14} /> Restore Vendor
        </button>
      )}

      <div style={{ height: '5rem' }} />

      {confirmAction && <ConfirmModal title={confirmAction.title} message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}
      {alertMsg && <AlertModal message={alertMsg} onClose={() => setAlertMsg(null)} />}
    </div>
  );
};

export default VendorDetail;
