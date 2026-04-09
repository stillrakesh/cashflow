import React, { useState } from 'react';
import { Plus, Trash2, Tag, X } from 'lucide-react';
import type { CategoryConfig, ExpenseClassification } from '../../types';

interface CategoryManagerProps {
  categories: CategoryConfig[];
  onSave: (categories: CategoryConfig[]) => void;
  onClose: () => void;
}

const CLASSIFICATIONS: { value: ExpenseClassification; label: string; color: string }[] = [
  { value: 'fixed', label: 'Fixed Cost', color: 'var(--red)' },
  { value: 'variable', label: 'Variable Cost', color: 'var(--green)' },
  { value: 'one-time', label: 'One-Time', color: 'var(--blue)' },
];

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onSave, onClose }) => {
  const [list, setList] = useState<CategoryConfig[]>(categories);
  const [newName, setNewName] = useState('');
  const [newCls, setNewCls] = useState<ExpenseClassification>('variable');

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newCat: CategoryConfig = {
      id: 'cat_' + Date.now().toString(36),
      name: newName.trim().toLowerCase(),
      classification: newCls,
      icon: '📝'
    };
    const updated = [...list, newCat];
    setList(updated);
    setNewName('');
  };

  const handleRemove = (id: string) => {
    const updated = list.filter(c => c.id !== id);
    setList(updated);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10005 }}>
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="icon-box" style={{ background: 'var(--bg-2)', color: 'var(--text-1)' }}>
              <Tag size={18} />
            </div>
            <div>
              <h2 className="text-heading" style={{ margin: 0 }}>Manage Categories</h2>
              <p className="text-label" style={{ textTransform: 'none', margin: 0 }}>Define custom expense types</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ width: '48px' }}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: 'var(--spacing-card)' }}>
          {/* Add Form */}
          <div className="card-secondary" style={{ padding: 'var(--spacing-card)', marginBottom: 'var(--spacing-section)' }}>
            <p className="section-label" style={{ marginTop: 0 }}>Add New Category</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <input 
                type="text" 
                className="input text-regular" 
                placeholder="Category name (e.g. Electricity)" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                {CLASSIFICATIONS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setNewCls(c.value)}
                    className={`chip ${newCls === c.value ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.6875rem', borderRadius: '12px' }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="btn-primary" 
                style={{ width: '100%', marginTop: '0.25rem' }}
              >
                <Plus size={16} /> Add Category
              </button>
            </div>
          </div>

          <p className="section-label">Active Categories</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {list.map(cat => (
              <div key={cat.id} className="card" style={{ padding: 'var(--spacing-sm) var(--spacing-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{cat.icon || '📝'}</span>
                  <div>
                    <p className="text-heading" style={{ fontSize: '0.875rem' }}>{cat.name}</p>
                    <p className="text-label" style={{ color: CLASSIFICATIONS.find(c => c.value === cat.classification)?.color, textTransform: 'lowercase' }}>
                      {CLASSIFICATIONS.find(c => c.value === cat.classification)?.label}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemove(cat.id)}
                  className="btn-danger" 
                  style={{ width: '48px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: 'var(--spacing-card)' }}>
          <button onClick={() => onSave(list)} className="btn-primary" style={{ width: '100%' }}>
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
