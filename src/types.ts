// ============================================
// CafeFlow v3.0 — Type System
// ============================================

export type Role = 'admin' | 'user';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type TransactionType = 'sale' | 'expense';
export type PaymentType = 'cash' | 'upi' | 'bank' | 'other';
export type ExpenseClassification = 'fixed' | 'variable' | 'one-time';
export type ThemeMode = 'light' | 'dark';
export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'last_month' | 'last_7' | 'last_30' | 'custom' | 'all';

export type TransactionCategory =
  | 'vegetables'
  | 'oil'
  | 'gas'
  | 'packaging'
  | 'rent'
  | 'utilities'
  | 'salary'
  | 'marketing'
  | 'dairy'
  | 'meat'
  | 'spices'
  | 'beverages'
  | 'cleaning'
  | 'equipment'
  | 'repairs'
  | 'transport'
  | 'misc';

// Maps each category to its classification
export const CATEGORY_CLASSIFICATION: Record<string, ExpenseClassification> = {
  rent: 'fixed',
  salary: 'fixed',
  utilities: 'fixed',
  marketing: 'fixed',
  vegetables: 'variable',
  oil: 'variable',
  gas: 'variable',
  packaging: 'variable',
  dairy: 'variable',
  meat: 'variable',
  spices: 'variable',
  beverages: 'variable',
  cleaning: 'variable',
  transport: 'variable',
  equipment: 'one-time',
  repairs: 'one-time',
  misc: 'variable',
};

// Icons mapping for categories
export const CATEGORY_ICONS: Record<string, string> = {
  vegetables: '🥬',
  oil: '🫒',
  gas: '⛽',
  packaging: '📦',
  rent: '🏠',
  utilities: '💡',
  salary: '👥',
  marketing: '📣',
  dairy: '🥛',
  meat: '🍖',
  spices: '🌶️',
  beverages: '☕',
  cleaning: '🧹',
  equipment: '🔧',
  repairs: '🛠️',
  transport: '🚛',
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
  name: string;
  username: string;
  email: string;
  pin: string;
  role: Role;
  phone?: string;
  recoveryEmail?: string;
}

export interface Transaction {
  id: string;
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

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  categories: string[];
  paymentTypes: PaymentType[];
  types: TransactionType[];
  classifications: ExpenseClassification[];
  statuses: TransactionStatus[];
  accounts: string[];
  searchQuery: string;
  datePreset: DatePreset;
}

export interface VersionInfo {
  version: string;
  date: string;
  changelog: string[];
}

export const VERSION_CONSISTENCY = '3.0.0';
