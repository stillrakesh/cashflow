import React, { useState } from 'react';
import type { User } from '../../types';
import PinLock from './PinLock';
import { ChefHat, ShieldCheck, Mail, Phone, ArrowLeft, KeyRound } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

type AuthView = 'initial' | 'admin-form' | 'staff-select' | 'pin-entry' | 'recovery';
type RecoveryStep = 'select' | 'code' | 'reset';

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [view, setView] = useState<AuthView>('initial');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('select');
  const [recoveryCode, setRecoveryCode] = useState('');

  const handleAdminLoginSubmit = () => {
    const admin = users.find(u => u.role === 'admin' && u.email.toLowerCase() === adminEmail.toLowerCase());
    if (admin) {
      setSelectedUser(admin);
      setView('pin-entry');
    } else {
      alert('Admin record not found. Use "admin@cafe.com"');
    }
  };

  const handleStaffSelect = (u: User) => {
    setSelectedUser(u);
    setView('pin-entry');
  };

  const startRecovery = () => {
    setView('recovery');
    setRecoveryStep('select');
    // In real app, find admin, get recoveryEmail/phone
  };

  if (view === 'recovery') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-0)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 10001 }}>
        <button onClick={() => setView('initial')} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'none', border: 'none', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} /> back
        </button>
        
        <div style={{ textAlign: 'center', maxWidth: '320px', width: '100%' }}>
          <div style={{ background: 'var(--blue-soft)', color: 'var(--blue)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <KeyRound size={24} />
          </div>
          
          {recoveryStep === 'select' && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Verify Identity</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '2rem' }}>Choose how you'd like to receive your 6-digit recovery code.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button onClick={() => setRecoveryStep('code')} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left', background: 'var(--bg-1)' }}>
                  <Mail size={18} color="var(--text-2)" />
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0 }}>Send to Email</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: 0 }}>ad****@cafe.com</p>
                  </div>
                </button>
                <button onClick={() => setRecoveryStep('code')} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left', background: 'var(--bg-1)' }}>
                  <Phone size={18} color="var(--text-2)" />
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0 }}>Send via SMS</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: 0 }}>+91 ****3322</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {recoveryStep === 'code' && (
            <div className="animate-in">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Check your mail</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>We sent a code to admin@cafe.com. (Hint: Use 999999 for demo)</p>
              
              <input 
                type="text" maxLength={6} placeholder="000000"
                value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)}
                style={{ width: '100%', padding: '0.875rem', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-m)', color: 'var(--text-0)', marginBottom: '1rem' }}
              />
              
              <button 
                onClick={() => { if(recoveryCode === '999999') setRecoveryStep('reset'); else alert('Invalid code'); }}
                className="btn-primary" style={{ width: '100%', padding: '0.875rem' }}
              >
                Verify Code
              </button>
            </div>
          )}

          {recoveryStep === 'reset' && (
            <div className="animate-in">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Account Restored</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '2rem' }}>Identity verified. Please log in with your credentials.</p>
              <button 
                onClick={() => setView('admin-form')} 
                className="btn-primary" style={{ width: '100%', padding: '0.875rem' }}
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'pin-entry' && selectedUser) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--bg-0)' }}>
        <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
          <button 
            onClick={() => setView('initial')} 
            style={{ background: 'var(--bg-2)', border: 'none', borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-2)' }}
          >
            ← logout / change
          </button>
        </div>
        <PinLock correctPin={selectedUser.pin} onUnlock={() => onLogin(selectedUser)} />
        
        {selectedUser.role === 'admin' && (
          <button 
            onClick={startRecovery}
            style={{ position: 'absolute', bottom: '3rem', left: 0, right: 0, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem' }}
          >
            forgot PIN?
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-0)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--text-0)' }}>
          <ShieldCheck size={32} strokeWidth={1.5} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '0.375rem' }}>CafeFlow</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Secure business analytics</p>
      </div>

      <div style={{ width: '100%', maxWidth: '340px' }}>
        {view === 'initial' && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <button onClick={() => setView('admin-form')} className="btn-primary" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
               <ShieldCheck size={18} /> Administrative Access
            </button>
            <button onClick={() => setView('staff-select')} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
               <ChefHat size={18} color="var(--text-2)" /> Staff Entry
            </button>
          </div>
        )}

        {view === 'admin-form' && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={() => setView('initial')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <label style={{ fontSize: '0.6875rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Admin Email</label>
              <input 
                type="email" placeholder="admin@cafe.com"
                value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-m)', color: 'var(--text-0)', outline: 'none' }}
              />
            </div>
            <button onClick={handleAdminLoginSubmit} className="btn-primary" style={{ padding: '0.75rem' }}>Verify Identity</button>
            <button onClick={startRecovery} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Forgot PIN?</button>
          </div>
        )}

        {view === 'staff-select' && (
          <div className="animate-in">
             <button onClick={() => setView('initial')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.25rem' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {users.filter(u => u.role !== 'admin').map(u => (
                <button
                  key={u.id}
                  onClick={() => handleStaffSelect(u)}
                  className="card"
                  style={{ padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-1)', border: '1px solid var(--border)', textAlign: 'center' }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-2)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChefHat size={20} />
                  </div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0, color: 'var(--text-0)' }}>{u.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '4rem', opacity: 0.4 }}>
        <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cafe Management System v3.5</p>
      </div>
    </div>
  );
};

export default Login;
