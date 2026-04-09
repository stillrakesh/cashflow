import React, { useState, useEffect } from 'react';
import type { User, Organization, ThemeMode, BusinessType } from '../../types';
import PinLock from './PinLock';
import { ChefHat, ShieldCheck, Mail, Phone, ArrowLeft, KeyRound, Sun, Moon, Building2, Briefcase, Coffee, ShoppingBag, Wrench, MoreHorizontal } from 'lucide-react';
import { findOrgByCredential, isCredentialTaken } from '../../lib/db';

const THEME_KEY = 'cafeflow_theme';

type AuthView = 'initial' | 'admin-login' | 'staff-login' | 'sign-up-biz' | 'sign-up-user' | 'pin-entry' | 'recovery';
type RecoveryStep = 'select' | 'code' | 'reset';

interface LoginProps {
  onLogin: (user: User, orgId: string) => void;
  onSignUp: (org: Partial<Organization>, user: Partial<User>) => void;
}

const BUSINESS_TYPES: { value: BusinessType; label: string; icon: React.ReactNode }[] = [
  { value: 'restaurant', label: 'Restaurant', icon: <ChefHat size={20} /> },
  { value: 'cafe', label: 'Café / Bakery', icon: <Coffee size={20} /> },
  { value: 'retail', label: 'Retail Store', icon: <ShoppingBag size={20} /> },
  { value: 'services', label: 'Services', icon: <Wrench size={20} /> },
  { value: 'other', label: 'Other', icon: <MoreHorizontal size={20} /> },
];

const Login: React.FC<LoginProps> = ({ onLogin, onSignUp }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'dark');
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const [view, setView] = useState<AuthView>('initial');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resolvedOrgId, setResolvedOrgId] = useState<string>('');
  const [loginId, setLoginId] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Sign up state — Business
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('restaurant');
  
  // Sign up state — User
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPin, setSignupPin] = useState('');

  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('select');
  const [recoveryCode, setRecoveryCode] = useState('');

  const clearError = () => setError('');

  // Admin login: find which org they belong to, then get their user doc
  const handleAdminLoginSubmit = async () => {
    clearError();
    if (!loginId.trim()) { setError('Please enter your email or username.'); return; }
    
    setIsLoading(true);
    try {
      const result = await findOrgByCredential(loginId.trim());
      if (!result) {
        setError('No account found with that email or username.');
        setIsLoading(false);
        return;
      }
      
      // Fetch the actual user doc from the org
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      const membersSnap = await getDocs(collection(db, 'organizations', result.orgId, 'members'));
      
      let foundUser: User | null = null;
      membersSnap.forEach(d => {
        const u = { ...d.data(), id: d.id } as User;
        if (u.id === result.userId && u.role === 'admin') {
          foundUser = u;
        }
      });
      
      if (!foundUser) {
        setError('Admin account not found. If you are staff, use Staff Sign In.');
        setIsLoading(false);
        return;
      }
      
      setSelectedUser(foundUser);
      setResolvedOrgId(result.orgId);
      setView('pin-entry');
    } catch (err) {
      console.error(err);
      setError('Connection error. Please try again.');
    }
    setIsLoading(false);
  };

  // Staff login: similar flow
  const handleStaffLoginSubmit = async () => {
    clearError();
    if (!staffUsername.trim()) { setError('Please enter your username.'); return; }
    
    setIsLoading(true);
    try {
      const result = await findOrgByCredential(staffUsername.trim());
      if (!result) {
        setError('Staff member not found. Please check your username.');
        setIsLoading(false);
        return;
      }
      
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      const membersSnap = await getDocs(collection(db, 'organizations', result.orgId, 'members'));
      
      let foundUser: User | null = null;
      membersSnap.forEach(d => {
        const u = { ...d.data(), id: d.id } as User;
        if (u.id === result.userId) {
          foundUser = u;
        }
      });
      
      if (!foundUser) {
        setError('User account not found.');
        setIsLoading(false);
        return;
      }
      
      setSelectedUser(foundUser);
      setResolvedOrgId(result.orgId);
      setView('pin-entry');
    } catch (err) {
      console.error(err);
      setError('Connection error. Please try again.');
    }
    setIsLoading(false);
  };

  // Sign-up step 1 → step 2
  const handleBizContinue = () => {
    clearError();
    if (!bizName.trim()) { setError('Please enter your business name.'); return; }
    setView('sign-up-user');
  };

  // Sign-up step 2 → create
  const handleSignUpSubmit = async () => {
    clearError();
    if (!signupName || !signupUsername || !signupEmail || signupPin.length !== 4) {
      setError('Please fill all required fields. PIN must be 4 digits.');
      return;
    }
    
    setIsLoading(true);
    try {
      const taken = await isCredentialTaken(signupEmail, signupUsername);
      if (taken) {
        setError('Email or username already registered. Try signing in instead.');
        setIsLoading(false);
        return;
      }
      
      onSignUp(
        { name: bizName.trim(), businessType: bizType, currency: 'INR', plan: 'free' },
        { name: signupName, username: signupUsername.toLowerCase().trim(), email: signupEmail.toLowerCase().trim(), phone: signupPhone, pin: signupPin, role: 'admin' }
      );
    } catch (err) {
      console.error(err);
      setError('Failed to create account. Please try again.');
    }
    setIsLoading(false);
  };

  const startRecovery = () => {
    setView('recovery');
    setRecoveryStep('select');
  };

  // Error banner component
  const ErrorBanner = () => error ? (
    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-m)', padding: '0.625rem 0.75rem', marginBottom: '1rem', fontSize: '0.75rem', color: '#ef4444', textAlign: 'center' }}>
      {error}
    </div>
  ) : null;

  // ==================== RECOVERY VIEW ====================
  if (view === 'recovery') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-0)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 10001 }}>
        <button onClick={() => { setView('initial'); clearError(); }} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'none', border: 'none', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
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
                <button onClick={() => setRecoveryStep('code')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left', height: 'auto', minHeight: '48px', padding: '1rem' }}>
                  <Mail size={18} color="var(--text-2)" />
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0 }}>Send to Email</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: 0 }}>ad****@cafe.com</p>
                  </div>
                </button>
                <button onClick={() => setRecoveryStep('code')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left', height: 'auto', minHeight: '48px', padding: '1rem' }}>
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
                className="btn-primary" style={{ width: '100%' }}
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
                onClick={() => setView('admin-login')} 
                className="btn-primary" style={{ width: '100%' }}
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== PIN ENTRY VIEW ====================
  if (view === 'pin-entry' && selectedUser) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--bg-0)' }}>
        <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
          <button 
            onClick={() => { setView('initial'); setSelectedUser(null); clearError(); }} 
            className="btn-secondary"
          >
            ← logout / change
          </button>
        </div>
        <PinLock correctPin={selectedUser.pin} onUnlock={() => onLogin(selectedUser, resolvedOrgId)} />
        
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

  // ==================== MAIN LOGIN VIEW ====================
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-0)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        id="login-theme-toggle"
        aria-label="Toggle theme"
        className="btn-secondary"
        style={{ 
          position: 'absolute', top: '1.5rem', right: '1.5rem',
          width: '48px', height: '48px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--text-0)' }}>
          <ShieldCheck size={32} strokeWidth={1.5} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '0.375rem' }}>CafeFlow</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Business finance management</p>
      </div>

      <div style={{ width: '100%', maxWidth: '340px' }}>
        <ErrorBanner />

        {/* ========== INITIAL VIEW ========== */}
        {view === 'initial' && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <button onClick={() => { setView('admin-login'); clearError(); }} className="btn-primary" style={{ gap: '0.75rem' }}>
               <ShieldCheck size={18} /> Admin Sign In
            </button>
            <button onClick={() => { setView('staff-login'); clearError(); }} className="btn-secondary" style={{ gap: '0.75rem' }}>
               <ChefHat size={18} /> Staff Sign In
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>New business?</p>
              <button 
                onClick={() => { setView('sign-up-biz'); clearError(); }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-0)', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'underline' }}
              >
                Create your workspace
              </button>
            </div>
          </div>
        )}

        {/* ========== ADMIN LOGIN ========== */}
        {view === 'admin-login' && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={() => { setView('initial'); clearError(); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <label style={{ fontSize: '0.6875rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Email or Username</label>
              <input 
                type="text" placeholder="e.g. admin@cafe.com"
                value={loginId} onChange={e => { setLoginId(e.target.value); clearError(); }}
                onKeyDown={e => e.key === 'Enter' && handleAdminLoginSubmit()}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-m)', color: 'var(--text-0)', outline: 'none' }}
              />
            </div>
            <button onClick={handleAdminLoginSubmit} className="btn-primary" style={{ opacity: isLoading ? 0.6 : 1 }} disabled={isLoading}>
              {isLoading ? 'Finding account...' : 'Continue to PIN'}
            </button>
            <button onClick={startRecovery} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Forgot PIN?</button>
          </div>
        )}

        {/* ========== STAFF LOGIN ========== */}
        {view === 'staff-login' && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={() => { setView('initial'); clearError(); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.25rem' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <label style={{ fontSize: '0.6875rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Staff Username</label>
              <input 
                type="text" placeholder="e.g. rakesh_waiter"
                value={staffUsername} onChange={e => { setStaffUsername(e.target.value); clearError(); }}
                onKeyDown={e => e.key === 'Enter' && handleStaffLoginSubmit()}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-m)', color: 'var(--text-0)', outline: 'none' }}
              />
            </div>
            <button onClick={handleStaffLoginSubmit} className="btn-primary" style={{ opacity: isLoading ? 0.6 : 1 }} disabled={isLoading}>
              {isLoading ? 'Finding account...' : 'Continue to PIN'}
            </button>
          </div>
        )}

        {/* ========== SIGN UP — Step 1: Business Info ========== */}
        {view === 'sign-up-biz' && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={() => { setView('initial'); clearError(); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0 0.25rem' }}>
              <div style={{ background: 'var(--green-soft)', color: 'var(--green)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Setup your workspace</h2>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: '0.125rem 0 0' }}>Step 1 of 2 — Business details</p>
              </div>
            </div>
            
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Business Name</label>
              <input 
                type="text" className="input" 
                value={bizName} onChange={e => { setBizName(e.target.value); clearError(); }} 
                placeholder="e.g. Rakesh's Kitchen" 
                autoFocus
              />
            </div>
            
            <div>
              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Business Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {BUSINESS_TYPES.map(bt => (
                  <button
                    key={bt.value}
                    onClick={() => setBizType(bt.value)}
                    style={{
                      height: '48px',
                      background: bizType === bt.value ? 'var(--green-soft)' : 'var(--bg-2)',
                      border: `1.5px solid ${bizType === bt.value ? 'var(--green)' : 'var(--border)'}`,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0 1rem',
                      color: bizType === bt.value ? 'var(--green)' : 'var(--text-2)',
                      fontSize: '0.75rem',
                      fontWeight: bizType === bt.value ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {bt.icon}
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>
            
            <button onClick={handleBizContinue} className="btn-primary" style={{ marginTop: '0.5rem' }}>
              Continue
            </button>
          </div>
        )}

        {/* ========== SIGN UP — Step 2: Admin User ========== */}
        {view === 'sign-up-user' && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '70dvh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <button onClick={() => { setView('sign-up-biz'); clearError(); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
              <div style={{ background: 'var(--green-soft)', color: 'var(--green)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Briefcase size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Your admin account</h2>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: '0.125rem 0 0' }}>Step 2 of 2 — for <strong>{bizName}</strong></p>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Full Name</label>
              <input type="text" className="input" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Unique Username</label>
              <input type="text" className="input" value={signupUsername} onChange={e => setSignupUsername(e.target.value)} placeholder="john_admin" />
            </div>
            <div>
              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Email Address</label>
              <input type="email" className="input" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="john@company.com" />
            </div>
            <div>
              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Phone (Optional)</label>
              <input type="tel" className="input" value={signupPhone} onChange={e => setSignupPhone(e.target.value)} placeholder="+91..." />
            </div>
            <div>
              <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Create 4-Digit PIN</label>
              <input 
                type="password" maxLength={4} className="input" 
                value={signupPin} onChange={e => setSignupPin(e.target.value.replace(/\D/g,''))} 
                placeholder="****" style={{ textAlign: 'center', letterSpacing: '0.5em' }}
              />
            </div>
            
            <button onClick={handleSignUpSubmit} className="btn-primary" style={{ marginTop: '0.5rem', opacity: isLoading ? 0.6 : 1 }} disabled={isLoading}>
              {isLoading ? 'Creating workspace...' : 'Launch workspace'}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '4rem', opacity: 0.4 }}>
        <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CafeFlow v4.0 — Multi-Tenant Platform</p>
      </div>
    </div>
  );
};

export default Login;
