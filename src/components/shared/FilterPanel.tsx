import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { getDateRangeFromPreset } from '../../utils/financeUtils';
import type { FilterState, PaymentType, TransactionType, ExpenseClassification, DatePreset } from '../../types';

interface FilterPanelProps {
  filters: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
  availableTags: string[];
  availableAccounts: string[];
  mode?: 'dashboard' | 'full';
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onApply, onClose, availableTags, availableAccounts, mode = 'full' }) => {
  const [local, setLocal] = useState<FilterState>({ ...filters, accounts: filters.accounts || [] });

  // Update custom dates if preset changes
  useEffect(() => {
    if (local.datePreset !== 'custom' && local.datePreset !== 'all') {
      const { dateFrom, dateTo } = getDateRangeFromPreset(local.datePreset);
      setLocal(p => ({ ...p, dateFrom, dateTo }));
    } else if (local.datePreset === 'all') {
      setLocal(p => ({ ...p, dateFrom: '', dateTo: '' }));
    }
  }, [local.datePreset]);

  const activeCount = useMemo(() => {
    let c = 0;
    if (local.datePreset !== 'all' || local.dateFrom || local.dateTo) c++;
    if (local.categories.length) c++;
    if (local.accounts.length) c++;
    if (local.paymentTypes.length) c++;
    if (local.types.length) c++;
    if (local.classifications.length) c++;
    return c;
  }, [local]);

  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const reset = () => {
    const f: FilterState = {
      dateFrom: '', dateTo: '', categories: [], paymentTypes: [],
      types: [], classifications: [], statuses: [], accounts: [], searchQuery: filters.searchQuery, datePreset: 'all'
    };
    onApply(f);
    onClose();
  };

  const PRESETS: { value: DatePreset, label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxHeight: '85dvh' }}>
        <div className="sheet-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>
            filters {activeCount > 0 && <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>({activeCount})</span>}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {activeCount > 0 && (
              <button onClick={reset} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--red)', padding: '0.375rem' }}>reset</button>
            )}
            <button onClick={onClose} style={{ background: 'var(--bg-2)', borderRadius: '50%', width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
              <X size={14} color="var(--text-2)" />
            </button>
          </div>
        </div>

        {/* Date Preset */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Calendar size={12} /> select period</p>
          <div className="scroll-x" style={{ gap: '0.375rem', paddingBottom: '0.25rem' }}>
            {PRESETS.map(p => (
              <button 
                key={p.value} 
                className={`chip ${local.datePreset === p.value ? 'active' : ''}`} 
                onClick={() => setLocal(prev => ({ ...prev, datePreset: p.value }))}
              >
                {p.label}
              </button>
            ))}
          </div>
          
          {local.datePreset === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-m)' }}>
              <div>
                <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>From</label>
                <input type="date" className="input" value={local.dateFrom} onChange={e => setLocal(p => ({...p, dateFrom: e.target.value}))} style={{ fontSize: '0.8125rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>To</label>
                <input type="date" className="input" value={local.dateTo} onChange={e => setLocal(p => ({...p, dateTo: e.target.value}))} style={{ fontSize: '0.8125rem' }} />
              </div>
            </div>
          )}
        </div>

        {mode !== 'dashboard' && (
          <>
            {/* Categories */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p className="section-label">categories</p>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {availableTags.map(tag => (
              <button key={tag} className={`chip ${local.categories.includes(tag) ? 'active' : ''}`} onClick={() => setLocal(p => ({...p, categories: toggle(p.categories, tag)}))}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts */}
        {availableAccounts.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="section-label">accounts / people</p>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {availableAccounts.map(acc => (
                <button key={acc} className={`chip ${local.accounts.includes(acc) ? 'active' : ''}`} onClick={() => setLocal(p => ({...p, accounts: toggle(p.accounts, acc)}))}>
                  {acc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Type */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="section-label">type</p>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {(['sale', 'expense'] as TransactionType[]).map(t => (
              <button key={t} className={`chip ${local.types.includes(t) ? 'active' : ''}`} onClick={() => setLocal(p => ({...p, types: toggle(p.types, t)}))} style={{ flex: 1, justifyContent: 'center' }}>
                {t === 'sale' ? 'sales' : 'expenses'}
              </button>
            ))}
          </div>
        </div>

        {/* Payment */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="section-label">payment</p>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {(['cash','upi','bank','other'] as PaymentType[]).map(p => (
              <button key={p} className={`chip ${local.paymentTypes.includes(p) ? 'active' : ''}`} onClick={() => setLocal(prev => ({...prev, paymentTypes: toggle(prev.paymentTypes, p)}))}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Classification */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="section-label">expense type</p>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {(['fixed','variable','one-time'] as ExpenseClassification[]).map(c => (
              <button key={c} className={`chip ${local.classifications.includes(c) ? 'active' : ''}`} onClick={() => setLocal(p => ({...p, classifications: toggle(p.classifications, c)}))}>
                {c}
              </button>
            ))}
          </div>
        </div>
        </>
        )}

        <button onClick={() => { onApply(local); onClose(); }} className="btn-primary" style={{ width: '100%' }}>
          apply{activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
