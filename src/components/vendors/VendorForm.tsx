import React, { useState } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import type { Vendor } from '../../types';
import CustomSelect from '../shared/CustomSelect';

interface VendorFormProps {
  orgId: string;
  existingVendor?: Vendor;
  onSave: (vendor: Vendor) => Promise<void>;
  onClose: () => void;
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

const VendorForm: React.FC<VendorFormProps> = ({ orgId, existingVendor, onSave, onClose }) => {
  const isEdit = !!existingVendor;
  const [form, setForm] = useState<Partial<Vendor>>(existingVendor || {
    name: '', phone: '', email: '', category: '', address: '', gstNumber: '', notes: '', status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof Vendor, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name?.trim()) { setError('Vendor name is required'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const vendor: Vendor = {
        id: existingVendor?.id || 'vend_' + Date.now().toString(36),
        orgId,
        name: form.name!.trim(),
        phone: form.phone?.trim() || '',
        email: form.email?.trim() || '',
        category: form.category?.trim() || '',
        address: form.address?.trim() || '',
        gstNumber: form.gstNumber?.trim() || '',
        notes: form.notes?.trim() || '',
        status: form.status || 'active',
        createdAt: existingVendor?.createdAt || now,
        updatedAt: now,
      };
      await onSave(vendor);
    } catch (err: any) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="screen-header" style={{ paddingBottom: '0.5rem' }}>
        <button onClick={onClose} className="btn-ghost" style={{ padding: '0.5rem 0.5rem 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-2)' }}>
          <ArrowLeft size={16} /> cancel
        </button>
        <button onClick={handleSave} className="btn-primary" style={{ gap: '0.375rem' }} disabled={saving}>
          <Save size={14} /> {saving ? 'saving...' : isEdit ? 'Update' : 'Add Vendor'}
        </button>
      </div>

      <h1 className="text-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
        {isEdit ? `Edit — ${existingVendor.name}` : 'Add Vendor'}
      </h1>

      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 'var(--radius-m)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <X size={14} color="var(--red)" />
          <span style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{error}</span>
        </div>
      )}

      <p className="section-label">vendor details</p>
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <Row label="Vendor / Supplier Name *">
          <input className="input" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Fresh Farms Supplier" />
        </Row>
        <Row label="What They Supply">
          <input className="input" value={form.category || ''} onChange={e => set('category', e.target.value)} placeholder="e.g. Vegetables, Dairy, Spices" />
        </Row>
        <Row label="Phone Number">
          <input className="input" type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
        </Row>
        <Row label="Email">
          <input className="input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="vendor@email.com" />
        </Row>
        <Row label="GST Number">
          <input className="input" value={form.gstNumber || ''} onChange={e => set('gstNumber', e.target.value)} placeholder="22AAAAA0000A1Z5" />
        </Row>
        <Row label="Address">
          <input className="input" value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Full address" />
        </Row>
        <Row label="Status">
          <CustomSelect
            value={form.status || 'active'}
            onChange={v => set('status', v)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </Row>
      </div>

      <p className="section-label">notes</p>
      <div className="card" style={{ padding: '1rem', marginBottom: '2rem' }}>
        <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
          placeholder="Any additional notes about this vendor..."
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-0)', fontFamily: 'inherit', fontSize: '0.875rem', resize: 'none', minHeight: '80px', lineHeight: 1.5 }} />
      </div>

      <div style={{ height: '5rem' }} />
    </div>
  );
};

export default VendorForm;
