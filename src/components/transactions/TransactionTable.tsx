import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit3,
  ChevronUp,
} from 'lucide-react';
import type { Transaction, PaymentType, TransactionCategory } from '../../types';
import { CATEGORY_ICONS } from '../../types';
import { formatINR } from '../../utils/financeUtils';

interface TransactionListProps {
  transactions: Transaction[];
  onApprove: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<Transaction>) => void;
  role: string;
}

const CATEGORIES: TransactionCategory[] = [
  'vegetables','oil','gas','packaging','rent','utilities','salary',
  'marketing','dairy','meat','spices','beverages','cleaning',
  'equipment','repairs','transport','misc',
];
const PAY_TYPES: PaymentType[] = ['cash','upi','bank','other'];

const TransactionList: React.FC<TransactionListProps> = ({
  transactions, onApprove, onDelete, onEdit, role,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Transaction>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isAdmin = role === 'admin';

  const startEdit = (txn: Transaction) => {
    setEditingId(txn.id);
    setEditValues({
      amount: txn.amount,
      category: txn.category,
      paymentType: txn.paymentType,
      notes: txn.notes,
      account: txn.account || '',
      vendor: txn.vendor || '',
      date: txn.date.split('T')[0],
    });
  };

  const saveEdit = (id: string) => {
    onEdit(id, editValues);
    setEditingId(null);
    setEditValues({});
  };

  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const formatGroupHeader = (d: string) => {
    const date = new Date(d);
    const today = new Date();
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    
    const getLocalYMD = (dt: Date) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    
    const dStr = getLocalYMD(date);
    if (dStr === getLocalYMD(today)) return 'TODAY';
    if (dStr === getLocalYMD(yest)) return 'YESTERDAY';
    
    const day = date.getDate();
    const suffix = ['TH', 'ST', 'ND', 'RD'][(day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10 ? day % 10 : 0))];
    const month = date.toLocaleDateString('en-IN', { month: 'long' }).toUpperCase();
    return `${day}${suffix} ${month}`;
  };

  const formatItemDate = (d: string) => {
    const date = new Date(d);
    const day = date.getDate();
    const suffix = ['th', 'st', 'nd', 'rd'][(day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10 ? day % 10 : 0))];
    const month = date.toLocaleDateString('en-IN', { month: 'short' }).toLowerCase();
    const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    return `${day}${suffix} ${month} ${time}`;
  };

  // Group by day exactly
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
    const key = formatGroupHeader(t.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {Object.entries(grouped).map(([monthKey, txns]) => (
        <div key={monthKey}>
          <p className="section-label" style={{ marginBottom: '1.25rem' }}>{monthKey}</p>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {txns.map((txn, i) => {
              const isEditing = editingId === txn.id;
              const isExpanded = expandedId === txn.id;
              const icon = CATEGORY_ICONS[txn.category?.toLowerCase()] || (txn.type === 'sale' ? '💰' : '📝');
              
              // Status formatting
              let statusColor = 'var(--text-3)';
              let StatusIcon = CheckCircle2;
              if (txn.status === 'approved') {
                statusColor = 'var(--green)';
                StatusIcon = CheckCircle2;
              } else if (txn.status === 'pending') {
                statusColor = 'var(--yellow)';
                StatusIcon = Clock;
              } else if (txn.status === 'rejected') {
                statusColor = 'var(--red)';
                StatusIcon = XCircle;
              }

              return (
                <div key={txn.id} className="animate-in" style={{ animationDelay: `${i * 20}ms`, opacity: 0 }}>
                  {/* Row */}
                  <div
                    onClick={() => !isEditing && setExpandedId(isExpanded ? null : txn.id)}
                    style={{
                      display: 'flex', gap: '0.875rem', padding: '1rem 0',
                      borderBottom: (!isExpanded && i < txns.length - 1) ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      borderTop: isExpanded ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      border: '1px solid var(--border-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--bg-0)', fontSize: '1.25rem', flexShrink: 0
                    }}>
                      {icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-0)', textTransform: 'capitalize' }}>
                          {txn.vendor || (txn.type === 'sale' ? 'Sale' : txn.category)} {txn.subCategory ? `— ${txn.subCategory}` : ''}
                        </span>
                        <span className="mono" style={{
                          fontSize: '0.9375rem', fontWeight: 500,
                          color: txn.type === 'sale' ? 'var(--green)' : 'var(--text-0)',
                        }}>
                          {txn.type === 'sale' ? '+' : ''}{formatINR(txn.amount)}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                        <StatusIcon size={12} color={statusColor} strokeWidth={2.5} />
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                          {formatItemDate(txn.date)}
                        </span>
                      </div>

                      {/* Optional Context Pills beneath */}
                      {txn.status === 'pending' && !isExpanded && (
                        <div style={{
                          display: 'inline-flex', background: 'var(--yellow-soft)', color: 'var(--yellow)',
                          padding: '0.25rem 0.625rem', borderRadius: '2px', fontSize: '0.5625rem',
                          fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase'
                        }}>
                          waiting for approval
                        </div>
                      )}
                      {txn.status === 'rejected' && !isExpanded && (
                        <div style={{
                          display: 'inline-flex', background: 'var(--red-soft)', color: 'var(--red)',
                          padding: '0.25rem 0.625rem', borderRadius: '2px', fontSize: '0.5625rem',
                          fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase'
                        }}>
                          entry rejected
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 0 1.25rem 3.5rem',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                            <div>
                              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.25rem' }}>amount</label>
                              <input type="number" className="input" value={editValues.amount || ''} onChange={e => setEditValues(v => ({...v, amount: parseFloat(e.target.value) || 0}))} style={{ padding: '0.625rem', fontSize: '0.8125rem' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.25rem' }}>date</label>
                              <input type="date" className="input" value={editValues.date || ''} onChange={e => setEditValues(v => ({...v, date: e.target.value}))} style={{ padding: '0.625rem', fontSize: '0.8125rem' }} />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                            <div>
                              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.25rem' }}>category</label>
                              <select className="input" value={editValues.category || ''} onChange={e => setEditValues(v => ({...v, category: e.target.value}))} style={{ padding: '0.625rem', fontSize: '0.8125rem' }}>
                                <option value="sale">Sale</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.25rem' }}>payment</label>
                              <select className="input" value={editValues.paymentType || ''} onChange={e => setEditValues(v => ({...v, paymentType: e.target.value as PaymentType}))} style={{ padding: '0.625rem', fontSize: '0.8125rem' }}>
                                {PAY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                            <div>
                              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.25rem' }}>vendor / source</label>
                              <input type="text" className="input" value={editValues.vendor || ''} onChange={e => setEditValues(v => ({...v, vendor: e.target.value}))} style={{ padding: '0.625rem', fontSize: '0.8125rem' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.25rem' }}>notes & account</label>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <input type="text" className="input" value={editValues.notes || ''} onChange={e => setEditValues(v => ({...v, notes: e.target.value}))} style={{ padding: '0.625rem', fontSize: '0.8125rem', flex: 1 }} placeholder="notes" />
                                <input type="text" className="input" value={editValues.account || ''} onChange={e => setEditValues(v => ({...v, account: e.target.value}))} style={{ padding: '0.625rem', fontSize: '0.8125rem', flex: 1 }} placeholder="account" />
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <button onClick={() => saveEdit(txn.id)} className="btn-primary" style={{ flex: 1, padding: '0.625rem', fontSize: '0.75rem' }}>
                              save
                            </button>
                            <button onClick={cancelEdit} className="btn-outline" style={{ flex: 1, padding: '0.625rem', fontSize: '0.75rem' }}>
                              cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem' }}>
                            <div>
                              <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 0.125rem' }}>status</p>
                              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: statusColor, margin: 0, textTransform: 'capitalize' }}>{txn.status}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 0.125rem' }}>payment via</p>
                              <p style={{ fontSize: '0.75rem', fontWeight: 500, margin: 0, textTransform: 'uppercase' }}>{txn.paymentType}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 0.125rem' }}>recorded by</p>
                              <p style={{ fontSize: '0.75rem', fontWeight: 500, margin: 0 }}>{txn.userName.split(' ')[0]}</p>
                            </div>
                            {txn.notes && (
                              <div>
                                <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 0.125rem' }}>notes</p>
                                <p style={{ fontSize: '0.75rem', fontWeight: 500, margin: 0 }}>{txn.notes}</p>
                              </div>
                            )}
                            {txn.account && (
                              <div>
                                <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 0.125rem' }}>account</p>
                                <p style={{ fontSize: '0.75rem', fontWeight: 500, margin: 0 }}>{txn.account}</p>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <button onClick={() => startEdit(txn)} className="btn-outline" style={{ flex: 1, fontSize: '0.6875rem', gap: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
                              <Edit3 size={11} /> edit
                            </button>
                            {isAdmin && txn.status === 'pending' && (
                              <button onClick={() => onApprove(txn.id)} style={{ flex: 1, fontSize: '0.6875rem', background: 'var(--text-0)', color: 'var(--bg-0)', borderRadius: 'var(--radius-full)', padding: '0.5rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                approve
                              </button>
                            )}
                            <button onClick={e => { e.stopPropagation(); setExpandedId(null); }} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
                              <ChevronUp size={14} />
                            </button>
                            {isAdmin && (
                              <button onClick={() => onDelete(txn.id)} style={{ fontSize: '0.6875rem', background: 'transparent', color: 'var(--red)', padding: '0.5rem 0.625rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {transactions.length === 0 && (
        <div className="empty-state" style={{ marginTop: '2rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
          <p style={{ fontSize: '0.8125rem', fontWeight: 500 }}>no payments found</p>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
