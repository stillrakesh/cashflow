import { useState, useMemo, useEffect, useCallback } from 'react';
import BottomNav from './components/layout/BottomNav';
import StatCards from './components/dashboard/StatCards';
import SalesChart from './components/dashboard/SalesChart';
import AIInsights from './components/dashboard/AIInsights';
import TransactionList from './components/transactions/TransactionTable';
import AIChatbot from './components/dashboard/AIChatbot';
import TagAnalytics from './components/dashboard/TagAnalytics';
import QuickAdd from './components/transactions/QuickAdd';
import FilterPanel from './components/shared/FilterPanel';
import Login from './components/auth/Login';
import ClearDataModal from './components/shared/ClearDataModal';
import DownloadStatementModal from './components/shared/DownloadStatementModal';
import { versions } from './utils/mockData';
import { calculateStats, generateAIInsights, formatINR, getTodaySnapshot, getPeriodSummary } from './utils/financeUtils';
import { CATEGORY_CLASSIFICATION } from './types';
import type { Transaction, User, FilterState, ThemeMode, EditRecord } from './types';
import { 
  Search, SlidersHorizontal, Sun, Moon, ChevronRight, ChevronDown, Download, CheckCircle2, FileText, Eye, EyeOff
} from 'lucide-react';
import { generateMonthlyReport, generateTransactionStatement } from './utils/pdfUtils';
import { 
  listenToTransactions, listenToUsers, addTransactionToDb, 
  updateTransactionInDb, deleteTransactionFromDb, initializeDatabase, updateUserInDb, deleteUserFromDb,
  listenToAppSettings, updateAppSettingsInDb
} from './lib/db';

const STORAGE_KEY = 'cafeflow_transactions';
const THEME_KEY = 'cafeflow_theme';
const API_KEY_STORAGE = 'cafeflow_gemini_key';
const USERS_STORAGE_KEY = 'cafeflow_users';
const CURRENT_USER_SESSION_KEY = 'cafeflow_logged_in_user';

// Returns the current UTC ISO string for storage.
// Display formatting (IST) is handled separately in the UI layer with timeZone: 'Asia/Kolkata'.
const nowIST = (): string => new Date().toISOString();

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'dark');
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem(THEME_KEY, theme); }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [showApiKey, setShowApiKey] = useState(false);
  useEffect(() => { localStorage.setItem(API_KEY_STORAGE, geminiApiKey); }, [geminiApiKey]);

  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    // Attempt local storage migration once on mount.
    // IMPORTANT: Fall back to [] not mock data — prevents demo data resurrection after a wipe.
    let localUsers: User[] = [];
    let localTxns: Transaction[] = [];
    try { 
      const u = localStorage.getItem(USERS_STORAGE_KEY); if(u) localUsers = JSON.parse(u);
      const t = localStorage.getItem(STORAGE_KEY); if(t) localTxns = JSON.parse(t);
    } catch {}

    const setupFn = async () => {
      await initializeDatabase(localUsers as User[], localTxns as Transaction[]);
      
      const unsubUsers = listenToUsers((fetchedUsers) => {
        setUsers(fetchedUsers);
      });
      
      const unsubTxns = listenToTransactions((fetchedTxns) => {
        setTransactions(fetchedTxns);
        setIsDbReady(true);
      });

      const unsubSettings = listenToAppSettings((settings) => {
        if (settings.geminiApiKey) setGeminiApiKey(settings.geminiApiKey);
      });

      return () => {
        unsubUsers();
        unsubTxns();
        unsubSettings();
      };
    };

    setupFn();
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const s = sessionStorage.getItem(CURRENT_USER_SESSION_KEY);
    return s ? JSON.parse(s) : null;
  });
  
  const handleLogin = (u: User) => {
    setCurrentUser(u);
    sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(u));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
    setActiveTab('dashboard');
  };

  const [activeTab, setActiveTab] = useState('dashboard');

  const [showDashboardFilters, setShowDashboardFilters] = useState(false);
  const [showTxnFilters, setShowTxnFilters] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'category' | 'status' | 'payment' | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [dashboardFilters, setDashboardFilters] = useState<FilterState>({
    dateFrom: '', dateTo: '', categories: [], paymentTypes: [], types: [], classifications: [], statuses: [], accounts: [], searchQuery: '', datePreset: 'this_month'
  });
  
  const [txnFilters, setTxnFilters] = useState<FilterState>({
    dateFrom: '', dateTo: '', categories: [], paymentTypes: [], types: [], classifications: [], statuses: [], accounts: [], searchQuery: '', datePreset: 'this_month'
  });

  const todaySnapshot = useMemo(() => getTodaySnapshot(transactions), [transactions]);
  const availableTags = useMemo(() => Array.from(new Set(transactions.map(t => t.category).filter(Boolean))).sort(), [transactions]);
  const availableAccounts = useMemo(() => Array.from(new Set(transactions.map(t => t.account).filter(Boolean) as string[])).sort(), [transactions]);

  const getFilteredTransactions = (base: Transaction[], f: FilterState, isTxnTab: boolean) => {
    let r = [...base];
    if (currentUser?.role === 'user') {
      r = r.filter(t => t.userId === currentUser.id);
    }
    if (isTxnTab && searchQuery) {
      const q = searchQuery.toLowerCase(); 
      r = r.filter(t => 
        t.userName.toLowerCase().includes(q) || 
        (t.notes || '').toLowerCase().includes(q) || 
        (t.category || '').toLowerCase().includes(q) || 
        (t.vendor || '').toLowerCase().includes(q) ||
        (t.account || '').toLowerCase().includes(q)
      ); 
    }
    if (f.dateFrom) r = r.filter(t => new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) >= f.dateFrom);
    if (f.dateTo) r = r.filter(t => new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) <= f.dateTo);
    if (f.categories.length) r = r.filter(t => f.categories.includes(t.category));
    if (f.paymentTypes.length) r = r.filter(t => f.paymentTypes.includes(t.paymentType));
    if (f.types.length) r = r.filter(t => f.types.includes(t.type));
    if (f.classifications.length) r = r.filter(t => { const c = t.classification || CATEGORY_CLASSIFICATION[t.category] || 'variable'; return f.classifications.includes(c); });
    if (f.statuses.length) r = r.filter(t => f.statuses.includes(t.status));
    if (f.accounts?.length) r = r.filter(t => t.account && f.accounts.includes(t.account));
    r.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || a.date).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || b.date).getTime();
      return timeB - timeA;
    });
    return r;
  };

  const dashboardTransactions = useMemo(() => getFilteredTransactions(transactions, dashboardFilters, false), [transactions, dashboardFilters, currentUser]);
  const filteredTransactions = useMemo(() => getFilteredTransactions(transactions, txnFilters, true), [transactions, txnFilters, searchQuery, currentUser]);

  const stats = useMemo(() => calculateStats(dashboardTransactions), [dashboardTransactions]);
  const insights = useMemo(() => generateAIInsights(dashboardTransactions), [dashboardTransactions]);

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const periodSummary = useMemo(() => getPeriodSummary(filteredTransactions, txnFilters.datePreset), [filteredTransactions, txnFilters.datePreset]);

  const handleApprove = useCallback((id: string) => { updateTransactionInDb(id, { status: 'approved' }); }, []);
  const handleReject = useCallback((id: string) => { updateTransactionInDb(id, { status: 'rejected' }); }, []);
  const handleDelete = useCallback((id: string) => { deleteTransactionFromDb(id); }, []);

  const handleClearData = (options: { from?: string, to?: string, all?: boolean }) => {
    if (options.all) {
      transactions.forEach(t => deleteTransactionFromDb(t.id));
      localStorage.removeItem(STORAGE_KEY);
    } else if (options.from && options.to) {
      transactions.filter(t => {
        const d = t.date.split('T')[0];
        return d >= options.from! && d <= options.to!;
      }).forEach(t => deleteTransactionFromDb(t.id));
    }
    setShowClearModal(false);
    alert('Data purge completed.');
  };

  const handleEdit = useCallback((id: string, updates: Partial<Transaction>) => {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;
    const edits: EditRecord[] = [];
    Object.entries(updates).forEach(([k, v]) => { const old = (txn as any)[k]; if (old !== undefined && String(old) !== String(v)) edits.push({ field: k, oldValue: String(old), newValue: String(v), timestamp: new Date().toISOString() }); });
    if (updates.date && !updates.date.includes('T')) updates.date = new Date(updates.date).toISOString();
    updateTransactionInDb(id, { ...updates, editHistory: [...(txn.editHistory || []), ...edits], updatedAt: new Date().toISOString() });
  }, [transactions]);

  const handleAddTransaction = useCallback((t: Partial<Transaction>) => {
    const now = nowIST();
    const entry: any = { id: Math.random().toString(36).substr(2, 9), userId: currentUser?.id || '1', userName: currentUser?.name || 'Admin', status: currentUser?.role === 'admin' ? 'approved' : 'pending', type: 'expense', amount: 0, date: now, category: 'misc', paymentType: 'cash', createdAt: now, vendor: t.category, ...t };
    Object.keys(entry).forEach(key => { if (entry[key] === undefined) delete entry[key]; });
    addTransactionToDb(entry as Transaction);
  }, [currentUser]);

  const handleDrillDown = useCallback((cat: string) => { setTxnFilters(f => ({...f, categories: [cat]})); setActiveTab('transactions'); }, []);

  const handleDownload = (start: string, end: string) => {
    console.log('[CafeFlow] Step 1: Statement Generation Triggered for:', start, 'to', end);
    if (!currentUser) {
      console.error('[CafeFlow] Error: No current user found.');
      return;
    }
    const filtered = transactions.filter(t => {
      const d = t.date.split('T')[0];
      return d >= start && d <= end;
    });
    console.log('[CafeFlow] Step 2: Filtered transactions count:', filtered.length);
    const label = `${new Date(start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${new Date(end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
    try {
      generateTransactionStatement(filtered, currentUser, label, 'CafeFlow');
      console.log('[CafeFlow] Step 3: PDF generation function called successfully.');
    } catch (e) {
      console.error('[CafeFlow] Step 3: PDF generation failed:', e);
    }
    setShowDownloadModal(false);
  };

  const renderContent = () => {
    const tab = activeTab === 'add' ? 'dashboard' : activeTab;
    switch (tab) {
      case 'dashboard':
        return (
          <div className="screen animate-in">
            {/* Header */}
            <div className="screen-header" style={{ paddingBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', fontWeight: 400, marginBottom: '0.125rem' }}>your restaurant</p>
                <h1 style={{ fontSize: '1.625rem', fontWeight: 600, margin: 0, letterSpacing: '-0.03em' }}>
                  CafeFlow
                </h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={() => setShowDashboardFilters(true)} 
                  style={{ background: 'var(--bg-2)', border: 'none', borderRadius: 'var(--radius-full)', padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                   {dashboardFilters.datePreset === 'all' ? 'all time' : dashboardFilters.datePreset.replace('_', ' ')} <ChevronDown size={12} />
                </button>
                <button onClick={() => setActiveTab('settings')} className="theme-btn" aria-label="Settings" style={{ border: 'none', padding: 0 }}>
                  <img src={`https://ui-avatars.com/api/?name=${currentUser?.name}&background=random`} alt="User" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                </button>
              </div>
            </div>
            
            {/* Today Snapshot mini-card */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, padding: '0.75rem', background: 'var(--green-soft)', borderRadius: 'var(--radius-m)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.625rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>today in</span>
                <span className="mono" style={{ fontSize: '1.125rem', color: 'var(--green)', fontWeight: 500 }}>{formatINR(todaySnapshot.sales)}</span>
              </div>
              <div style={{ flex: 1, padding: '0.75rem', background: 'var(--red-soft)', borderRadius: 'var(--radius-m)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.625rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>today out</span>
                <span className="mono" style={{ fontSize: '1.125rem', color: 'var(--red)', fontWeight: 500 }}>{formatINR(todaySnapshot.expenses)}</span>
              </div>
            </div>

            <StatCards stats={stats} role={currentUser?.role || 'user'} />
            
            {currentUser?.role === 'admin' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-strong)' }}>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>available cash</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--green)' }}>{formatINR(stats.availableCash)}</p>
                </div>
                <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-strong)' }}>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>net profit</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: stats.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatINR(stats.netProfit)}</p>
                </div>
              </div>
            )}
            <SalesChart transactions={transactions} />
            <AIInsights insights={insights} />

            <div style={{ paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <p className="section-label" style={{ margin: 0 }}>recent payments</p>
                <button onClick={() => setActiveTab('transactions')} style={{ background: 'none', border: 'none', fontSize: '0.6875rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.375rem 0' }}>
                  view all <ChevronRight size={11} />
                </button>
              </div>
              <TransactionList
                transactions={filteredTransactions.slice(0, 4)}
                onApprove={handleApprove} onReject={handleReject}
                onDelete={handleDelete} onEdit={handleEdit}
                role={currentUser?.role || 'user'}
              />
            </div>
          </div>
        );

      case 'transactions':
        return (
          <div className="screen animate-in">
            <div className="screen-header" style={{ paddingBottom: '0.875rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>payment history</h1>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button onClick={() => setShowDownloadModal(true)} className="theme-btn" aria-label="Export PDF" style={{ width: '28px', height: '28px' }}>
                  <Download size={13} />
                </button>
                <button onClick={() => setSearchQuery(q => q ? '' : ' ')} className="theme-btn" style={{ width: '28px', height: '28px' }}>
                  <Search size={13} />
                </button>
              </div>
            </div>

            {searchQuery !== '' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-full)', padding: '0.5rem 0.875rem', marginBottom: '1rem' }}>
                <Search size={14} color="var(--text-3)" />
                <input type="text" placeholder="search accounts, notes, vendors..." autoFocus value={searchQuery.trim()} onChange={e => setSearchQuery(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-0)', fontSize: '0.8125rem', flex: 1, fontFamily: 'inherit' }} />
              </div>
            )}

            {/* CRED-style Inline Filter Pills */}
            <div style={{ position: 'relative', zIndex: 10 }}>
              <div className="scroll-x" style={{ gap: '0.375rem', marginBottom: activeDropdown ? '0.75rem' : '1.75rem', paddingBottom: '0.25rem' }}>
                <button className="chip" onClick={() => setShowTxnFilters(true)}>
                  <SlidersHorizontal size={12} /> filter <ChevronDown size={12} />
                </button>
                
                <button 
                  className={`chip ${txnFilters.categories.length ? 'active' : ''}`}
                  onClick={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
                >
                  category <ChevronDown size={12} />
                </button>
                
                <button 
                  className={`chip ${txnFilters.statuses.length ? 'active' : ''}`}
                  onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                >
                  status <ChevronDown size={12} />
                </button>
                
                <button 
                  className={`chip ${txnFilters.paymentTypes.length ? 'active' : ''}`}
                  onClick={() => setActiveDropdown(activeDropdown === 'payment' ? null : 'payment')}
                >
                  payment method <ChevronDown size={12} />
                </button>
              </div>

              {/* Accordion Filter Options (renders completely outside the scroll clipping) */}
              {activeDropdown === 'category' && (
                <div className="animate-in" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem', padding: '0 0.25rem' }}>
                  <button onClick={() => { setTxnFilters(f => ({...f, categories: []})); }} className={`chip ${txnFilters.categories.length === 0 ? 'active' : ''}`}>all categories</button>
                  {availableTags.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setTxnFilters(f => ({...f, categories: f.categories.includes(tag) ? f.categories.filter(c => c !== tag) : [...f.categories, tag]}))}
                      className={`chip ${txnFilters.categories.includes(tag) ? 'active' : ''}`}
                    >
                      {tag}
                      {txnFilters.categories.includes(tag) && <CheckCircle2 size={12} />}
                    </button>
                  ))}
                </div>
              )}

              {activeDropdown === 'status' && (
                <div className="animate-in" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem', padding: '0 0.25rem' }}>
                  <button onClick={() => { setTxnFilters(f => ({...f, statuses: []})); }} className={`chip ${txnFilters.statuses.length === 0 ? 'active' : ''}`}>all statuses</button>
                  {['pending', 'approved', 'rejected'].map(st => (
                    <button 
                      key={st}
                      onClick={() => setTxnFilters(f => ({...f, statuses: f.statuses.includes(st as any) ? f.statuses.filter(s => s !== st) : [...f.statuses, st as any]}))}
                      className={`chip ${txnFilters.statuses.includes(st as any) ? 'active' : ''}`} style={{ textTransform: 'lowercase' }}
                    >
                      {st}
                      {txnFilters.statuses.includes(st as any) && <CheckCircle2 size={12} />}
                    </button>
                  ))}
                </div>
              )}

              {activeDropdown === 'payment' && (
                <div className="animate-in" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem', padding: '0 0.25rem' }}>
                   <button onClick={() => { setTxnFilters(f => ({...f, paymentTypes: []})); }} className={`chip ${txnFilters.paymentTypes.length === 0 ? 'active' : ''}`}>all methods</button>
                  {['cash', 'upi', 'bank', 'other'].map(pt => (
                    <button 
                      key={pt}
                      onClick={() => setTxnFilters(f => ({...f, paymentTypes: f.paymentTypes.includes(pt as any) ? f.paymentTypes.filter(p => p !== pt) : [...f.paymentTypes, pt as any]}))}
                      className={`chip ${txnFilters.paymentTypes.includes(pt as any) ? 'active' : ''}`} style={{ textTransform: 'lowercase' }}
                    >
                      {pt}
                      {txnFilters.paymentTypes.includes(pt as any) && <CheckCircle2 size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Summary card inside transactions */}
            {!txnFilters.categories.length && !txnFilters.statuses.length && !txnFilters.paymentTypes.length && !searchQuery && (
              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-m)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>overview • {periodSummary.label}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--green)', display: 'block' }}>+{formatINR(periodSummary.totalIn)} in</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-0)', display: 'block', marginTop: '0.125rem' }}>-{formatINR(periodSummary.totalOut)} out</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.125rem' }}>net position</span>
                    <span className="mono" style={{ fontSize: '1.125rem', fontWeight: 500, color: periodSummary.net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {formatINR(periodSummary.net)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <TransactionList
              transactions={filteredTransactions}
              onApprove={handleApprove} onReject={handleReject}
              onDelete={handleDelete} onEdit={handleEdit}
              role={currentUser?.role || 'user'}
            />
            <div style={{ height: '2rem' }} />
          </div>
        );

      case 'analytics':
        return (
          <div className="screen animate-in">
            <div className="screen-header">
              <h1 style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>analytics</h1>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => generateMonthlyReport(transactions, stats, dashboardFilters.datePreset, 'CafeFlow')} 
                  className="theme-btn" 
                  aria-label="Download PDF" 
                  style={{ background: 'var(--green-soft)', color: 'var(--green)', border: 'none', padding: '0.5rem', borderRadius: '50%' }}
                >
                  <FileText size={14} />
                </button>
                <button onClick={() => setShowDownloadModal(true)} className="theme-btn" aria-label="Export PDF" style={{ width: '28px', height: '28px', border: 'none' }}>
                  <Download size={14} />
                </button>
              </div>
            </div>
            <TagAnalytics transactions={transactions} onDrillDown={handleDrillDown} />
          </div>
        );

      case 'chat':
        if (currentUser?.role !== 'admin') {
          setActiveTab('dashboard');
          return null;
        }
        return (
          <div className="screen animate-in" style={{ padding: '0 1.25rem 0.5rem' }}>
            <div className="screen-header" style={{ paddingBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>finance assistant</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                 <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: geminiApiKey ? 'var(--green)' : 'var(--yellow)' }} />
                 <span style={{ fontSize: '0.6875rem', color: geminiApiKey ? 'var(--green)' : 'var(--yellow)', fontWeight: 500 }}>
                   {geminiApiKey ? 'gemini online' : 'llm offline'}
                 </span>
              </div>
            </div>
            <AIChatbot onAddTransaction={handleAddTransaction} currentUser={currentUser} transactions={transactions} apiKey={geminiApiKey} />
          </div>
        );

      case 'settings':
        return (
          <div className="screen animate-in">
            <div className="screen-header">
              <button onClick={() => setActiveTab('dashboard')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', padding: '0', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={18} style={{ transform: 'rotate(180deg)', marginRight: '0.5rem' }} />
                <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>account</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', paddingTop: '1rem' }}>
              <img src={`https://ui-avatars.com/api/?name=${currentUser?.name}&background=random&size=64`} alt="User" style={{ borderRadius: '50%' }} />
              <div>
                <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.125rem', fontWeight: 500 }}>{currentUser?.name}</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', margin: 0 }}>{currentUser?.email} · {currentUser?.role}</p>
              </div>
            </div>

            <p className="section-label">ai integrations</p>
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, margin: '0 0 0.5rem' }}>gemini api key</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
                required for AI parsing &amp; chat. get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>Google AI Studio</a>.
              </p>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showApiKey ? 'text' : 'password'}
                  className="input" 
                  placeholder="AIzaSy..." 
                  value={geminiApiKey} 
                  onChange={e => {
                    const k = e.target.value;
                    setGeminiApiKey(k);
                    if (currentUser?.role === 'admin') updateAppSettingsInDb({ geminiApiKey: k });
                  }}
                  autoCorrect="off" autoCapitalize="off" spellCheck={false}
                  style={{ padding: '0.625rem 2.5rem 0.625rem 0.75rem', fontSize: '0.8125rem', fontFamily: geminiApiKey && !showApiKey ? 'monospace' : 'inherit' }}
                />
                <button
                  onClick={() => setShowApiKey(v => !v)}
                  style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', padding: '0.25rem', display: 'flex' }}
                  aria-label={showApiKey ? 'Hide key' : 'Show key'}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem', alignItems: 'center' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: geminiApiKey ? 'var(--green)' : 'var(--yellow)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.6875rem', color: geminiApiKey ? 'var(--green)' : 'var(--yellow)' }}>
                  {geminiApiKey ? 'key configured — gemini AI active' : 'no key — local analytics only'}
                </span>
              </div>
            </div>

            <p className="section-label">user profile</p>
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>{currentUser?.name}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: '0.125rem 0 0' }}>{currentUser?.email} • {currentUser?.role}</p>
              </div>
              <button onClick={handleLogout} className="btn-ghost" style={{ fontSize: '0.75rem', color: 'var(--red)' }}>logout</button>
            </div>

            <p className="section-label">security</p>
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0 }}>App PIN</p>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-3)' }}>Current PIN: {currentUser?.pin}</p>
              </div>
              <button 
                onClick={() => {
                  const np = prompt('Enter new 4-digit PIN:');
                  if (np && np.length === 4 && currentUser) {
                    updateUserInDb({ ...currentUser, pin: np });
                    setCurrentUser({ ...currentUser, pin: np });
                    alert('PIN updated. Please use new PIN for future logins.');
                  }
                }} 
                className="btn-ghost" style={{ fontSize: '0.75rem', color: 'var(--green)' }}
              >
                change
              </button>
            </div>

            {currentUser?.role === 'admin' && (
              <>
                <p className="section-label">staff management</p>
                <div className="card" style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}>
                  {users.filter(u => u.id !== currentUser.id).map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0 }}>{u.name}</p>
                        <p style={{ fontSize: '0.625rem', color: 'var(--text-3)' }}>PIN: {u.pin} • {u.role}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            const np = prompt(`Reset PIN for ${u.name}:`);
                            if(np && np.length === 4) updateUserInDb({ ...u, pin: np });
                          }}
                          className="btn-ghost" 
                          style={{ color: 'var(--blue)', fontSize: '0.75rem' }}
                        >
                          reset PIN
                        </button>
                        <button 
                          onClick={() => { if(confirm('Remove this user?')) deleteUserFromDb(u.id); }} 
                          className="btn-ghost" 
                          style={{ color: 'var(--red)', fontSize: '0.75rem' }}
                        >
                          remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const name = prompt('Enter staff name:');
                      const pin = prompt('Enter 4-digit PIN:');
                      if(name && pin && pin.length === 4) {
                        updateUserInDb({ id: Date.now().toString(), name, email: `${name.toLowerCase()}@cafe.com`, role: 'user', pin });
                      }
                    }}
                    style={{ width: '100%', padding: '0.75rem', background: 'none', border: 'none', color: 'var(--green)', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    + add new staff member
                  </button>
                </div>
              </>
            )}

            <p className="section-label">preferences</p>
            <div className="card" style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0 }}>app theme</p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: '0.125rem 0 0' }}>currently {theme}</p>
                </div>
                <button onClick={toggleTheme} className="theme-btn">
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
              </div>
            </div>

            <p className="section-label">data management</p>
            <div className="card" style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-1)' }}>total records</span>
                <span className="mono" style={{ fontSize: '0.8125rem' }}>{transactions.length} entries</span>
              </div>
              <div className="divider" style={{ margin: '0' }} />
              <button 
                onClick={() => setShowDownloadModal(true)} 
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '1rem 0', background: 'none', border: 'none', color: 'var(--text-1)', fontSize: '0.8125rem', alignItems: 'center' }}
              >
                download transaction statement (PDF) <Download size={14} />
              </button>
              <div className="divider" style={{ margin: '0' }} />
              <button
                onClick={() => setShowClearModal(true)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', fontSize: '0.8125rem', color: 'var(--red)', padding: '1rem 0' }}
              >
                granular data purge (reset)
              </button>
            </div>

            <p className="section-label">about</p>
             {versions.slice(0, 1).map(v => (
              <div key={v.version} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>CafeFlow v{v.version}</span>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-3)' }}>{v.date}</span>
                </div>
                <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                  {v.changelog.map((l, i) => (
                    <li key={i} style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '0.2rem', lineHeight: 1.45 }}>{l}</li>
                  ))}
                </ul>
              </div>
            ))}
            
            <div style={{ height: '4rem' }} />
          </div>
        );

      default: return null;
    }
  };

  if (!isDbReady) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)' }}>
        <div className="loader spin" style={{ width: '2rem', height: '2rem', border: '3px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%' }} />
        <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-3)', letterSpacing: '0.05em' }}>syncing to cloud...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {renderContent()}
      <BottomNav
        activeTab={activeTab === 'add' ? 'dashboard' : activeTab}
        setActiveTab={tab => { if (tab === 'add') setShowQuickAdd(true); else setActiveTab(tab); }}
        pendingCount={pendingCount}
        isAdmin={currentUser?.role === 'admin'}
      />
      {showQuickAdd && (
        <QuickAdd 
          onClose={() => setShowQuickAdd(false)} 
          onAdd={(t) => {
            handleAddTransaction(t);
            setShowQuickAdd(false);
          }}
        />
      )}
      {showTxnFilters && <FilterPanel filters={txnFilters} onApply={setTxnFilters} onClose={() => setShowTxnFilters(false)} availableTags={availableTags} availableAccounts={availableAccounts} />}
      {showDashboardFilters && <FilterPanel mode="dashboard" filters={dashboardFilters} onApply={setDashboardFilters} onClose={() => setShowDashboardFilters(false)} availableTags={availableTags} availableAccounts={availableAccounts} />}
      {showDownloadModal && currentUser && (
        <DownloadStatementModal 
          onClose={() => setShowDownloadModal(false)}
          onDownload={handleDownload}
        />
      )}
      {showClearModal && (
        <ClearDataModal 
          onClose={() => setShowClearModal(false)}
          onClear={handleClearData}
        />
      )}

    </div>
  );
};

export default App;
