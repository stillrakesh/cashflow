// ============================================
// CafeFlow v4.0 — Multi-Tenant Type System
// ============================================

export type Role = 'admin' | 'user';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type TransactionType = 'sale' | 'expense';
export type PaymentType = 'cash' | 'upi' | 'bank' | 'other';
export type ExpenseClassification = 'fixed' | 'variable' | 'one-time';
export type ThemeMode = 'light' | 'dark';
export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'last_month' | 'last_7' | 'last_30' | 'custom' | 'all';
export type BusinessType = 'restaurant' | 'cafe' | 'retail' | 'services' | 'other';
export type PlanTier = 'free' | 'pro' | 'enterprise';
export type RecurrenceFrequency = 'monthly' | 'weekly';

export type OpeningBalances = Record<string, number>;

// ============================================
// Organization (Tenant)
// ============================================
export interface Organization {
  id: string;
  name: string;           // Business display name (e.g. "Rakesh's Kitchen")
  businessType: BusinessType;
  currency: string;       // e.g. 'INR'
  plan: PlanTier;
  createdAt: string;      // ISO string
  createdBy: string;      // Admin userId who created the org
}

// ============================================
// Shift Logging & Cash Reconciliation
// ============================================
export interface Shift {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  status: 'open' | 'closed';
  startTime: string; // ISO String
  endTime?: string;
  startingCash: number;
  expectedEndingCash?: number;
  actualEndingCash?: number;
  discrepancy?: number;
}

export type TransactionCategory = string;

export interface CategoryConfig {
  id: string;
  name: string;
  classification: ExpenseClassification;
  icon?: string;
}

export interface OrganizationSettings {
  geminiApiKey: string;
  openingBalances: OpeningBalances;
  categories: CategoryConfig[];
  features?: {
    enableShifts?: boolean;
  };
}

// Maps each category to its classification
export const CATEGORY_CLASSIFICATION: Record<string, ExpenseClassification> = {
  // Variable / COGS
  vegetables: 'variable',
  oil: 'variable',
  dairy: 'variable',
  meat: 'variable',
  spices: 'variable',
  beverages: 'variable',
  gas: 'variable',
  packaging: 'variable',
  cleaning: 'variable',
  transport: 'variable',
  wastage: 'variable',
  commissions: 'variable',
  misc: 'variable',
  // Fixed / Overhead
  rent: 'fixed',
  utilities: 'fixed',
  salary: 'fixed',
  marketing: 'fixed',
  insurance: 'fixed',
  licenses: 'fixed',
  laundry: 'fixed',
  'pest control': 'fixed',
  'loan / EMI': 'fixed',
  taxes: 'fixed',
  // One-Time / CapEx
  equipment: 'one-time',
  repairs: 'one-time',
  furniture: 'one-time',
  renovation: 'one-time',
};

// Icons mapping for categories
export const CATEGORY_ICONS: Record<string, string> = {
  // Variable / COGS
  vegetables: '🥬',
  oil: '🫒',
  dairy: '🥛',
  meat: '🍖',
  spices: '🌶️',
  beverages: '☕',
  gas: '⛽',
  packaging: '📦',
  cleaning: '🧹',
  transport: '🚛',
  wastage: '🗑️',
  commissions: '💸',
  // Fixed / Overhead
  rent: '🏠',
  utilities: '💡',
  salary: '👥',
  marketing: '📣',
  insurance: '🛡️',
  licenses: '📋',
  laundry: '👔',
  'pest control': '🪲',
  'loan / EMI': '🏦',
  taxes: '🧾',
  // One-Time / CapEx
  equipment: '🔧',
  repairs: '🛠️',
  furniture: '🪑',
  renovation: '🎨',
  // Other
  misc: '📝',
  sale: '💰',
};

export interface EditRecord {
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface User {
  id: string;
  orgId: string;          // Organization this user belongs to
  name: string;
  username: string;
  email: string;
  pin: string;
  role: Role;
  phone?: string;
  recoveryEmail?: string;
  joinedAt?: string;      // ISO string
}

export interface Transaction {
  id: string;
  orgId: string;          // Organization this txn belongs to
  type: TransactionType;
  amount: number;
  date: string; // ISO string
  notes?: string;
  status: TransactionStatus;
  userId: string;
  userName: string;
  category: TransactionCategory | string;
  subCategory?: string;
  paymentType: PaymentType;
  tag?: string;
  classification?: ExpenseClassification;
  editHistory?: EditRecord[];
  createdAt?: string;
  updatedAt?: string;
  vendor?: string; // Who you paid
  account?: string; // External account tracking (e.g. Swiggy, Rakesh HDFC)
  adminComment?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  cogs: number;
  cashIn: number;
  cashOut: number;
  availableCash: number;
  transactionCount: number;
  fixedExpenses: number;
  variableExpenses: number;
  oneTimeExpenses: number;
  profitMargin: number;
  avgDailySales: number;
  avgDailyExpenses: number;
}

export interface TodaySnapshot {
  sales: number;
  expenses: number;
  profit: number;
  txnCount: number;
  pendingCount: number;
  topCategory: string;
  topCategoryAmount: number;
}

export interface PeriodSummary {
  label: string;
  totalIn: number;
  totalOut: number;
  net: number;
  count: number;
}

export interface DailyData {
  date: string;
  dayLabel: string;
  sales: number;
  expenses: number;
  profit: number;
}

export interface AIInsight {
  id: string;
  type: 'alert' | 'suggestion' | 'summary' | 'trend';
  title: string;
  content: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  icon?: string;
}

export interface Vendor {
  id: string;
  orgId: string;
  name: string;
  contact?: string;
  email?: string;
  category?: string;
  createdAt: string;
}

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  categories: string[];
  paymentTypes: PaymentType[];
  types: TransactionType[];
  classifications: ExpenseClassification[];
  statuses: TransactionStatus[];
  accounts: string[];
  vendors: string[];
  searchQuery: string;
  datePreset: DatePreset;
}

export interface VersionInfo {
  version: string;
  date: string;
  changelog: string[];
}

export interface DailyReport {
  id: string; // date string YYYY-MM-DD
  orgId: string;
  date: string;
  sales: number;
  expenses: number;
  profit: number;
  expectedCash: number;
  actualCash: number;
  discrepancy: number;
  status: 'closed';
  closedBy: string;
  closedAt: string;
  notes?: string;
}

export interface RecurringExpense {
  id: string;
  orgId: string;
  name: string;
  amount: number;
  category: string;
  frequency: RecurrenceFrequency;
  dayOfMonth?: number; // 1-31
  dayOfWeek?: number;  // 0-6 (Sun-Sat)
  lastCreatedDate?: string; // YYYY-MM-DD
  status: 'active' | 'paused';
  notes?: string;
  classification: ExpenseClassification;
  createdAt: string;
}

export const VERSION_CONSISTENCY = '4.0.0';
