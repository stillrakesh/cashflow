import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
// Deployment: v4.0.0 — Multi-Tenant SaaS

import BottomNav from './components/layout/BottomNav';
import StatCards from './components/dashboard/StatCards';
import SalesChart from './components/dashboard/SalesChart';
import AIInsights from './components/dashboard/AIInsights';
import TransactionList from './components/transactions/TransactionTable';
import AIChatbot from './components/dashboard/AIChatbot';
import TagAnalytics from './components/dashboard/TagAnalytics';
import QuickAdd from './components/transactions/QuickAdd';
import ShiftManager from './components/dashboard/ShiftManager';
import ShiftLogs from './components/dashboard/ShiftLogs';
import AccountsOverview from './components/dashboard/AccountsOverview';
import FilterPanel from './components/shared/FilterPanel';
import PendingApprovals from './components/dashboard/PendingApprovals';
import DailyClosing from './components/dashboard/DailyClosing';
import ReportsHub from './components/dashboard/ReportsHub';
import VendorLedger from './components/vendors/VendorLedger';
import CategoryManager from './components/settings/CategoryManager';
import RecurringManager from './components/settings/RecurringManager';
import Login from './components/auth/Login';
import ClearDataModal from './components/shared/ClearDataModal';
import DownloadStatementModal from './components/shared/DownloadStatementModal';
import { versions } from './utils/mockData';
import { calculateStats, generateAIInsights, formatINR, getTodaySnapshot, getPeriodSummary } from './utils/financeUtils';
import { CATEGORY_CLASSIFICATION } from './types';
import type { Transaction, User, Organization, FilterState, ThemeMode, EditRecord, Shift, OpeningBalances, DailyReport, Vendor, CategoryConfig, OrganizationSettings, RecurringExpense } from './types';
import { 
  Search, SlidersHorizontal, ChevronDown, Download, CheckCircle2, FileText,
  Database, Upload, Lock as LockIcon, Bell, ChevronRight, Eye, EyeOff, Sun, Moon,
  Wallet, Truck, MessageCircle, X
} from 'lucide-react';
import { generateMonthlyReportPDF, generateTransactionStatement } from './utils/pdfUtils';
import { 
  listenToTransactions, addTransactionToDb, 
  updateTransactionInDb, deleteTransactionFromDb,
  listenToOrgMembers, addOrgMember, updateOrgMember, deleteOrgMember,
  listenToOrgSettings, updateOrgSettings, DEFAULT_CATEGORIES,
  listenToOrganization, createOrganization, migrateExistingData, deleteOrganization,
  listenToActiveShift, startShift, endShift,
  saveDailyReport, listenToDailyReports, deleteDailyReport,
  listenToVendors, saveVendor, deleteVendor,
  getCompleteOrgData, restoreCompleteOrgData,
  listenToRecurringExpenses, saveRecurringExpense, deleteRecurringExpense, updateRecurringExpense
} from './lib/db';

const THEME_KEY = 'cafeflow_theme';
const CURRENT_USER_SESSION_KEY = 'cafeflow_logged_in_user';
const CURRENT_ORG_SESSION_KEY = 'cafeflow_current_org_id';

// Returns the current UTC ISO string for storage.
// Display formatting (IST) is handled separately in the UI layer with timeZone: 'Asia/Kolkata'.
const nowIST = (): string => new Date().toISOString();

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'dark');
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem(THEME_KEY, theme); }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const [isDbReady, setIsDbReady] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showRecurringManager, setShowRecurringManager] = useState(false);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalances>({ Cash: 0, UPI: 0, Bank: 0 });
  const [customCategories, setCustomCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [appFeatures, setAppFeatures] = useState<{enableShifts?: boolean}>({ enableShifts: false });
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [pendingRecurringTxn, setPendingRecurringTxn] = useState<Partial<Transaction> | null>(null);
  const [activeRecurringId, setActiveRecurringId] = useState<string | null>(null);
  const unsubscribesRef = useRef<(() => void)[]>([]);

  // Restore session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const s = sessionStorage.getItem(CURRENT_USER_SESSION_KEY);
    return s ? JSON.parse(s) : null;
  });
  const [currentOrgId, setCurrentOrgId] = useState<string>(() => {
    return sessionStorage.getItem(CURRENT_ORG_SESSION_KEY) || '';
  });

  // Run one-time migration on mount
  useEffect(() => {
    migrateExistingData().then(result => {
      if (result) {
        console.log('[CafeFlow] Legacy data migrated to org:', result.orgId);
      }
      // If we have a saved session, mark as ready to connect listeners
      if (!currentOrgId) {
        setIsDbReady(true); // No org = show login
      }
    }).catch(err => {
      console.error('[CafeFlow] Migration error:', err);
      setIsDbReady(true);
    });
  }, []);

  // Start listeners when we have an orgId
  useEffect(() => {
    if (!currentOrgId) return;
    
    // Clean up previous listeners
    unsubscribesRef.current.forEach(fn => fn());
    unsubscribesRef.current = [];
    
    const unsubOrg = listenToOrganization(currentOrgId, (org) => {
      setCurrentOrg(org);
    });
    unsubscribesRef.current.push(unsubOrg);
    
    const unsubMembers = listenToOrgMembers(currentOrgId, (fetchedUsers) => {
      setUsers(fetchedUsers);
    });
    unsubscribesRef.current.push(unsubMembers);
    
    const unsubTxns = listenToTransactions(currentOrgId, (fetchedTxns) => {
      setTransactions(fetchedTxns);
      setIsDbReady(true);
    });
    unsubscribesRef.current.push(unsubTxns);

    const unsubReports = listenToDailyReports(currentOrgId, setDailyReports);
    unsubscribesRef.current.push(unsubReports);

    const unsubVendors = listenToVendors(currentOrgId, setVendors);
    unsubscribesRef.current.push(unsubVendors);

    const unsubRecurring = listenToRecurringExpenses(currentOrgId, setRecurringExpenses);
    unsubscribesRef.current.push(unsubRecurring);
    
    const unsubSettings = listenToOrgSettings(currentOrgId, (settings: Partial<OrganizationSettings>) => {
      if (settings) {
        setGeminiApiKey(settings.geminiApiKey || '');
        setOpeningBalances(settings.openingBalances || { Cash: 0, UPI: 0, Bank: 0 });
        setCustomCategories(settings.categories || DEFAULT_CATEGORIES);
        setAppFeatures(settings.features || { enableShifts: false });
      } else {
        setGeminiApiKey('');
        setOpeningBalances({ Cash: 0, UPI: 0, Bank: 0 });
        setCustomCategories(DEFAULT_CATEGORIES);
        setAppFeatures({ enableShifts: false });
      }
    });
    unsubscribesRef.current.push(unsubSettings);

    if (currentUser) {
      const unsubShift = listenToActiveShift(currentOrgId, currentUser.id, (shift) => {
        setActiveShift(shift);
      });
      unsubscribesRef.current.push(unsubShift);
    }
    
    // If no transactions yet, mark ready after a short timeout
    const readyTimeout = setTimeout(() => setIsDbReady(true), 2000);
    
    return () => {
      clearTimeout(readyTimeout);
      unsubscribesRef.current.forEach(fn => fn());
      unsubscribesRef.current = [];
    };
  }, [currentOrgId, currentUser?.id]);

  const handleLogin = (u: User, orgId: string) => {
    setCurrentUser(u);
    setCurrentOrgId(orgId);
    sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(u));
    sessionStorage.setItem(CURRENT_ORG_SESSION_KEY, orgId);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentOrg(null);
    setCurrentOrgId('');
    setActiveShift(null);
    setUsers([]);
    setTransactions([]);
    sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
    sessionStorage.removeItem(CURRENT_ORG_SESSION_KEY);
    setActiveTab('dashboard');
  };

  const [activeTab, setActiveTab] = useState('dashboard');

  const [showDashboardFilters, setShowDashboardFilters] = useState(false);
  const [showTxnFilters, setShowTxnFilters] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'category' | 'status' | 'payment' | null>(null);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', username: '' });

  const [searchQuery, setSearchQuery] = useState('');
  
  const [dashboardFilters, setDashboardFilters] = useState<FilterState>({
    dateFrom: '', dateTo: '', categories: [], paymentTypes: [], types: [], classifications: [], statuses: [], accounts: [], vendors: [], searchQuery: '', datePreset: 'this_month'
  });
  
  const [txnFilters, setTxnFilters] = useState<FilterState>({
    dateFrom: '', dateTo: '', categories: [], paymentTypes: [], types: [], classifications: [], statuses: [], accounts: [], vendors: [], searchQuery: '', datePreset: 'this_month'
  });

  // Calculate after the dashboardTransactions are memoized, so move todaySnapshot down!
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
    if (f.vendors?.length) r = r.filter(t => t.vendor && f.vendors.includes(t.vendor));
    r.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || a.date).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || b.date).getTime();
      return timeB - timeA;
    });
    return r;
  };

  const dashboardTransactions = useMemo(() => getFilteredTransactions(transactions, dashboardFilters, false), [transactions, dashboardFilters, currentUser]);
  const filteredTransactions = useMemo(() => getFilteredTransactions(transactions, txnFilters, true), [transactions, txnFilters, searchQuery, currentUser]);

  const todaySnapshot = useMemo(() => getTodaySnapshot(dashboardTransactions), [dashboardTransactions]);

  const stats = useMemo(() => calculateStats(dashboardTransactions, customCategories, openingBalances), [dashboardTransactions, customCategories, openingBalances]);
  const insights = useMemo(() => generateAIInsights(dashboardTransactions, transactions), [dashboardTransactions, transactions]);

  const dueRecurring = useMemo(() => {
    if (!recurringExpenses.length) return [];
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    return recurringExpenses.filter(rec => {
      if (rec.status !== 'active') return false;
      if (rec.lastCreatedDate === todayStr) return false;

      if (rec.frequency === 'monthly') {
        return today.getDate() === rec.dayOfMonth;
      } else if (rec.frequency === 'weekly') {
        return today.getDay() === rec.dayOfWeek;
      }
      return false;
    });
  }, [recurringExpenses]);

  const accountBalances = useMemo(() => {
    // Start with all accounts defined in openingBalances
    const bals: Record<string, number> = {};
    Object.keys(openingBalances).forEach(acc => {
      bals[acc] = openingBalances[acc] || 0;
    });

    transactions.forEach(t => {
      if (t.status !== 'approved' || !t.account) return;
      const acc = t.account;
      
      // If we encounter a transaction for an account not in openingBalances, initialize it at 0
      if (bals[acc] === undefined) bals[acc] = 0;

      if (t.type === 'sale') bals[acc] += t.amount;
      else bals[acc] -= t.amount;
    });
    return bals;
  }, [transactions, openingBalances]);

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const isDateLocked = useCallback((dateStr: string) => {
    const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return dailyReports.some(r => r.id === d);
  }, [dailyReports]);
  const handleSaveDailyReport = async (report: DailyReport) => {
    if (!currentOrgId) return;
    await saveDailyReport(currentOrgId, report);
  };

  const handleDeleteDailyReport = async (reportId: string) => {
    if (!currentOrgId || !confirm('Are you sure you want to delete this report? This will UNLOCK the transactions for that date.')) return;
    await deleteDailyReport(currentOrgId, reportId);
  };

  const periodSummary = useMemo(() => getPeriodSummary(filteredTransactions, txnFilters.datePreset), [filteredTransactions, txnFilters.datePreset]);

  const handleApprove = useCallback((id: string) => { if (currentOrgId) updateTransactionInDb(currentOrgId, id, { status: 'approved' }); }, [currentOrgId]);
  const handleReject = useCallback((id: string, comment?: string) => { 
    if (currentOrgId) updateTransactionInDb(currentOrgId, id, { status: 'rejected', adminComment: comment }); 
  }, [currentOrgId]);
  const handleDelete = useCallback((id: string) => { 
    if (!currentOrgId) return; 
    const txn = transactions.find(t => t.id === id);
    if (txn && isDateLocked(txn.date) && currentUser?.role !== 'admin') {
      alert('This day has been closed. Only admins can delete closed entries.');
      return;
    }
    deleteTransactionFromDb(currentOrgId, id); 
  }, [currentOrgId, transactions, isDateLocked, currentUser]);

  const handleClearData = (options: { from?: string, to?: string, all?: boolean }) => {
    if (!currentOrgId) return;
    if (options.all) {
      transactions.forEach(t => deleteTransactionFromDb(currentOrgId, t.id));
    } else if (options.from && options.to) {
      transactions.filter(t => {
        const d = t.date.split('T')[0];
        return d >= options.from! && d <= options.to!;
      }).forEach(t => deleteTransactionFromDb(currentOrgId, t.id));
    }
    setShowClearModal(false);
    alert('Data purge completed.');
  };

  const handleEdit = useCallback((id: string, updates: Partial<Transaction>) => {
    if (!currentOrgId) return;
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;

    if (isDateLocked(txn.date) && currentUser?.role !== 'admin') {
      alert('This day has been closed. Only admins can edit closed entries.');
      return;
    }

    const edits: EditRecord[] = [];
    Object.entries(updates).forEach(([k, v]) => { const old = (txn as any)[k]; if (old !== undefined && String(old) !== String(v)) edits.push({ field: k, oldValue: String(old), newValue: String(v), timestamp: new Date().toISOString() }); });
    if (updates.date && !updates.date.includes('T')) updates.date = new Date(updates.date).toISOString();
    updateTransactionInDb(currentOrgId, id, { ...updates, editHistory: [...(txn.editHistory || []), ...edits], updatedAt: new Date().toISOString() });
  }, [transactions, currentOrgId]);

  const handleAddTransaction = useCallback(async (t: Partial<Transaction>) => {
    if (!currentOrgId || !currentUser) return;
    const now = nowIST();
    const entry: any = { 
      id: Math.random().toString(36).substr(2, 9), 
      orgId: currentOrgId, 
      userId: currentUser.id, 
      userName: currentUser.username || currentUser.name || 'Staff', 
      status: currentUser.role === 'admin' ? 'approved' : 'pending', 
      type: 'expense', 
      amount: 0, 
      date: now, 
      category: 'misc', 
      paymentType: 'cash', 
      createdAt: now, 
      vendor: '', 
      ...t 
    };
    Object.keys(entry).forEach(key => { if (entry[key] === undefined) delete entry[key]; });
    
    try {
      await addTransactionToDb(currentOrgId, entry as Transaction);
      
      if (activeRecurringId) {
        await updateRecurringExpense(currentOrgId, activeRecurringId, {
          lastCreatedDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        });
        setActiveRecurringId(null);
      }
    } catch (err: any) {
      console.error('[CafeFlow] Transaction Save Error:', err);
      throw new Error(err.message || 'Failed to sync with cloud. Check internet connection.');
    }
  }, [currentUser, currentOrgId, activeRecurringId]);

  const handleReviewRecurring = (rec: RecurringExpense) => {
    setActiveRecurringId(rec.id);
    setPendingRecurringTxn({
      type: 'expense',
      amount: rec.amount,
      category: rec.category,
      notes: `Recurring: ${rec.name}`,
      classification: rec.classification as any,
      date: new Date().toISOString()
    });
    setShowQuickAdd(true);
  };

  const handleStartShift = async (startingCash: number) => {
    if (!currentOrgId || !currentUser) return;
    const shift: Shift = {
      id: Math.random().toString(36).substr(2, 9),
      orgId: currentOrgId,
      userId: currentUser.id,
      userName: currentUser.username || currentUser.name,
      status: 'open',
      startTime: nowIST(),
      startingCash
    };
    await startShift(currentOrgId, shift);
  };

  const handleEndShift = async (actualEndingCash: number) => {
    if (!currentOrgId || !activeShift) return;
    const shiftTxns = transactions.filter(t => 
      t.paymentType === 'cash' && 
      t.userId === activeShift.userId && 
      new Date(t.createdAt || t.date) >= new Date(activeShift.startTime)
    );
    let cashSales = 0; let cashExpenses = 0;
    shiftTxns.forEach(t => {
      if (t.type === 'sale') cashSales += t.amount;
      else cashExpenses += t.amount;
    });
    const expected = activeShift.startingCash + cashSales - cashExpenses;
    
    await endShift(currentOrgId, activeShift.id, {
      status: 'closed',
      endTime: nowIST(),
      actualEndingCash,
      expectedEndingCash: expected,
      discrepancy: actualEndingCash - expected
    });

    // Trigger EOD Report Share
    const eodText = `*CafeFlow EOD Report*\nDate: ${new Date().toLocaleDateString()}\nStaff: @${currentUser?.username || 'unknown'}\n------------------\nStarting Float: ${formatINR(activeShift.startingCash)}\nCash Sales: ${formatINR(cashSales)}\nCash Expenses: ${formatINR(cashExpenses)}\n------------------\nExpected: ${formatINR(expected)}\nActual: ${formatINR(actualEndingCash)}\nStatus: ${actualEndingCash === expected ? 'Balanced' : (actualEndingCash > expected ? 'OVER' : 'SHORT')}\n------------------\nSent via CafeFlow.`;

    if (navigator.share) {
      navigator.share({ title: 'EOD Report', text: eodText }).catch(() => {
        // Fallback to mailto
        window.location.href = `mailto:?subject=EOD Report - ${new Date().toLocaleDateString()}&body=${encodeURIComponent(eodText)}`;
      });
    } else {
      window.location.href = `mailto:?subject=EOD Report - ${new Date().toLocaleDateString()}&body=${encodeURIComponent(eodText)}`;
    }

    setActiveShift(null);
  };

  const handleExportData = async () => {
    if (!currentOrgId) return;
    try {
      const data = await getCompleteOrgData(currentOrgId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CafeFlow_Backup_${currentOrg?.name || 'Business'}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data.');
    }
  };

  const handleRestoreData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrgId) return;
    
    if (!confirm('WARNING: THIS WILL OVERWRITE CURRENT CLOUD DATA WITH THE BACKUP FILE. DO YOU WANT TO PROCEED?')) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        await restoreCompleteOrgData(currentOrgId, data);
        alert('Data restored successfully! The app will now reload.');
        window.location.reload();
      } catch (err) {
        console.error('Restore failed:', err);
        alert('Failed to restore data. Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !currentOrgId) return;
    if (currentUser.role === 'admin') {
      const conf = prompt('DANGER: This will PERMANENTLY ERASE your workspace, all transactions, and all staff. Type "DELETE" to confirm:');
      if (conf !== 'DELETE') return;
      
      await deleteOrganization(currentOrgId);
      handleLogout();
      alert('Workspace deleted successfully.');
    } else {
      const conf = confirm('Are you sure you want to remove your account from this workspace?');
      if (conf) {
        await deleteOrgMember(currentOrgId, currentUser.id);
        handleLogout();
      }
    }
  };

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

  const handleSaveOpeningBalances = (balances: OpeningBalances) => {
    updateOrgSettings(currentOrgId, { openingBalances: balances });
  };

  const handleSaveCategories = (categories: CategoryConfig[]) => {
    updateOrgSettings(currentOrgId, { categories });
    setShowCategoryManager(false);
  };

  const renderContent = () => {
    const isAdmin = currentUser?.role === 'admin';
    if (activeTab === 'closing') return <DailyClosing transactions={transactions} existingReports={dailyReports} onSaveReport={handleSaveDailyReport} onBack={() => setActiveTab('dashboard')} />;
    if (activeTab === 'reports') return (
      <ReportsHub 
        reports={dailyReports} 
        transactions={transactions}
        isAdmin={isAdmin} 
        onDeleteReport={handleDeleteDailyReport} 
        onBack={() => setActiveTab('dashboard')} 
        restaurantName={currentOrg?.name}
      />
    );

    const tab = activeTab === 'add' ? 'dashboard' : activeTab;
    switch (tab) {
      case 'dashboard':
        return (
          <div className="screen animate-in">
            {/* Header */}
            <div className="screen-header" style={{ alignItems: 'flex-start', paddingBottom: 'var(--spacing-section)' }}>
              <div>
                <p className="text-label" style={{ marginBottom: '0.125rem' }}>{currentOrg?.name || 'your cafe'}</p>
                <h1 className="text-title" style={{ fontSize: '1.5rem' }}>
                  @{currentUser?.username || 'user'}
                </h1>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <button 
                  onClick={() => setShowDashboardFilters(true)} 
                  className="btn-secondary"
                  style={{ height: '32px', padding: '0 8px', fontSize: '0.75rem', gap: '4px' }}
                >
                   {dashboardFilters.datePreset === 'all' ? 'all time' : dashboardFilters.datePreset.replace('_', ' ')} <ChevronDown size={12} />
                </button>
              </div>
            </div>

            {/* Dashboard Actions */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: 'var(--spacing-section)' }}>
              <button 
                onClick={() => setActiveTab('reports')} 
                className="btn-secondary" 
                style={{ flex: 1, height: '36px', gap: '0.5rem' }}
              >
                <FileText size={14} /> Reports
              </button>
              <button 
                onClick={() => setActiveTab('closing')} 
                className="btn-primary" 
                style={{ flex: 1, height: '36px', gap: '0.5rem' }}
              >
                <LockIcon size={14} /> Close Day
              </button>
            </div>
            
            <StatCards stats={stats} role={currentUser?.role || 'user'} todaySales={todaySnapshot.sales} todayExpenses={todaySnapshot.expenses} />

            {currentUser?.role === 'admin' && pendingCount > 0 && (
              <div 
                onClick={() => setActiveTab('approvals')}
                style={{ 
                  margin: '0', marginBottom: 'var(--spacing-section)', padding: 'var(--spacing-card)', background: '#FEF3C7', 
                  borderRadius: 'var(--radius-card)', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                  <p className="text-medium" style={{ margin: 0, fontSize: '0.875rem', color: '#92400E' }}>
                    {pendingCount} Pending Approvals
                  </p>
                </div>
                <ChevronRight size={16} color="#92400E" />
              </div>
            )}
            
            {currentUser?.role === 'admin' && (
              <>
                <SalesChart transactions={transactions} />
                <AIInsights insights={insights} />
                {appFeatures.enableShifts && <ShiftLogs orgId={currentOrgId} role={currentUser.role} />}
              </>
            )}
            
            {currentUser?.role !== 'admin' && appFeatures.enableShifts && (
              <ShiftManager 
                activeShift={activeShift} 
                onStartShift={handleStartShift} 
                onEndShift={handleEndShift} 
                role={currentUser?.role || 'user'} 
              />
            )}

            {currentUser?.role !== 'admin' && (
              <div className="card-secondary" style={{ marginBottom: 'var(--spacing-section)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', textAlign: 'center' }}>
                 <p className="text-regular" style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-3)' }}>Welcome to your shift. Tap below to log a new entry.</p>
                 <button onClick={() => setShowQuickAdd(true)} className="btn-primary">New Transaction</button>
              </div>
            )}

            <div style={{ paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <p className="section-label" style={{ margin: 0 }}>recent payments</p>
                <button onClick={() => setActiveTab('transactions')} className="btn-ghost" style={{ gap: '0.2rem' }}>
                  view all <ChevronRight size={11} />
                </button>
              </div>
              <TransactionList
                transactions={filteredTransactions.slice(0, 4)}
                onApprove={handleApprove} onReject={handleReject}
                onDelete={handleDelete} onEdit={handleEdit}
                role={currentUser?.role || 'user'}
                isDateLocked={isDateLocked}
                onAddClick={() => setShowQuickAdd(true)}
              />
            </div>
          </div>
        );
      
      case 'accounts':
        return (
          <div className="screen animate-in">
            <div className="screen-header" style={{ paddingBottom: '0.5rem' }}>
              <button onClick={() => setActiveTab('more')} className="btn-ghost" style={{ padding: '0.5rem 0.5rem 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-2)' }}>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> back
              </button>
            </div>
            <AccountsOverview transactions={transactions} openingBalances={openingBalances} />
          </div>
        );
      
      case 'approvals':
        return (
          <PendingApprovals 
            transactions={transactions} 
            onApprove={handleApprove} 
            onReject={handleReject} 
            onClose={() => setActiveTab('dashboard')}
          />
        );

      case 'transactions':
        return (
          <div className="screen animate-in">
            <div className="screen-header" style={{ paddingBottom: '0.875rem' }}>
              <h1 className="text-bold" style={{ fontSize: '1.25rem', margin: 0 }}>payment history</h1>
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
              isDateLocked={isDateLocked}
              onAddClick={() => setShowQuickAdd(true)}
            />
            <div style={{ height: '2rem' }} />
          </div>
        );

      case 'analytics':
        return (
          <div className="screen animate-in">
            <div className="screen-header">
              <h1 className="text-bold" style={{ fontSize: '1.25rem', margin: 0 }}>analytics</h1>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => generateMonthlyReportPDF(filteredTransactions, stats, dashboardFilters.datePreset, currentOrg?.name || 'CafeFlow')} 
                  className="theme-btn" 
                  aria-label="Download PDF" 
                  style={{ background: 'var(--green-soft)', color: 'var(--green)', border: 'none', padding: '0.5rem', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FileText size={14} />
                </button>
                <button onClick={() => setShowDownloadModal(true)} className="theme-btn" aria-label="Export PDF" style={{ width: '28px', height: '28px', border: 'none' }}>
                  <Download size={14} />
                </button>
              </div>
            </div>
            <TagAnalytics transactions={filteredTransactions} onDrillDown={handleDrillDown} categories={customCategories} />

            {/* Monthly Export Button */}
            <div style={{ marginTop: '1.5rem' }}>
              <button 
                className="btn-secondary" 
                style={{ width: '100%', gap: '0.5rem', justifyContent: 'center', padding: '1rem', borderStyle: 'dashed' }}
                onClick={() => generateMonthlyReportPDF(filteredTransactions, stats, dashboardFilters.datePreset, currentOrg?.name || 'CafeFlow')}
              >
                <Download size={18} /> download {dashboardFilters.datePreset.replace('_', ' ')} report (PDF)
              </button>
            </div>
            
            {/* Recurring Due Alerts */}
            {dueRecurring.length > 0 && (
              <div className="card animate-in" style={{ marginTop: '1.5rem', borderLeft: '4px solid var(--accent)', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'var(--accent-light)', padding: '0.5rem', borderRadius: '50%', color: 'var(--accent)' }}>
                    <Bell size={18} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>Recurring Expenses Due</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>{dueRecurring.length} items need your attention today.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dueRecurring.map(rec => (
                    <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-1)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{rec.name} ({formatINR(rec.amount)})</span>
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleReviewRecurring(rec)}>
                        review & add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem' }}>
              <AIInsights insights={insights} />
            </div>
          </div>
        );

      case 'vendors':
        return (
          <div className="screen animate-in">
            <div className="screen-header" style={{ paddingBottom: '0.5rem' }}>
              <button onClick={() => setActiveTab('more')} className="btn-ghost" style={{ padding: '0.5rem 0.5rem 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-2)' }}>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> back
              </button>
            </div>
            <VendorLedger 
              vendors={vendors} 
              transactions={transactions} 
              orgId={currentOrgId}
              onSaveVendor={async (v) => { if (currentOrgId) await saveVendor(currentOrgId, v); }}
              onDeleteVendor={async (vid) => { if (currentOrgId) await deleteVendor(currentOrgId, vid); }}
            />
          </div>
        );

      case 'chat':
        if (currentUser?.role !== 'admin') {
          setActiveTab('dashboard');
          return null;
        }
        return (
          <div className="screen animate-in" style={{ padding: '0 1.25rem 0.5rem' }}>
            <div className="screen-header" style={{ paddingBottom: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <button onClick={() => setActiveTab('more')} className="btn-ghost" style={{ padding: '0', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-2)' }}>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> back
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <h1 className="text-title" style={{ fontSize: '1.25rem' }}>finance assistant</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                   <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: geminiApiKey ? 'var(--green)' : 'var(--yellow)' }} />
                   <span style={{ fontSize: '0.6875rem', color: geminiApiKey ? 'var(--green)' : 'var(--yellow)', fontWeight: 500 }}>
                     {geminiApiKey ? 'gemini online' : 'llm offline'}
                   </span>
                </div>
              </div>
            </div>
            <AIChatbot onAddTransaction={handleAddTransaction} currentUser={currentUser} transactions={transactions} apiKey={geminiApiKey} />
          </div>
        );

      case 'more':
        return (
          <div className="screen animate-in">
            <div className="screen-header">
              <h1 className="text-title" style={{ fontSize: '1.25rem' }}>more</h1>
            </div>

            <p className="section-label">app modules</p>
            <div className="card" style={{ marginBottom: 'var(--spacing-section)', padding: 'var(--spacing-card)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <button 
                onClick={() => setActiveTab('accounts')}
                className="btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.875rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-1)' }}>
                  <Wallet size={16} /> Accounts & Balances
                </div>
                <ChevronRight size={16} color="var(--text-3)" />
              </button>
              
              {currentUser?.role === 'admin' && (
                <>
                  <button 
                    onClick={() => setActiveTab('vendors')}
                    className="btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.875rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-1)' }}>
                      <Truck size={16} /> Vendor Ledger
                    </div>
                    <ChevronRight size={16} color="var(--text-3)" />
                  </button>
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className="btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.875rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-1)' }}>
                      <MessageCircle size={16} /> AI Finance Chat
                    </div>
                    <ChevronRight size={16} color="var(--text-3)" />
                  </button>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', paddingTop: '1rem' }}>
              <img src={`https://ui-avatars.com/api/?name=${currentUser?.name}&background=random&size=64`} alt="User" style={{ borderRadius: '50%' }} />
              <div>
                <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.125rem', fontWeight: 500 }}>{currentUser?.name}</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', margin: 0 }}>@{currentUser?.username} · {currentUser?.role}</p>
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
                    if (currentUser?.role === 'admin' && currentOrgId) updateOrgSettings(currentOrgId, { geminiApiKey: k });
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

            {currentUser?.role === 'admin' && (
              <>
                <p className="section-label">app features</p>
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 500, margin: '0 0 0.25rem' }}>Staff Shift Tracking</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: 0 }}>Log staff floats, expected cash, and daily variances.</p>
                  </div>
                  <button 
                    onClick={() => currentOrgId && updateOrgSettings(currentOrgId, { features: { ...appFeatures, enableShifts: !appFeatures.enableShifts } })}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px', padding: '2px', border: 'none', cursor: 'pointer',
                      background: appFeatures.enableShifts ? 'var(--green)' : 'var(--bg-3)',
                      transition: 'background 0.3s ease', position: 'relative'
                    }}
                  >
                    <div style={{ 
                      width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                      transform: appFeatures.enableShifts ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }} />
                  </button>
                </div>
              </>
            )}

            <p className="section-label">user profile</p>
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              {isEditingProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Name</label>
                    <input className="input" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Username</label>
                    <input className="input" value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Email</label>
                    <input className="input" type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Phone</label>
                    <input className="input" type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => setIsEditingProfile(false)} 
                      className="btn-secondary" style={{ flex: 1 }}
                    >
                      cancel
                    </button>
                    <button 
                      onClick={async () => {
                        if (!currentUser || !currentOrgId) return;
                        const updatedUser = { 
                          ...currentUser, 
                          name: profileForm.name, 
                          username: profileForm.username.toLowerCase(), 
                          email: profileForm.email.toLowerCase(), 
                          phone: profileForm.phone 
                        };
                        try {
                          await updateOrgMember(currentOrgId, updatedUser);
                          setCurrentUser(updatedUser);
                          sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(updatedUser));
                          setIsEditingProfile(false);
                        } catch (err) {
                          alert('Failed to update profile.');
                        }
                      }} 
                      className="btn-primary" style={{ flex: 1 }}
                    >
                      save changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>{currentUser?.name}</p>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: '0.125rem 0 0' }}>{currentUser?.email} • {currentUser?.username}</p>
                      <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', margin: '0.125rem 0 0', textTransform: 'uppercase' }}>role: {currentUser?.role}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <button 
                        onClick={() => {
                          setProfileForm({ 
                            name: currentUser?.name || '', 
                            email: currentUser?.email || '', 
                            username: currentUser?.username || '', 
                            phone: currentUser?.phone || '' 
                          });
                          setIsEditingProfile(true);
                        }} 
                        className="btn-ghost" style={{ color: 'var(--blue)' }}
                      >
                        edit details
                      </button>
                      <button onClick={handleLogout} className="btn-ghost" style={{ color: 'var(--text-3)' }}>logout</button>
                    </div>
                  </div>
                  
                  <div className="divider" style={{ margin: '1rem 0' }} />
                  
                  <button onClick={handleDeleteAccount} className="btn-danger" style={{ width: '100%', marginTop: '0.5rem' }}>
                    delete my account
                  </button>
                </>
              )}
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
                  if (np && np.length === 4 && currentUser && currentOrgId) {
                    updateOrgMember(currentOrgId, { ...currentUser, pin: np });
                    setCurrentUser({ ...currentUser, pin: np });
                    sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify({ ...currentUser, pin: np }));
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
                        <p className="text-heading" style={{ fontSize: '0.8125rem' }}>{u.name}</p>
                        <p className="text-label" style={{ textTransform: 'none' }}>PIN: {u.pin} • {u.role}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            const np = prompt(`Reset PIN for ${u.name}:`);
                            if(np && np.length === 4 && currentOrgId) updateOrgMember(currentOrgId, { ...u, pin: np });
                          }}
                          className="btn-ghost" 
                          style={{ color: 'var(--blue)', fontSize: '0.75rem' }}
                        >
                          reset PIN
                        </button>
                        <button 
                          onClick={() => { if(confirm('Remove this user?') && currentOrgId) deleteOrgMember(currentOrgId, u.id); }} 
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
                      if (!currentOrgId) return;
                      const name = prompt('Enter staff name:');
                      const username = prompt('Enter unique staff username:');
                      const pin = prompt('Enter 4-digit PIN:');
                      if(name && username && pin && pin.length === 4) {
                        const staffUser: User = { 
                          id: Date.now().toString(), 
                          orgId: currentOrgId,
                          name, 
                          username: username.toLowerCase().trim(),
                          email: `${username.toLowerCase().trim()}@${(currentOrg?.name || 'team').toLowerCase().replace(/\s+/g, '')}.app`, 
                          role: 'user', 
                          pin,
                          joinedAt: new Date().toISOString(),
                        };
                        addOrgMember(currentOrgId, staffUser);
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
                  <p className="text-heading" style={{ fontSize: '0.8125rem' }}>app theme</p>
                  <p className="text-label" style={{ margin: '0.125rem 0 0', textTransform: 'lowercase' }}>currently {theme}</p>
                </div>
                <button onClick={toggleTheme} className="theme-btn">
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                <div>
                  <p className="text-heading" style={{ fontSize: '0.8125rem' }}>categories</p>
                  <p className="text-label" style={{ margin: '0.125rem 0 0', textTransform: 'lowercase' }}>manage custom tags</p>
                </div>
                <button onClick={() => setShowCategoryManager(true)} className="btn-ghost" style={{ color: 'var(--blue)', fontSize: '0.75rem' }}>
                  edit
                </button>
              </div>
              <div className="divider" style={{ margin: '0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                <div>
                  <p className="text-heading" style={{ fontSize: '0.8125rem' }}>recurring bills</p>
                  <p className="text-label" style={{ margin: '0.125rem 0 0', textTransform: 'lowercase' }}>auto-suggest templates</p>
                </div>
                <button onClick={() => setShowRecurringManager(true)} className="btn-ghost" style={{ color: 'var(--blue)', fontSize: '0.75rem' }}>
                  manage
                </button>
              </div>
            </div>

            <p className="section-label">data management</p>
            <div className="card" style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', alignItems: 'center' }}>
                <span className="text-regular" style={{ fontSize: '0.8125rem', color: 'var(--text-1)' }}>total records</span>
                <span className="text-number" style={{ fontSize: '0.8125rem' }}>{transactions.length} entries</span>
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

            {currentUser?.role === 'admin' && (
              <>
                <p className="section-label">disaster recovery & backup</p>
                <div className="card" style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}>
                  <button 
                    onClick={handleExportData} 
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '1rem 0', background: 'none', border: 'none', color: 'var(--text-1)', fontSize: '0.8125rem', alignItems: 'center', borderBottom: '1px solid var(--border)' }}
                  >
                    <span>export full data backup (.json)</span>
                    <Database size={14} />
                  </button>
                  <label 
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '1rem 0', background: 'none', border: 'none', color: 'var(--text-1)', fontSize: '0.8125rem', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <span>restore from backup file</span>
                    <Upload size={14} />
                    <input type="file" accept=".json" onChange={handleRestoreData} style={{ display: 'none' }} />
                  </label>
                </div>

                <p className="section-label">initial account balances</p>
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                  {Object.keys(openingBalances).sort().map(acc => (
                    <div key={acc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!['Cash', 'UPI', 'Bank'].includes(acc) && (
                          <button 
                            onClick={() => {
                              if (confirm(`Remove account "${acc}"? This will not delete transactions, but the account will no longer track separate balances.`)) {
                                const newBals = { ...openingBalances };
                                delete newBals[acc];
                                setOpeningBalances(newBals);
                                handleSaveOpeningBalances(newBals);
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--red)', padding: 0, cursor: 'pointer', display: 'flex' }}
                          >
                            <X size={14} />
                          </button>
                        )}
                        <span className="text-label" style={{ textTransform: 'none' }}>{acc}</span>
                      </div>
                      <input 
                        type="number" 
                        className="input text-number" 
                        style={{ width: '6rem', padding: '0.375rem', fontSize: '0.8125rem', textAlign: 'right' }} 
                        value={openingBalances[acc] || 0}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const newBals = { ...openingBalances, [acc]: val };
                          setOpeningBalances(newBals);
                          handleSaveOpeningBalances(newBals);
                        }}
                      />
                    </div>
                  ))}
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontStyle: 'italic', marginTop: '0.75rem', lineHeight: 1.4 }}>
                    Note: These values are added to your transaction income to calculate total liquidity.
                  </p>
                </div>
              </>
            )}

            <p className="section-label">account</p>
            <div className="card" style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}>
              <button
                onClick={() => { if(confirm('Logout from this session?')) handleLogout(); }}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '1rem 0', background: 'none', border: 'none', color: 'var(--text-1)', fontSize: '0.8125rem', alignItems: 'center' }}
              >
                logout @{currentUser?.username || 'user'} <ChevronRight size={14} />
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

  if (!isDbReady && currentOrgId) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)' }}>
        <div className="loader spin" style={{ width: '2rem', height: '2rem', border: '3px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%' }} />
        <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-3)', letterSpacing: '0.05em' }}>syncing to cloud...</p>
      </div>
    );
  }

  if (!currentUser || !currentOrgId) {
    return <Login 
      onLogin={handleLogin} 
      onSignUp={async (orgData, userData) => {
        const orgId = 'org_' + Date.now().toString(36);
        const userId = Date.now().toString();
        const now = new Date().toISOString();
        
        const org: Organization = {
          id: orgId,
          name: orgData.name || 'My Business',
          businessType: orgData.businessType || 'restaurant',
          currency: orgData.currency || 'INR',
          plan: orgData.plan || 'free',
          createdAt: now,
          createdBy: userId,
        };
        
        const newUser: User = {
          id: userId,
          orgId,
          name: userData.name || '',
          username: userData.username || '',
          email: userData.email || '',
          phone: userData.phone,
          pin: userData.pin || '0000',
          role: 'admin',
          joinedAt: now,
        };
        
        await createOrganization(org, newUser);
        handleLogin(newUser, orgId);
      }} 
    />;
  }

  return (
    <div className="app-container">
      {renderContent()}
      <BottomNav
        activeTab={activeTab === 'add' ? 'dashboard' : activeTab}
        setActiveTab={tab => { 
          if (tab === 'add') {
             setShowQuickAdd(true); 
          } else {
             setActiveTab(tab); 
          }
        }}
        pendingCount={pendingCount}
      />
      {showCategoryManager && (
        <CategoryManager 
          categories={customCategories} 
          onSave={handleSaveCategories} 
          onClose={() => setShowCategoryManager(false)} 
        />
      )}
      {showRecurringManager && currentOrg && (
        <RecurringManager
          recurringExpenses={recurringExpenses}
          categories={customCategories}
          onSave={(rec) => saveRecurringExpense(currentOrg.id, rec)}
          onDelete={(id) => deleteRecurringExpense(currentOrg.id, id)}
          onClose={() => setShowRecurringManager(false)}
        />
      )}
      {showQuickAdd && (
        <QuickAdd 
          balances={accountBalances}
          isAdmin={currentUser?.role === 'admin'}
          vendors={vendors}
          onAddVendor={async (v) => { if (currentOrgId) await saveVendor(currentOrgId, v); }}
          onAdd={handleAddTransaction}
          onClose={() => { setShowQuickAdd(false); setPendingRecurringTxn(null); }} 
          categories={customCategories}
          onAddCategory={(cat) => {
            const updated = [...customCategories, cat];
            handleSaveCategories(updated);
          }}
          onAddAccount={(name) => {
            const updated = { ...openingBalances, [name]: 0 };
            handleSaveOpeningBalances(updated);
          }}
          initialData={pendingRecurringTxn || undefined}
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
