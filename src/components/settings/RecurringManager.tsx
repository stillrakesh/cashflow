import React, { useState } from 'react';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import type { RecurringExpense, CategoryConfig, RecurrenceFrequency } from '../../types';
import { formatINR } from '../../utils/financeUtils';

interface RecurringManagerProps {
  recurringExpenses: RecurringExpense[];
  categories: CategoryConfig[];
  onSave: (rec: RecurringExpense) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const RecurringManager: React.FC<RecurringManagerProps> = ({ 
  recurringExpenses, categories, onSave, onDelete, onClose 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<RecurringExpense>>({
    name: '',
    amount: 0,
    category: 'rent',
    frequency: 'monthly',
    dayOfMonth: 1,
    status: 'active'
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.amount) return;
    setLoading(true);
    try {
      const catConfig = categories.find(c => c.name.toLowerCase() === formData.category?.toLowerCase());
      const newRec: RecurringExpense = {
        id: 'rec_' + Date.now().toString(36),
        orgId: '', // To be filled by parent
        name: formData.name,
        amount: Number(formData.amount),
        category: formData.category || 'misc',
        frequency: formData.frequency as RecurrenceFrequency,
        dayOfMonth: formData.dayOfMonth,
        dayOfWeek: formData.dayOfWeek,
        status: 'active',
        classification: catConfig?.classification || 'fixed',
        createdAt: new Date().toISOString(),
        notes: formData.notes
      };
      await onSave(newRec);
      setShowAdd(false);
      setFormData({ name: '', amount: 0, category: 'rent', frequency: 'monthly', dayOfMonth: 1, status: 'active' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.25rem', marginBottom: '1.25rem' }}>
          <h2 className="text-title" style={{ fontSize: '1.125rem' }}>recurring expenses</h2>
          <button onClick={onClose} className="btn-ghost" style={{ width: '48px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="sheet-content">
          <p className="text-label" style={{ textTransform: 'none', marginBottom: '1.5rem' }}>
            Automate your fixed costs. The system will alert you on the due date and let you create the transaction with one click.
          </p>

          {showAdd ? (
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 className="text-heading" style={{ marginBottom: '1rem' }}>new template</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="section-label">template name</label>
                  <input 
                    type="text" className="input" placeholder="e.g. Monthly Rent" 
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                   <div>
                    <label className="section-label">amount</label>
                    <input 
                      type="number" className="input" placeholder="₹" 
                      value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="section-label">category</label>
                    <select 
                      className="input" 
                      value={formData.category} 
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="section-label">frequency</label>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {['monthly', 'weekly'].map(f => (
                        <button 
                          key={f} 
                          className={`chip ${formData.frequency === f ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, frequency: f as any })}
                          style={{ flex: 1, justifyContent: 'center', borderRadius: '12px' }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="section-label">{formData.frequency === 'monthly' ? 'day of month' : 'day of week'}</label>
                    <input 
                      type="number" className="input" 
                      min={1} max={formData.frequency === 'monthly' ? 31 : 7}
                      value={formData.dayOfMonth || 1} 
                      onChange={e => setFormData({ ...formData, dayOfMonth: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>cancel</button>
                  <button className="btn-primary" style={{ flex: 2 }} onClick={handleCreate} disabled={loading || !formData.name || !formData.amount}>
                    {loading ? 'saving...' : 'save template'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button className="btn-secondary" style={{ width: '100%', marginBottom: '1.5rem', gap: '0.5rem' }} onClick={() => setShowAdd(true)}>
              <Plus size={16} /> add recurring expense
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recurringExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-4)' }}>
                <Clock size={32} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <p style={{ fontSize: '0.875rem' }}>no recurring expenses yet</p>
              </div>
            ) : (
              recurringExpenses.map(rec => (
                <div key={rec.id} className="card" style={{ padding: '1rem', background: rec.status === 'paused' ? 'var(--bg-2)' : 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <p className="text-heading" style={{ fontSize: '0.875rem' }}>{rec.name}</p>
                        <span className={`badge ${rec.status === 'active' ? 'badge-approved' : 'badge-pending'}`} style={{ fontSize: '0.625rem' }}>
                          {rec.status}
                        </span>
                      </div>
                      <p className="text-label" style={{ textTransform: 'none', margin: '0.25rem 0 0' }}>
                        <span className="text-number" style={{ fontSize: '0.75rem' }}>{formatINR(rec.amount)}</span> · {rec.frequency} {rec.dayOfMonth ? `(Day ${rec.dayOfMonth})` : ''}
                      </p>
                      <p className="text-label" style={{ margin: '0.25rem 0 0' }}>
                        {rec.category} · {rec.classification}
                      </p>
                    </div>
                    <button 
                      onClick={() => onDelete(rec.id)} 
                      className="btn-ghost" 
                      style={{ color: 'var(--red)', padding: '0.25rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringManager;
