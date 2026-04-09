import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Camera, Loader2, CheckCircle2, ChevronDown, Plus } from 'lucide-react';
import type { Transaction, PaymentType, TransactionType, ExpenseClassification, Vendor, CategoryConfig } from '../../types';
import { CATEGORY_ICONS } from '../../types';
import { parseReceiptWithGemini } from '../../utils/geminiUtils';
import { formatINR } from '../../utils/financeUtils';

const GROUP_LABELS: Record<string, { label: string; tag: string; color: string }> = {
  variable: { label: 'Cost of Goods', tag: 'COGS', color: 'var(--yellow)' },
  fixed: { label: 'Fixed & Overhead', tag: 'FIXED', color: 'var(--blue)' },
  'one-time': { label: 'One-Time / CapEx', tag: 'CAPEX', color: 'var(--red)' },
};
const GROUP_ORDER: ExpenseClassification[] = ['variable', 'fixed', 'one-time'];

const EMOJI_CATEGORIES = {
  food: ['🍔', '🍕', '🍟', '🍜', '🍣', '🥗', '🍲', '🥩', '🍗', '🥬', '🥕', '🥔', '🍅', '🧅', '🫑', '🥒', '🌽', '🥚', '🧀', '🧈', '🥖', '🥨', '🥐', '🥯', '🥞', '🥓', '🍳', '🍤', '🍿', '🍙', '🍛'],
  beverages: ['☕', '🍵', '🥤', '🧃', '🥛', '🍼', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧊'],
  supplies: ['📦', '🛍️', '🛒', '🥡', '🧴', '🧻', '🧹', '🧽', '🧼', '🪣', '🧺', '🕯️', '💡', '🔌', '🔋', '⚙️', '🛠️', '🔧', '🔨', '📏', '📐'],
  business: ['💳', '💵', '💰', '💸', '🏦', '📈', '📊', '📋', '📁', '📁', '📂', '📅', '📆', '📱', '💻', '🖥️', '⌨️', '🖱️', '🖨️', '🧾', '🖊️', '🖋️', '✒️', '📝'],
  travel: ['🚗', '🚛', '🚚', '🛵', '🚲', '⛽', '🚦', '🚧', '🗺️', '📍', '🗺️'],
  household: ['👔', '👕', '👖', '👟', '👞', '👠', '🧤', '🧣', '🌂', '☂️', '🧶', '🧵', '🏮', '🛋️', '🗄️', '🚿', '🛁', '🚽', '🪑']
};

// Categories for the emoji picker

interface QuickAddProps {
  balances: Record<string, number>;
  isAdmin: boolean;
  onAdd: (t: Partial<Transaction>) => void;
  onClose: () => void;
  vendors?: Vendor[];
  onAddVendor?: (v: Vendor) => Promise<void>;
  categories: CategoryConfig[];
  onAddCategory?: (c: CategoryConfig) => void;
  onAddAccount?: (name: string) => void;
  initialData?: Partial<Transaction>;
}

const PAY_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'cash', label: 'cash' },
  { value: 'upi', label: 'upi' },
  { value: 'bank', label: 'bank' },
  { value: 'other', label: 'other' },
];

const QuickAdd: React.FC<QuickAddProps> = ({ onAdd, onClose, balances, isAdmin, vendors = [], onAddVendor, categories, onAddCategory, onAddAccount, initialData }) => {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState<string>(initialData?.category || 'misc');
  const [isCustomCat, setIsCustomCat] = useState(initialData?.category ? !categories.some(c => c.name.toLowerCase() === initialData.category?.toLowerCase()) : false);
  const [paymentType, setPaymentType] = useState<PaymentType>(initialData?.paymentType || 'cash');
  const [account, setAccount] = useState<string>(initialData?.account || (() => localStorage.getItem('cf_last_account') || 'Cash'));
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [vendor, setVendor] = useState(initialData?.vendor || '');
  const [date, setDate] = useState(() => initialData?.date ? new Date(initialData.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  // Inline sub-category creation state
  const [addingSubcatGroup, setAddingSubcatGroup] = useState<string | null>(null);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newSubcatIcon, setNewSubcatIcon] = useState('📦');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Inline account creation state
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');

  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    const safeCats = categories || [];
    const match = safeCats.find(c => c.name === (initialData?.category || 'misc'));
    return match?.classification || 'variable';
  });

  // Group categories by classification
  const groupedCategories = useMemo(() => {
    const safeCats = categories || [];
    const groups: Record<string, CategoryConfig[]> = {};
    for (const c of safeCats) {
      const key = c.classification || 'variable';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return groups;
  }, [categories]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKey = localStorage.getItem('cafeflow_gemini_key') || '';

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const canSave = parseFloat(amount) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setError(null);
    
    // Validation
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Positive amount is required');
      return;
    }
    if (type === 'expense' && (!category || category.trim() === '')) {
      setError('Please select or enter a category');
      return;
    }
    if (!account) {
      setError('Please select an account (Cash, UPI, etc.)');
      return;
    }
    if (!paymentType) {
      setError('Please select a payment method');
      return;
    }

    // Account Balance Validation
    const currentBal = balances[account] || 0;
    const isOverdraft = type === 'expense' && (currentBal - amt < 0);

    if (isOverdraft) {
      if (!isAdmin) {
        setError(`Insufficient funds! Your ${account} balance is ${currentBal.toLocaleString('en-IN')}, but this expense is ${amt.toLocaleString('en-IN')}.`);
        return;
      } else {
        const confirmOver = confirm(`Warning: This will make your ${account} balance negative (-₹${Math.abs(currentBal - amt).toLocaleString('en-IN')}). Proceed anyway?`);
        if (!confirmOver) return;
      }
    }

    const cat = type === 'sale' ? 'sale' : category.trim().toLowerCase() || 'misc';
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    let finalDateIso = new Date().toISOString();
    
    if (date !== todayIST) {
      finalDateIso = new Date(`${date}T12:00:00+05:30`).toISOString();
    }
    
    const txnData: Partial<Transaction> = {
      type, amount: amt, category: cat, paymentType,
      notes: notes.trim(),
      account: account,
      vendor: vendor.trim(),
      date: finalDateIso,
    };
    if (type === 'expense') {
      const catConfig = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
      txnData.classification = catConfig?.classification || 'variable';
    }
    
    setIsSaving(true);
    try {
      // Remember account
      localStorage.setItem('cf_last_account', account);
      
      // Save Transaction
      await onAdd(txnData);

      // Trigger Success State
      setShowSuccess(true);
      
      // Auto-close and reset after delay
      setTimeout(() => {
        onClose();
        // Post-close reset
        setAmount('');
        setNotes('');
        setVendor('');
        setStep(1);
        setShowSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !apiKey) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await parseReceiptWithGemini(base64, file.type, apiKey);
        
        if (result) {
          if (result.amount) setAmount(result.amount.toString());
          if (result.category) setCategory(result.category);
          if (result.vendor) setVendor(result.vendor);
          if (result.notes) setNotes(result.notes);
          if (result.date) setDate(result.date);
          if (result.type) setType(result.type);
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      alert('Failed to scan receipt. Please try again.');
    }
  };

  const handleKey = (k: string) => {
    if (k === '⌫') setAmount(p => p.slice(0, -1));
    else if (k === '.') { if (!amount.includes('.')) setAmount(p => p + '.'); }
    else setAmount(p => p + k);
  };

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && !showSuccess && onClose()}>
      <div className="sheet" style={{ maxHeight: '92dvh' }}>
        {showSuccess ? (
          <div className="animate-in" style={{ padding: '3rem 1.5rem', textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', background: 'var(--green-soft)', 
              color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.5rem', animation: 'scaleUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Entry Saved Successfully</h2>
            <p className="text-label" style={{ textTransform: 'none' }}>This transaction has been recorded.</p>
          </div>
        ) : (
          <>
            <div className="sheet-handle" />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {step === 2 && (
               <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-2)', display: 'flex' }}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
               </button>
            )}
            <h2 className="text-title" style={{ fontSize: '1rem' }}>
              {step === 1 ? 'new entry' : 'details'}
            </h2>
             {apiKey && (
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isScanning}
                 style={{ 
                   background: 'var(--bg-2)', border: 'none', borderRadius: '12px', 
                   padding: '0 0.875rem', height: '32px', fontSize: '0.625rem', fontWeight: 600,
                   display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-1)',
                   cursor: 'pointer'
                 }}
               >
                 {isScanning ? <Loader2 size={12} className="spin" /> : <Camera size={12} />}
                 {isScanning ? 'scanning...' : 'scan receipt'}
               </button>
             )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleScan} 
              accept="image/*" 
              capture="environment" 
              style={{ display: 'none' }} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ width: '8px', height: '4px', borderRadius: '2px', background: step === 1 ? 'var(--text-0)' : 'var(--bg-3)' }} />
              <div style={{ width: '8px', height: '4px', borderRadius: '2px', background: step === 2 ? 'var(--text-0)' : 'var(--bg-3)' }} />
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg-2)', borderRadius: '50%', width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', marginLeft: '0.5rem' }}>
              <X size={14} color="var(--text-2)" />
            </button>
          </div>
        </div>

        <div className="sheet-content">
          {error && (
            <div style={{ margin: '0 1.25rem 1rem', padding: '0.75rem', background: 'var(--red-soft)', borderRadius: '12px', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--red)' }} />
              {error}
            </div>
          )}
          {step === 1 ? (
            <>
              {/* Type */}
              <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem' }}>
            <button type="button" className={`chip ${type === 'sale' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setType('sale'); }} style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>
              sale
            </button>
            <button type="button" className={`chip ${type === 'expense' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setType('expense'); }} style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>
              expense
            </button>
          </div>

        {/* Amount */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-section)' }}>
          <p className="text-label" style={{ marginBottom: 'var(--spacing-sm)' }}>amount</p>
          <p className="mono-xl" style={{ color: amount ? 'var(--text-0)' : 'var(--text-4)', margin: 0 }}>
            {formatINR(parseFloat(amount) || 0)}
          </p>
        </div>

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-section)' }}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <button
              type="button"
              key={k}
              onClick={(e) => { e.preventDefault(); handleKey(k); }}
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-m)',
                background: 'var(--bg-2)',
                color: 'var(--text-0)',
                fontSize: '1rem',
                fontFamily: "'DM Mono', monospace",
                border: 'none',
              }}
              className="text-regular"
            >
              {k}
            </button>
          ))}
        </div>

            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Category (expenses only) */}
              {type === 'expense' && (
                <div>
                  <label className="text-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    category
                    {isCustomCat && <button type="button" onClick={() => { setIsCustomCat(false); setCategory('misc'); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.625rem' }}>cancel</button>}
                  </label>
                  {isCustomCat ? (
                    <input 
                      type="text" 
                      className="input" 
                      autoFocus
                      placeholder="e.g. facebook ads" 
                      value={category} 
                      onChange={e => setCategory(e.target.value)} 
                    />
                  ) : (
                    <div className="category-groups">
                      {GROUP_ORDER.map(groupKey => {
                        const items = groupedCategories[groupKey];
                        if (!items || items.length === 0) return null;
                        const meta = GROUP_LABELS[groupKey];
                        const isOpen = expandedGroup === groupKey;
                        const hasSelected = items.some(c => c.name === category);
                        return (
                          <div key={groupKey} className={`category-group ${isOpen ? 'expanded' : ''}`}>
                            <button
                              type="button"
                              className="category-group-header"
                              onClick={() => setExpandedGroup(isOpen ? null : groupKey)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="category-group-tag" style={{ background: meta.color + '20', color: meta.color }}>{meta.tag}</span>
                                <span className="category-group-label">{meta.label}</span>
                                {hasSelected && !isOpen && (
                                  <span style={{ fontSize: '0.625rem', color: 'var(--text-3)', marginLeft: '4px' }}>• {category}</span>
                                )}
                              </div>
                              <ChevronDown size={14} style={{ color: 'var(--text-3)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                            </button>
                            {isOpen && (
                              <div>
                                <div className="category-grid">
                                  {items.map(c => {
                                    const isSelected = category === c.name;
                                    return (
                                      <button
                                        type="button"
                                        key={c.id}
                                        onClick={() => setCategory(c.name)}
                                        className={`category-item ${isSelected ? 'selected' : ''}`}
                                      >
                                        <span>{c.icon || CATEGORY_ICONS[c.name.toLowerCase()] || '📝'}</span>
                                        <span>{c.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {/* Inline sub-category add */}
                                {addingSubcatGroup === groupKey ? (
                                  <div style={{ padding: '10px 12px 4px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border)' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <button
                                          type="button"
                                          onClick={() => setShowEmojiPicker(v => !v)}
                                          style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', boxShadow: showEmojiPicker ? '0 0 0 2px var(--blue)' : 'none' }}
                                        >
                                          {newSubcatIcon}
                                        </button>
                                        <span style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontWeight: 500 }}>pick icon</span>
                                      </div>
                                      <input
                                        type="text"
                                        className="input"
                                        autoFocus
                                        placeholder="e.g. Oregano, Cups"
                                        value={newSubcatName}
                                        onChange={e => setNewSubcatName(e.target.value)}
                                        style={{ flex: 1, fontSize: '0.8125rem' }}
                                      />
                                      <button
                                        type="button"
                                        disabled={!newSubcatName.trim()}
                                        onClick={() => {
                                          if (!newSubcatName.trim()) return;
                                          const newCat: CategoryConfig = {
                                            id: newSubcatName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString(36),
                                            name: newSubcatName.trim(),
                                            classification: groupKey as ExpenseClassification,
                                            icon: newSubcatIcon,
                                          };
                                          onAddCategory?.(newCat);
                                          setCategory(newCat.name);
                                          setNewSubcatName('');
                                          setNewSubcatIcon('📦');
                                          setAddingSubcatGroup(null);
                                          setShowEmojiPicker(false);
                                        }}
                                        style={{ width: '40px', height: '40px', borderRadius: '10px', background: newSubcatName.trim() ? 'var(--text-0)' : 'var(--bg-3)', border: 'none', color: newSubcatName.trim() ? 'var(--bg-0)' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                      >
                                        <CheckCircle2 size={18} />
                                      </button>
                                    </div>
                                    {showEmojiPicker && (
                                      <div style={{ background: 'var(--bg-2)', borderRadius: '12px', padding: '12px', marginTop: '4px', border: '1px solid var(--border)', maxHeight: '200px', overflowY: 'auto' }}>
                                        {Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
                                          <div key={cat} style={{ marginBottom: '12px' }}>
                                            <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 600 }}>{cat}</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                              {emojis.map(e => (
                                                <button
                                                  type="button"
                                                  key={e}
                                                  onClick={() => { setNewSubcatIcon(e); setShowEmojiPicker(false); }}
                                                  style={{ width: '36px', height: '36px', background: newSubcatIcon === e ? 'var(--blue)' : 'var(--bg-3)', borderRadius: '8px', border: 'none', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                >
                                                  {e}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <button type="button" onClick={() => { setAddingSubcatGroup(null); setShowEmojiPicker(false); }} style={{ background: 'none', border: 'none', fontSize: '0.6875rem', color: 'var(--text-3)', cursor: 'pointer', padding: '2px 0' }}>cancel</button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setAddingSubcatGroup(groupKey); setNewSubcatName(''); setNewSubcatIcon('📦'); setShowEmojiPicker(false); }}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'none', border: 'none', borderTop: '1px dashed var(--border)', color: 'var(--text-3)', fontSize: '0.6875rem', cursor: 'pointer' }}
                                  >
                                    <Plus size={12} /> add sub-category here
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => { setIsCustomCat(true); setCategory(''); }}
                        className="category-item custom-trigger"
                        style={{ width: '100%', flexDirection: 'row', height: '40px', gap: '8px', marginTop: '4px' }}
                      >
                        <span>✨</span>
                        <span>add custom category</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Payment */}
              <div>
                <label className="section-label" style={{ marginBottom: '8px', display: 'block' }}>payment method</label>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  {PAY_TYPES.map(p => (
                    <button type="button" key={p.value} className={`chip ${paymentType === p.value ? 'active' : ''}`} onClick={() => setPaymentType(p.value)} style={{ flex: 1, justifyContent: 'center' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="section-label" style={{ marginBottom: '8px', display: 'block' }}>transaction date</label>
                <input 
                  type="date" 
                  className="input text-center-date text-medium" 
                  style={{ width: '100%' }} 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                />
              </div>

              {/* Notes */}
              {/* Vendor / Source Field */}
              <div>
                <label className="text-label" style={{ marginBottom: '8px', display: 'block' }}>
                  {type === 'sale' ? 'source / channel' : 'vendor / beneficiary'}
                </label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder={type === 'sale' ? 'e.g. Swiggy, Zomato, Dine-in' : 'e.g. Modern Dairy, Reliance Retail'} 
                  value={vendor} 
                  onChange={e => setVendor(e.target.value)} 
                />
              </div>

              {/* Note Field (Optional) */}
              <div>
                <p className="text-label" style={{ marginBottom: '8px' }}>additional notes</p>
                <textarea 
                  className="input" 
                  style={{ height: '80px', paddingTop: '12px', resize: 'none' }}
                  placeholder="tap to add description..."
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                />
              </div>

              {/* Account Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <label className="section-label" style={{ margin: 0 }}>source account</label>
                  <span className="text-light" style={{ fontSize: '0.625rem', color: (balances[account] || 0) < 0 ? 'var(--red)' : 'var(--text-3)' }}>
                    {account} bal: ₹{(balances[account] || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {Object.keys(balances).map(acc => (
                      <button 
                        type="button"
                        key={acc} 
                        className={`chip ${account === acc ? 'active' : ''}`} 
                        onClick={() => setAccount(acc)} 
                        style={{ justifyContent: 'center' }}
                      >
                        {acc}
                      </button>
                    ))}
                    {isAddingAccount ? (
                      <div style={{ display: 'flex', gap: '6px', flex: '1 1 100%', marginTop: '4px' }}>
                        <input
                          type="text"
                          className="input"
                          autoFocus
                          placeholder="e.g. HDFC Bank"
                          value={newAccountName}
                          onChange={e => setNewAccountName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newAccountName.trim()) {
                              onAddAccount?.(newAccountName.trim());
                              setAccount(newAccountName.trim());
                              setNewAccountName('');
                              setIsAddingAccount(false);
                            }
                          }}
                          style={{ flex: 1, fontSize: '0.8125rem' }}
                        />
                        <button
                          type="button"
                          disabled={!newAccountName.trim()}
                          onClick={() => {
                            if (!newAccountName.trim()) return;
                            onAddAccount?.(newAccountName.trim());
                            setAccount(newAccountName.trim());
                            setNewAccountName('');
                            setIsAddingAccount(false);
                          }}
                          style={{ width: '36px', height: '36px', borderRadius: '10px', background: newAccountName.trim() ? 'var(--text-0)' : 'var(--bg-3)', border: 'none', color: newAccountName.trim() ? 'var(--bg-0)' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsAddingAccount(false); setNewAccountName(''); }}
                          style={{ background: 'none', border: 'none', fontSize: '0.6875rem', color: 'var(--text-3)', cursor: 'pointer' }}
                        >
                          cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingAccount(true)}
                        className="chip"
                        style={{ justifyContent: 'center', borderStyle: 'dashed' }}
                      >
                        <Plus size={12} /> add
                      </button>
                    )}
                </div>
              </div>

              {/* Vendor */}
              <div>
                  <label className="section-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    vendor (optional)
                    {vendor && !vendors.some(v => v.name.toLowerCase() === vendor.toLowerCase()) && (
                      <button 
                        onClick={() => {
                          const newV: Vendor = { id: 'vend_' + Date.now().toString(36), orgId: '', name: vendor, createdAt: new Date().toISOString() };
                          onAddVendor?.(newV);
                        }}
                        className="text-medium"
                        style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '0.625rem', padding: 0 }}
                      >
                        + save as new vendor
                      </button>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      className="input text-regular" 
                      style={{ width: '100%' }}
                      value={vendor} 
                      onChange={e => setVendor(e.target.value)} 
                      placeholder="e.g. swiggy, local shop" 
                      list="vendor-list"
                    />
                    <datalist id="vendor-list">
                      {vendors.map(v => <option key={v.id} value={v.name} />)}
                    </datalist>
                  </div>
              </div>
            </div>
          )}
        </div> {/* end sheet-content */}

        {/* Footer */}
        {step === 1 ? (
          <div className="sheet-footer" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button
              onClick={() => { setError(null); setStep(2); }}
              disabled={!canSave}
              className="btn-primary"
              style={{ flex: 1, opacity: canSave ? 1 : 0.3 }}
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="sheet-footer" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="btn-primary"
              style={{ flex: 1, opacity: (canSave && !isSaving) ? 1 : 0.3, gap: '0.5rem' }}
            >
              {isSaving ? <Loader2 size={18} className="spin" /> : null}
              {isSaving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default QuickAdd;
