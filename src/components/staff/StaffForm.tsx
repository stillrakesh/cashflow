import React, { useState } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import type { StaffMember, EmploymentType, SalaryCycle, StaffStatus, User, PaymentType } from '../../types';
import CustomSelect from '../shared/CustomSelect';
import DatePicker from '../shared/DatePicker';

interface StaffFormProps {
  orgId: string;
  currentUser: User;
  existingStaff?: StaffMember;
  onSave: (staff: StaffMember) => Promise<void>;
  onClose: () => void;
}

const InputRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

const StaffForm: React.FC<StaffFormProps> = ({ orgId, currentUser, existingStaff, onSave, onClose }) => {
  const isEdit = !!existingStaff;
  const now = new Date().toISOString();

  const [form, setForm] = useState<Partial<StaffMember>>(existingStaff || {
    name: '', phone: '', address: '', emergencyContact: '', dob: '',
    joiningDate: new Date().toISOString().split('T')[0],
    governmentId: '', position: '', department: '',
    employmentType: 'full-time', status: 'active',
    salaryBasis: 'monthly', salaryAmount: 0, salaryCycle: 'monthly', salaryDueDay: 1,
    paymentMethod: 'cash', bankDetails: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof StaffMember, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name?.trim()) { setError('Name is required'); return; }
    if (!form.position?.trim()) { setError('Position is required'); return; }
    if (!form.salaryAmount || form.salaryAmount <= 0) { setError('Valid salary amount is required'); return; }

    setSaving(true);
    try {
      let historicalSalaries = existingStaff?.historicalSalaries || {};
      
      // Lock in old salary for past months if it changed
      if (existingStaff && existingStaff.salaryAmount !== Number(form.salaryAmount)) {
        const currentMo = now.slice(0, 7);
        const joinMo = existingStaff.joiningDate.slice(0, 7);
        
        const cur = new Date(joinMo + '-01');
        const end = new Date(currentMo + '-01');
        end.setMonth(end.getMonth() - 1); // up to last month
        
        while (cur <= end) {
          const mo = cur.toISOString().slice(0, 7);
          if (historicalSalaries[mo] === undefined) {
            historicalSalaries[mo] = existingStaff.salaryAmount;
          }
          cur.setMonth(cur.getMonth() + 1);
        }
      }

      const staff: StaffMember = {
        id: existingStaff?.id || 'staff_' + Date.now().toString(36),
        orgId,
        name: form.name!.trim(),
        phone: form.phone?.trim() || '',
        address: form.address?.trim() || '',
        emergencyContact: form.emergencyContact?.trim() || '',
        dob: form.dob || '',
        joiningDate: form.joiningDate || now.split('T')[0],
        governmentId: form.governmentId?.trim() || '',
        position: form.position!.trim(),
        department: form.department?.trim() || '',
        employmentType: form.employmentType as EmploymentType || 'full-time',
        status: form.status as StaffStatus || 'active',
        salaryBasis: form.salaryBasis || 'monthly',
        salaryAmount: Number(form.salaryAmount) || 0,
        salaryCycle: form.salaryCycle as SalaryCycle || 'monthly',
        salaryDueDay: Number(form.salaryDueDay) || 1,
        paymentMethod: form.paymentMethod as PaymentType || 'cash',
        bankDetails: form.bankDetails?.trim() || '',
        notes: form.notes?.trim() || '',
        historicalSalaries,
        createdAt: existingStaff?.createdAt || now,
        updatedAt: now,
        createdBy: existingStaff?.createdBy || currentUser.id,
      };
      await onSave(staff);
    } catch (err: any) {
      setError(err.message || 'Failed to save. Try again.');
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
          <Save size={14} /> {saving ? 'saving...' : isEdit ? 'Update' : 'Add Staff'}
        </button>
      </div>

      <h1 className="text-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
        {isEdit ? `Edit — ${existingStaff.name}` : 'Add Staff Member'}
      </h1>

      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 'var(--radius-m)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <X size={14} color="var(--red)" />
          <span style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{error}</span>
        </div>
      )}

      <p className="section-label">personal details</p>
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <InputRow label="Full Name *">
          <input className="input" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Santosh Kumar" />
        </InputRow>
        <InputRow label="Mobile Number">
          <input className="input" type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
        </InputRow>
        <InputRow label="Date of Birth">
          <DatePicker
            value={form.dob || ''}
            onChange={v => set('dob', v)}
            placeholder="Select date of birth"
            maxDate={new Date().toISOString().slice(0, 10)}
          />
        </InputRow>
        <InputRow label="Joining Date">
          <DatePicker
            value={form.joiningDate || ''}
            onChange={v => set('joiningDate', v)}
            placeholder="Select joining date"
          />
        </InputRow>
        <InputRow label="Address">
          <input className="input" value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Home address" />
        </InputRow>
        <InputRow label="Emergency Contact">
          <input className="input" value={form.emergencyContact || ''} onChange={e => set('emergencyContact', e.target.value)} placeholder="Name & phone" />
        </InputRow>
        <InputRow label="Government ID (Aadhaar/PAN)">
          <input className="input" value={form.governmentId || ''} onChange={e => set('governmentId', e.target.value)} placeholder="XXXX-XXXX-XXXX" />
        </InputRow>
      </div>

      <p className="section-label">work details</p>
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <InputRow label="Position / Role *">
          <input className="input" value={form.position || ''} onChange={e => set('position', e.target.value)} placeholder="e.g. Chef, Waiter, Cashier" />
        </InputRow>
        <InputRow label="Department">
          <input className="input" value={form.department || ''} onChange={e => set('department', e.target.value)} placeholder="e.g. Kitchen, Front of House" />
        </InputRow>
        <InputRow label="Employment Type">
          <CustomSelect
            value={form.employmentType || 'full-time'}
            onChange={v => set('employmentType', v as EmploymentType)}
            options={[
              { value: 'full-time', label: 'Full-Time' },
              { value: 'part-time', label: 'Part-Time' },
              { value: 'contract', label: 'Contract' },
              { value: 'daily-wage', label: 'Daily Wage' },
            ]}
          />
        </InputRow>
        <InputRow label="Status">
          <CustomSelect
            value={form.status || 'active'}
            onChange={v => set('status', v as StaffStatus)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'on-leave', label: 'On Leave' },
            ]}
          />
        </InputRow>
      </div>

      <p className="section-label">salary configuration</p>
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <InputRow label="Salary Basis">
          <CustomSelect
            value={form.salaryBasis || 'monthly'}
            onChange={v => set('salaryBasis', v)}
            options={[
              { value: 'monthly', label: 'Fix Monthly Basis' },
              { value: 'daily', label: 'Temporary Daily Basis' },
            ]}
          />
        </InputRow>
        <InputRow label={form.salaryBasis === 'daily' ? "Daily Wage (₹) *" : "Monthly Salary (₹) *"}>
          <input className="input" type="number" min="0" value={form.salaryAmount || ''} onChange={e => set('salaryAmount', parseFloat(e.target.value) || 0)} placeholder={form.salaryBasis === 'daily' ? "e.g. 500" : "e.g. 20000"} />
        </InputRow>
        <InputRow label="Salary Cycle">
          <CustomSelect
            value={form.salaryCycle || 'monthly'}
            onChange={v => set('salaryCycle', v as SalaryCycle)}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'bi-weekly', label: 'Bi-Weekly' },
              { value: 'daily', label: 'Daily' },
            ]}
          />
        </InputRow>
        {form.salaryBasis === 'monthly' && (
          <InputRow label="Salary Due Day (1-31)">
            <input className="input" type="number" min="1" max="31" value={form.salaryDueDay || 1} onChange={e => set('salaryDueDay', parseInt(e.target.value) || 1)} />
          </InputRow>
        )}
        <InputRow label="Preferred Payment Method">
          <CustomSelect
            value={form.paymentMethod || 'cash'}
            onChange={v => set('paymentMethod', v as PaymentType)}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'upi', label: 'UPI' },
              { value: 'bank', label: 'Bank Transfer' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </InputRow>
        <InputRow label="Bank / UPI Details">
          <input className="input" value={form.bankDetails || ''} onChange={e => set('bankDetails', e.target.value)} placeholder="UPI ID or Account Number" />
        </InputRow>
      </div>

      <p className="section-label">notes</p>
      <div className="card" style={{ padding: '1rem', marginBottom: '2rem' }}>
        <textarea
          value={form.notes || ''}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any additional notes about this staff member..."
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-0)', fontFamily: 'inherit', fontSize: '0.875rem', resize: 'none', minHeight: '80px', lineHeight: 1.5 }}
        />
      </div>

      <div style={{ height: '5rem' }} />
    </div>
  );
};

export default StaffForm;
