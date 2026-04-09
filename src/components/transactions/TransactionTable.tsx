import React, { useState } from 'react';
import {
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
  onReject?: (id: string, comment?: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<Transaction>) => void;
  role: string;
  isDateLocked: (date: string) => boolean;
  onAddClick?: () => void;
}

const CATEGORIES: TransactionCategory[] = [
  'vegetables','oil','gas','packaging','rent','utilities','salary',
  'marketing','dairy','meat','spices','beverages','cleaning',
  'equipment','repairs','transport','misc',
];
const PAY_TYPES: PaymentType[] = ['cash','upi','bank','other'];

const TransactionList: React.FC<TransactionListProps> = ({
  transactions, onApprove, onReject, onDelete, onEdit, role, isDateLocked, onAddClick
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

  const IST_TZ = 'Asia/Kolkata';

  // Get YYYY-MM-DD in IST for a date string
  const getISTDateStr = (d: string) =>
    new Date(d).toLocaleDateString('en-CA', { timeZone: IST_TZ });

  const formatGroupHeader = (d: string) => {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: IST_TZ });
    const yestDate = new Date(); yestDate.setDate(yestDate.getDate() - 1);
    const yestIST  = yestDate.toLocaleDateString('en-CA', { timeZone: IST_TZ });
    const dStr = getISTDateStr(d);

    if (dStr === todayIST) return 'TODAY';
    if (dStr === yestIST)  return 'YESTERDAY';

    // Format as "8TH APRIL"
    const dateObj = new Date(d);
    const day = parseInt(new Date(d).toLocaleDateString('en-IN', { day: 'numeric', timeZone: IST_TZ }), 10);
    const suffix = ['TH','ST','ND','RD'][(day % 10 > 3 ? 0 : (day % 100 - day % 10 !== 10 ? day % 10 : 0))];
    const month = dateObj.toLocaleDateString('en-IN', { month: 'long', timeZone: IST_TZ }).toUpperCase();
    return `${day}${suffix} ${month}`;
  };

  const formatItemDate = (d: string) => {
    const day = parseInt(new Date(d).toLocaleDateString('en-IN', { day: 'numeric', timeZone: IST_TZ }), 10);
    const suffix = ['th','st','nd','rd'][(day % 10 > 3 ? 0 : (day % 100 - day % 10 !== 10 ? day % 10 : 0))];
    const month = new Date(d).toLocaleDateString('en-IN', { month: 'short', timeZone: IST_TZ }).toLowerCase();
    return `${day}${suffix} ${month}`;
  };

  // Group by IST date, preserving newest-first order within each group
  // Use a Map so insertion order = the order transactions arrive (already sorted newest-first by parent)
  const groupMap = new Map<string, { sortKey: string; txns: Transaction[] }>();
  transactions.forEach(t => {
    const istDateStr = getISTDateStr(t.date); // YYYY-MM-DD in IST — used as sort key
    const label = formatGroupHeader(t.date);
    if (!groupMap.has(label)) {
      groupMap.set(label, { sortKey: istDateStr, txns: [] });
    }
    groupMap.get(label)!.txns.push(t);
  });
  // Sort groups newest-first, and sort items inside them newest-first too
  const grouped = Array.from(groupMap.entries())
    .sort((a, b) => b[1].sortKey.localeCompare(a[1].sortKey))
    .map(([label, { txns }]) => {
      // Sort strictly by the moment the transaction was created or updated
      txns.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || a.date).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || b.date).getTime();
        return timeB - timeA;
      });
      return { label, txns };
    });

  if (transactions.length === 0) {
    return (
      <div className="card animate-in" style={{ padding: '3rem 1.5rem', textAlign: 'center', marginTop: '1rem' }}>
        <p className="text-bold" style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>No transactions yet</p>
        <p className="text-light" style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>Your entries will appear here.</p>
        {onAddClick && (
          <button className="btn-primary" onClick={onAddClick}>
            + Add first entry
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {grouped.map(({ label, txns }) => (
        <div key={label}>
          <p className="section-label" style={{ marginBottom: '1.25rem' }}>{label}</p>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {txns.map((txn, i) => {
              const isEditing = editingId === txn.id;
              const isExpanded = expandedId === txn.id;
              const icon = CATEGORY_ICONS[txn.category?.toLowerCase()] || (txn.type === 'sale' ? '💰' : '📝');
              
              // Status formatting
              let statusColor = 'var(--text-3)';
              const isLocked = isDateLocked(txn.date);
              if (isLocked) {
                statusColor = 'var(--text-3)';
              } else if (txn.status === 'approved') {
                statusColor = 'var(--green)';
              } else if (txn.status === 'pending') {
                statusColor = 'var(--yellow)';
              } else if (txn.status === 'rejected') {
                statusColor = 'var(--red)';
              }

              return (
                <div key={txn.id} className="animate-in" style={{ animationDelay: `${i * 20}ms`, opacity: 0 }}>
                   {/* Row */}
                  <div
                    onClick={() => !isEditing && setExpandedId(isExpanded ? null : txn.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0',
                      borderBottom: (!isExpanded && i < txns.length - 1) ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      borderTop: isExpanded ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {/* Left: Icon */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: 'var(--radius-m)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--bg-2)', fontSize: '1.25rem', flexShrink: 0
                    }}>
                      {icon}
                    </div>

                    {/* Middle: Title + Date */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="text-heading" style={{ textTransform: 'capitalize', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {txn.vendor || (txn.type === 'sale' ? 'Sale' : txn.category)}
                      </span>
                      <span className="text-label" style={{ fontWeight: 400, textTransform: 'lowercase', fontSize: '0.6875rem' }}>
                        {formatItemDate(txn.date)}
                      </span>
                    </div>

                    {/* Right: Amount */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className="text-number" style={{
                        fontSize: '0.9375rem',
                        color: txn.type === 'sale' ? 'var(--green)' : 'var(--text-0)',
                      }}>
                        {txn.type === 'sale' ? '+' : ''}{formatINR(txn.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 0 12px 52px',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label className="text-label">amount</label>
                              <input type="number" className="input" value={editValues.amount || ''} onChange={e => setEditValues(v => ({...v, amount: parseFloat(e.target.value) || 0}))} />
                            </div>
                            <div>
                              <label className="text-label">date</label>
                              <input type="date" className="input" value={editValues.date || ''} onChange={e => setEditValues(v => ({...v, date: e.target.value}))} />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label className="text-label">category</label>
                              <select className="input" value={editValues.category || ''} onChange={e => setEditValues(v => ({...v, category: e.target.value}))}>
                                <option value="sale">Sale</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-label">payment</label>
                              <select className="input" value={editValues.paymentType || ''} onChange={e => setEditValues(v => ({...v, paymentType: e.target.value as PaymentType}))}>
                                {PAY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label className="text-label">vendor / source</label>
                              <input type="text" className="input" value={editValues.vendor || ''} onChange={e => setEditValues(v => ({...v, vendor: e.target.value}))} />
                            </div>
                            <div>
                              <label className="text-label">notes & account</label>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input type="text" className="input" value={editValues.notes || ''} onChange={e => setEditValues(v => ({...v, notes: e.target.value}))} placeholder="notes" />
                                <input type="text" className="input" value={editValues.account || ''} onChange={e => setEditValues(v => ({...v, account: e.target.value}))} placeholder="account" />
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button onClick={() => saveEdit(txn.id)} className="btn-primary" style={{ flex: 1, height: '36px' }}>save</button>
                            <button onClick={cancelEdit} className="btn-secondary" style={{ flex: 1, height: '36px' }}>cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                              <p className="text-label" style={{ marginBottom: '2px' }}>status</p>
                              <p className="text-heading" style={{ color: statusColor, fontSize: '0.8125rem' }}>{txn.status}</p>
                            </div>
                            <div>
                              <p className="text-label" style={{ marginBottom: '2px' }}>payment</p>
                              <p className="text-heading" style={{ fontSize: '0.8125rem', textTransform: 'uppercase' }}>{txn.paymentType}</p>
                            </div>
                            <div>
                              <p className="text-label" style={{ marginBottom: '2px' }}>account</p>
                              <p className="text-heading" style={{ fontSize: '0.8125rem' }}>{txn.account || '—'}</p>
                            </div>
                            <div>
                              <p className="text-label" style={{ marginBottom: '2px' }}>recorded by</p>
                              <p className="text-heading" style={{ fontSize: '0.8125rem' }}>{txn.userName.split(' ')[0]}</p>
                            </div>
                          </div>
                          
                          {txn.notes && (
                            <div style={{ marginBottom: '12px' }}>
                              <p className="text-label" style={{ marginBottom: '2px' }}>notes</p>
                              <p className="text-regular" style={{ fontSize: '0.8125rem' }}>{txn.notes}</p>
                            </div>
                          )}

                          {txn.status === 'rejected' && txn.adminComment && (
                            <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--red-soft)', borderRadius: 'var(--radius-m)', border: '1px solid var(--red)' }}>
                              <p className="text-label" style={{ color: 'var(--red)', marginBottom: '2px', fontWeight: 600 }}>rejection reason</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-1)', margin: 0, fontStyle: 'italic' }}>"{txn.adminComment}"</p>
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {(isAdmin || (!isLocked && txn.status === 'pending')) && (
                              <button 
                                onClick={() => startEdit(txn)} 
                                className="btn-outline" 
                                style={{ 
                                  height: '32px', padding: '0 10px', fontSize: '0.75rem', gap: '4px',
                                  opacity: (isLocked && !isAdmin) ? 0.5 : 1,
                                  cursor: (isLocked && !isAdmin) ? 'not-allowed' : 'pointer'
                                }}
                                disabled={isLocked && !isAdmin}
                              >
                                <Edit3 size={12} /> edit
                              </button>
                            )}

                            {isAdmin && txn.status === 'pending' && (
                              <>
                                <button onClick={() => onApprove(txn.id)} className="btn-primary" style={{ height: '32px', padding: '0 10px', fontSize: '0.75rem' }}>approve</button>
                                <button onClick={() => onReject && onReject(txn.id)} className="btn-outline" style={{ height: '32px', padding: '0 10px', fontSize: '0.75rem', color: 'var(--red)', borderColor: 'var(--red)' }}>reject</button>
                              </>
                            )}

                             {(isAdmin || (!isLocked && txn.status === 'pending')) && (
                              <button 
                                onClick={() => onDelete(txn.id)} 
                                className="btn-ghost"
                                style={{ 
                                  width: '32px', height: '32px', padding: 0, color: 'var(--red)', 
                                  opacity: (isLocked && !isAdmin) ? 0.5 : 1,
                                  cursor: (isLocked && !isAdmin) ? 'not-allowed' : 'pointer',
                                  marginLeft: 'auto'
                                }}
                                disabled={isLocked && !isAdmin}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            
                            <button onClick={e => { e.stopPropagation(); setExpandedId(null); }} className="btn-ghost" style={{ width: '32px', height: '32px', padding: 0, color: 'var(--text-3)' }}>
                              <ChevronUp size={16} />
                            </button>
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
