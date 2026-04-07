import React, { useState, useRef } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import type { Transaction, PaymentType, TransactionCategory, TransactionType } from '../../types';
import { CATEGORY_ICONS, CATEGORY_CLASSIFICATION } from '../../types';
import { parseReceiptWithGemini } from '../../utils/geminiUtils';

interface QuickAddProps {
  onAdd: (t: Partial<Transaction>) => void;
  onClose: () => void;
}

const CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: 'vegetables', label: 'vegetables' },
  { value: 'oil', label: 'oil' },
  { value: 'gas', label: 'gas' },
  { value: 'dairy', label: 'dairy' },
  { value: 'meat', label: 'meat' },
  { value: 'spices', label: 'spices' },
  { value: 'packaging', label: 'packaging' },
  { value: 'beverages', label: 'beverages' },
  { value: 'rent', label: 'rent' },
  { value: 'utilities', label: 'utilities' },
  { value: 'salary', label: 'salary' },
  { value: 'cleaning', label: 'cleaning' },
  { value: 'equipment', label: 'equipment' },
  { value: 'repairs', label: 'repairs' },
  { value: 'transport', label: 'transport' },
  { value: 'misc', label: 'misc' },
];

const PAY_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'cash', label: 'cash' },
  { value: 'upi', label: 'upi' },
  { value: 'bank', label: 'bank' },
  { value: 'other', label: 'other' },
];

const QuickAdd: React.FC<QuickAddProps> = ({ onAdd, onClose }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('misc');
  const [isCustomCat, setIsCustomCat] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [account, setAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isScanning, setIsScanning] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKey = localStorage.getItem('cafeflow_gemini_key') || '';

  const canSave = parseFloat(amount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    const cat = type === 'sale' ? 'sale' : category.trim().toLowerCase() || 'misc';
    onAdd({
      type, amount: parseFloat(amount), category: cat, paymentType,
      notes: notes.trim(),
      account: account.trim(),
      vendor: vendor.trim(),
      date: new Date(date).toISOString(),
      classification: type === 'expense' ? (CATEGORY_CLASSIFICATION[cat] || 'variable') : undefined,
    });
    onClose();
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
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxHeight: '92dvh' }}>
        <div className="sheet-handle" />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>new entry</h2>
            {apiKey && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                style={{ 
                  background: 'var(--bg-2)', border: 'none', borderRadius: 'var(--radius-full)', 
                  padding: '0.375rem 0.625rem', fontSize: '0.625rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-1)'
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
          <button onClick={onClose} style={{ background: 'var(--bg-2)', borderRadius: '50%', width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
            <X size={14} color="var(--text-2)" />
          </button>
        </div>

        {/* Type */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem' }}>
          <button className={`chip ${type === 'sale' ? 'active' : ''}`} onClick={() => setType('sale')} style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>
            sale
          </button>
          <button className={`chip ${type === 'expense' ? 'active' : ''}`} onClick={() => setType('expense')} style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>
            expense
          </button>
        </div>

        {/* Amount */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>amount</p>
          <p className="mono-xl" style={{ color: amount ? 'var(--text-0)' : 'var(--text-4)', margin: 0 }}>
            ₹{amount || '0'}
          </p>
        </div>

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.375rem', marginBottom: '1.25rem' }}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-m)',
                background: 'var(--bg-2)',
                color: 'var(--text-0)',
                fontSize: '1rem',
                fontFamily: "'DM Mono', monospace",
                fontWeight: 400,
                border: 'none',
              }}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Category (expenses only) */}
        {type === 'expense' && (
          <div style={{ marginBottom: '1rem' }}>
            <p className="section-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              category
              {isCustomCat && <button onClick={() => { setIsCustomCat(false); setCategory('misc'); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.625rem' }}>cancel</button>}
            </p>
            {isCustomCat ? (
              <input 
                type="text" 
                className="input" 
                autoFocus
                placeholder="e.g. facebook ads" 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                style={{ fontSize: '0.8125rem' }} 
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.375rem' }}>
                {CATEGORIES.slice(0, 11).map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    style={{
                      padding: '0.5rem 0.25rem',
                      borderRadius: 'var(--radius-m)',
                      background: category === c.value ? 'var(--text-0)' : 'var(--bg-2)',
                      color: category === c.value ? 'var(--bg-0)' : 'var(--text-2)',
                      fontSize: '0.625rem',
                      fontWeight: 500,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                      border: 'none',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem' }}>{CATEGORY_ICONS[c.value]}</span>
                    {c.label}
                  </button>
                ))}
                <button
                  onClick={() => { setIsCustomCat(true); setCategory(''); }}
                  style={{
                    padding: '0.5rem 0.25rem',
                    borderRadius: 'var(--radius-m)',
                    background: 'var(--bg-2)', color: 'var(--text-2)',
                    fontSize: '0.625rem', fontWeight: 500,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                    border: '1px dashed var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>✨</span>
                  custom
                </button>
              </div>
            )}
          </div>
        )}

        {/* Payment */}
        <div style={{ marginBottom: '1rem' }}>
          <p className="section-label">payment</p>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {PAY_TYPES.map(p => (
              <button key={p.value} className={`chip ${paymentType === p.value ? 'active' : ''}`} onClick={() => setPaymentType(p.value)} style={{ flex: 1, justifyContent: 'center' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div style={{ marginBottom: '1rem' }}>
          <p className="section-label">date</p>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: '0.8125rem' }} />
        </div>

        {/* Notes & Account */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div>
            <p className="section-label">notes</p>
            <input type="text" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="what was this for?" style={{ fontSize: '0.8125rem' }} />
          </div>
          <div>
            <p className="section-label">account / person</p>
            <input type="text" className="input" value={account} onChange={e => setAccount(e.target.value)} placeholder="e.g. hdfc, ramesh" style={{ fontSize: '0.8125rem' }} />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
            <p className="section-label">vendor</p>
            <input type="text" className="input" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. swiggy, local shop" style={{ fontSize: '0.8125rem' }} />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="btn-primary"
          style={{ width: '100%', padding: '0.875rem', opacity: canSave ? 1 : 0.3 }}
        >
          {type === 'sale' ? 'save sale' : 'save expense'}
          {amount ? ` · ₹${parseFloat(amount).toLocaleString('en-IN')}` : ''}
        </button>
      </div>
    </div>
  );
};

export default QuickAdd;
