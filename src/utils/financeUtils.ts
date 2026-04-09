// ============================================
// CafeFlow v3.0 — Finance Engine
// ============================================

import type { Transaction, DashboardStats, DailyData, AIInsight, ExpenseClassification, DatePreset, TodaySnapshot, PeriodSummary, OpeningBalances, CategoryConfig } from '../types';
import { CATEGORY_CLASSIFICATION } from '../types';

/**
 * Get today's date string in IST (Asia/Kolkata) — format: YYYY-MM-DD
 * This ensures date boundaries match Mumbai time regardless of server/browser timezone.
 */
const istToday = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

/**
 * Get an IST-anchored Date object offset N days from today
 */
const istDaysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

/**
 * Format a number to Indian Rupee format (₹1,20,500)
 */
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format a compact INR for small displays
 */
export const formatINRCompact = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatINR(amount);
};

/**
 * Get expense classification for a category
 */
export const getExpenseClassification = (category: string, customCategories?: CategoryConfig[]): ExpenseClassification => {
  if (customCategories) {
    const config = customCategories.find(c => c.name.toLowerCase() === category?.toLowerCase());
    if (config) return config.classification;
  }
  return CATEGORY_CLASSIFICATION[category?.toLowerCase()] || 'variable';
};

/**
 * Calculate comprehensive dashboard stats
 */
export const calculateStats = (transactions: Transaction[], customCategories: CategoryConfig[], openingBalances?: OpeningBalances): DashboardStats => {
  const approved = transactions.filter(t => t.status === 'approved');
  const sales = approved.filter(t => t.type === 'sale');
  const expenses = approved.filter(t => t.type === 'expense');

  const totalSales = sales.reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalSales - totalExpenses;

  const totalOpening = openingBalances 
    ? (openingBalances.Cash + openingBalances.UPI + openingBalances.Bank) 
    : 0;

  const fixedExpenses = expenses
    .filter(t => (t.classification === 'fixed' || getExpenseClassification(t.category, customCategories) === 'fixed'))
    .reduce((acc, t) => acc + t.amount, 0);

  const variableExpenses = expenses
    .filter(t => (t.classification === 'variable' || getExpenseClassification(t.category, customCategories) === 'variable'))
    .reduce((acc, t) => acc + t.amount, 0);

  const oneTimeExpenses = expenses
    .filter(t => (t.classification === 'one-time' || getExpenseClassification(t.category, customCategories) === 'one-time'))
    .reduce((acc, t) => acc + t.amount, 0);

  const cogs = estimateCOGS(transactions);
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
  
  // Calculate distinct days for averages
  const uniqueDates = new Set(approved.map(t => t.date.split('T')[0])).size || 1;

  return {
    totalSales,
    totalExpenses,
    netProfit,
    cogs,
    cashIn: totalSales,
    cashOut: totalExpenses,
    availableCash: netProfit + totalOpening,
    transactionCount: transactions.length,
    fixedExpenses,
    variableExpenses,
    oneTimeExpenses,
    profitMargin,
    avgDailySales: totalSales / uniqueDates,
    avgDailyExpenses: totalExpenses / uniqueDates,
  };
};

/**
 * COGS estimator — sum of ingredient-related approved expenses
 */
export const estimateCOGS = (transactions: Transaction[]): number => {
  const ingredientTags = ['vegetables', 'oil', 'gas', 'packaging', 'dairy', 'meat', 'spices', 'beverages'];
  return transactions
    .filter(t => t.type === 'expense' && t.status === 'approved')
    .filter(t => ingredientTags.includes(t.category?.toLowerCase()))
    .reduce((acc, t) => acc + t.amount, 0);
};

/**
 * Calculate Today's Snapshot
 */
export const getTodaySnapshot = (transactions: Transaction[]): TodaySnapshot => {
  const todayStr = istToday(); // IST-correct date string
  const todayTxns = transactions.filter(t => {
    const txnDateIST = new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return txnDateIST === todayStr;
  });
  
  const approved = todayTxns.filter(t => t.status === 'approved');
  const pendingCount = todayTxns.filter(t => t.status === 'pending').length;
  
  const sales = approved.filter(t => t.type === 'sale').reduce((a, t) => a + t.amount, 0);
  const expenses = approved.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((a, t) => a + t.amount, 0);
  
  // Find top expense category for today
  const categoryTotals: Record<string, number> = {};
  expenses.forEach(t => {
    const cat = t.category || 'misc';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });
  
  let topCategory = 'None';
  let topCategoryAmount = 0;
  Object.entries(categoryTotals).forEach(([cat, amount]) => {
    if (amount > topCategoryAmount) {
      topCategoryAmount = amount;
      topCategory = cat;
    }
  });
 
  return {
    sales,
    expenses: totalExpenses,
    profit: sales - totalExpenses,
    txnCount: todayTxns.length,
    pendingCount,
    topCategory,
    topCategoryAmount,
  };
};

/**
 * Calculate Period Summary
 */
export const getPeriodSummary = (transactions: Transaction[], preset: string): PeriodSummary => {
  const approved = transactions.filter(t => t.status === 'approved');
  const totalIn = approved.filter(t => t.type === 'sale').reduce((a, t) => a + t.amount, 0);
  const totalOut = approved.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  
  let label = preset;
  if(preset === 'custom' || preset === 'all') label = 'Total Period';
  
  return {
    label,
    totalIn,
    totalOut,
    net: totalIn - totalOut,
    count: transactions.length
  };
};

/**
 * Get date range from preset
 */
export const getDateRangeFromPreset = (preset: DatePreset): { dateFrom: string; dateTo: string } => {
  const dateTo = istToday(); // IST-correct today
  let dateFrom = '';

  switch (preset) {
    case 'today':
      dateFrom = dateTo;
      break;
    case 'yesterday': {
      const yestStr = istDaysAgo(1);
      return { dateFrom: yestStr, dateTo: yestStr };
    }
    case 'last_7': {
      dateFrom = istDaysAgo(7);
      break;
    }
    case 'last_30': {
      dateFrom = istDaysAgo(30);
      break;
    }
    case 'this_month': {
      const now = new Date();
      const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      dateFrom = new Date(istNow.getFullYear(), istNow.getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      break;
    }
    case 'this_year': {
      const now = new Date();
      const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      dateFrom = new Date(istNow.getFullYear(), 0, 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      break;
    }
    case 'last_month': {
      const now = new Date();
      const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const firstDay = new Date(istNow.getFullYear(), istNow.getMonth() - 1, 1);
      const lastDay = new Date(istNow.getFullYear(), istNow.getMonth(), 0);
      return {
        dateFrom: firstDay.toLocaleDateString('en-CA'),
        dateTo: lastDay.toLocaleDateString('en-CA'),
      };
    }
    case 'this_week': {
      const d = new Date();
      const day = d.getDay() || 7;
      if (day !== 1) d.setHours(-24 * (day - 1));
      dateFrom = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      break;
    }
    case 'all':
    case 'custom':
    default:
      dateFrom = '';
      break; // handled externally
  }

  return { dateFrom, dateTo };
};

/**
 * Calculate daily breakdown from transactions
 */
export const calculateDailyData = (transactions: Transaction[], days: number = 7): DailyData[] => {
  const approved = transactions.filter(t => t.status === 'approved');
  const result: DailyData[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = days - 1; i >= 0; i--) {
    const dateStr = istDaysAgo(i);
    const d = new Date(dateStr + 'T00:00:00+05:30');
    const dayTxns = approved.filter(t => {
      const txnDateIST = new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      return txnDateIST === dateStr;
    });
    const sales = dayTxns.filter(t => t.type === 'sale').reduce((a, t) => a + t.amount, 0);
    const expenses = dayTxns.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    result.push({
      date: dateStr,
      dayLabel: dayNames[d.getDay()],
      sales,
      expenses,
      profit: sales - expenses,
    });
  }
  return result;
};

/**
 * Get expense breakdown by category as percentages
 */
export const getExpenseBreakdown = (transactions: Transaction[]) => {
  const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'approved');
  const total = expenses.reduce((a, t) => a + t.amount, 0);
  if (total === 0) return [];

  const byCategory: Record<string, number> = {};
  expenses.forEach(t => {
    const cat = t.category || 'misc';
    byCategory[cat] = (byCategory[cat] || 0) + t.amount;
  });

  return Object.entries(byCategory)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
};

/**
 * Get revenue breakdown by payment type
 */
export const getRevenueByPayment = (transactions: Transaction[]) => {
  const sales = transactions.filter(t => t.type === 'sale' && t.status === 'approved');
  const total = sales.reduce((a, t) => a + t.amount, 0);
  if (total === 0) return [];

  const byPayment: Record<string, number> = {};
  sales.forEach(t => {
    const pt = t.paymentType || 'other';
    byPayment[pt] = (byPayment[pt] || 0) + t.amount;
  });

  return Object.entries(byPayment)
    .map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
};

/**
 * Generate AI insights from transaction data
 * Enhanced with automatic business alerts
 */
export const generateAIInsights = (filteredTransactions: Transaction[], allTransactions: Transaction[]): AIInsight[] => {
  const insights: AIInsight[] = [];
  const approved = filteredTransactions.filter(t => t.status === 'approved');
  const expenses = approved.filter(t => t.type === 'expense');
  const sales = approved.filter(t => t.type === 'sale');

  const totalSales = sales.reduce((a, t) => a + t.amount, 0);
  const totalExpenses = expenses.reduce((a, t) => a + t.amount, 0);
  const currentProfit = totalSales - totalExpenses;

  // 1. Low Profit Warning
  if (currentProfit < 0) {
    insights.push({
      id: 'insight-low-profit',
      type: 'alert',
      title: 'Money Alert: Loss Detected',
      content: `You've spent ${formatINR(Math.abs(currentProfit))} more than you earned in this period. Time to check where money is going.`,
      severity: 'high',
      timestamp: new Date().toISOString(),
      icon: '🔴',
    });
  }

  // 2. High Expense Alert & Category Dominance
  const breakdown = getExpenseBreakdown(filteredTransactions);
  if (breakdown.length > 0) {
    const top = breakdown[0];
    
    // Extreme dominance (> 70%)
    if (top.percentage >= 70) {
      insights.push({
        id: 'insight-dominance',
        type: 'alert',
        title: `${top.name} is taking over!`,
        content: `${top.name} makes up ${top.percentage}% of your total costs. This is extremely high compared to other things.`,
        severity: 'high',
        timestamp: new Date().toISOString(),
        icon: '⚖️',
      });
    } 
    // High expense (> 40%)
    else if (top.percentage >= 40) {
      insights.push({
        id: 'insight-high-expense',
        type: 'alert',
        title: `High ${top.name} cost`,
        content: `${top.name} is taking ${top.percentage}% of your budget (${formatINR(top.value)}). Can you find cheaper rates?`,
        severity: 'medium',
        timestamp: new Date().toISOString(),
        icon: '⚠️',
      });
    }
  }

  // 3. Sudden Spike (Today vs Yesterday)
  const todayStr = istToday();
  const yestStr = istDaysAgo(1);
  
  const todayExpenses = allTransactions
    .filter(t => t.type === 'expense' && t.status === 'approved' && new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === todayStr)
    .reduce((a, t) => a + t.amount, 0);
    
  const yestExpenses = allTransactions
    .filter(t => t.type === 'expense' && t.status === 'approved' && new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === yestStr)
    .reduce((a, t) => a + t.amount, 0);

  if (todayExpenses > 0 && yestExpenses > 0 && todayExpenses > (yestExpenses * 2)) {
    insights.push({
      id: 'insight-spike',
      type: 'alert',
      title: 'Sudden Spending Jump!',
      content: `Today's expenses (${formatINR(todayExpenses)}) are more than double of what you spent yesterday (${formatINR(yestExpenses)}).`,
      severity: 'high',
      timestamp: new Date().toISOString(),
      icon: '🚀',
    });
  }

  // 4. Healthy Business Check (if not already alerted)
  if (currentProfit > 0 && insights.length === 0) {
    const margin = Math.round((currentProfit / totalSales) * 100);
    insights.push({
      id: 'insight-healthy',
      type: 'summary',
      title: 'Doing Good!',
      content: `You earned a profit of ${formatINR(currentProfit)} (${margin}% margin). Keep up the great work!`,
      severity: 'low',
      timestamp: new Date().toISOString(),
      icon: '✅',
    });
  }

  // 5. Existing COGS check
  const cogs = estimateCOGS(filteredTransactions);
  const cogsPercent = totalSales > 0 ? Math.round((cogs / totalSales) * 100) : 0;
  if (cogsPercent > 40 && !insights.find(i => i.id === 'insight-dominance')) {
    insights.push({
      id: 'ai-cogs',
      type: 'suggestion',
      title: `Grocery costs are high`,
      content: `Your ingredient costs are ${cogsPercent}% of revenue. This is a bit high; try checking other shops for better prices.`,
      severity: 'medium',
      timestamp: new Date().toISOString(),
      icon: '🧾',
    });
  }

  return insights;
};

/**
 * AI NLP Parser for financial entries — Enhanced for v3
 */
export const parseAIText = (text: string) => {
  const normalized = text.toLowerCase().trim();

  // Extract amount — support ₹1200, rs 1200, 1200 rupees etc.
  const amountMatch = normalized.match(/(?:₹|rs\.?\s*|inr\s*)?(\d+(?:,\d+)*(?:\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

  // Detect type
  let type: 'sale' | 'expense' = 'expense';
  const saleKeywords = ['sale', 'sales', 'sold', 'income', 'earn', 'earned', 'revenue', 'collected', 'received'];
  if (saleKeywords.some(k => normalized.includes(k))) {
    type = 'sale';
  }

  // Detect payment type
  let paymentType: 'cash' | 'upi' | 'bank' | 'other' = 'cash';
  if (/upi|phonepe|gpay|google\s*pay|paytm|qr|online/i.test(normalized)) {
    paymentType = 'upi';
  } else if (/bank|transfer|neft|imps|card|debit|credit/i.test(normalized)) {
    paymentType = 'bank';
  } else if (/cash/i.test(normalized)) {
    paymentType = 'cash';
  }

  // Detect date
  let date = new Date().toISOString();
  if (normalized.includes('yesterday')) {
    const d = new Date(); d.setDate(d.getDate() - 1); date = d.toISOString();
  } else if (normalized.includes('day before yesterday') || normalized.includes('2 days ago')) {
    const d = new Date(); d.setDate(d.getDate() - 2); date = d.toISOString();
  } else if (normalized.includes('last week')) {
    const d = new Date(); d.setDate(d.getDate() - 7); date = d.toISOString();
  }

  // Detect category
  const categoryMap: Record<string, string> = {
    vegetable: 'vegetables', veggie: 'vegetables', sabzi: 'vegetables', veggies: 'vegetables',
    oil: 'oil', tel: 'oil',
    gas: 'gas', cylinder: 'gas',
    packaging: 'packaging', pack: 'packaging',
    rent: 'rent',
    utility: 'utilities', utilities: 'utilities', bijli: 'utilities', electricity: 'utilities', water: 'utilities', internet: 'utilities', wifi: 'utilities',
    salary: 'salary', staff: 'salary', wages: 'salary',
    marketing: 'marketing', ads: 'marketing', advertisement: 'marketing',
    dairy: 'dairy', milk: 'dairy', curd: 'dairy', paneer: 'dairy', cheese: 'dairy',
    meat: 'meat', chicken: 'meat', mutton: 'meat', fish: 'meat',
    spice: 'spices', spices: 'spices', masala: 'spices',
    beverage: 'beverages', beverages: 'beverages', drinks: 'beverages', coffee: 'beverages', tea: 'beverages',
    cleaning: 'cleaning', cleaner: 'cleaning', soap: 'cleaning',
    equipment: 'equipment', machine: 'equipment',
    repair: 'repairs', repairs: 'repairs', fix: 'repairs', maintenance: 'repairs',
    transport: 'transport', delivery: 'transport', fuel: 'transport', petrol: 'transport', diesel: 'transport',
  };

  let category = type === 'sale' ? 'sale' : 'misc';
  
  // Helper for typo tolerance (Levenshtein distance)
  const getDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const words = normalized.split(/[\s,.'-]+/);

  for (const [keyword, cat] of Object.entries(categoryMap)) {
    // 1. Exact substring match
    if (normalized.includes(keyword)) {
      category = cat;
      break;
    }
    // 2. Fuzzy match word by word for typos (only for words > 3 chars to prevent false positives)
    if (keyword.length > 3) {
      const hasTypoMatch = words.some(w => w.length > 3 && Math.abs(w.length - keyword.length) <= 2 && getDistance(w, keyword) <= 2);
      if (hasTypoMatch) {
        category = cat;
        break;
      }
    }
  }

  // Extract notes — everything that isn't the amount or detected keywords
  const notes = text.trim();

  return { amount, type, paymentType, category, date, notes, confirmed: false };
};

/**
 * Answer financial questions from chat
 */
export const answerFinanceQuestion = (text: string, transactions: Transaction[]): string | null => {
  const normalized = text.toLowerCase().trim();
  const approved = transactions.filter(t => t.status === 'approved');
  const sales = approved.filter(t => t.type === 'sale');
  const expenses = approved.filter(t => t.type === 'expense');

  const totalSales = sales.reduce((a, t) => a + t.amount, 0);
  const totalExpenses = expenses.reduce((a, t) => a + t.amount, 0);

  if (/profit|margin|earning/i.test(normalized)) {
    const profit = totalSales - totalExpenses;
    const margin = totalSales > 0 ? Math.round((profit / totalSales) * 100) : 0;
    return `📊 Your current profit is **${formatINR(profit)}** with a **${margin}% margin**.\n\nRevenue: ${formatINR(totalSales)}\nExpenses: ${formatINR(totalExpenses)}`;
  }

  if (/total\s*(sale|revenue|income)/i.test(normalized)) {
    return `💰 Total sales: **${formatINR(totalSales)}** across ${sales.length} transactions.`;
  }

  if (/total\s*expense/i.test(normalized)) {
    return `💸 Total expenses: **${formatINR(totalExpenses)}** across ${expenses.length} transactions.`;
  }

  if (/cash\s*flow|available\s*cash/i.test(normalized)) {
    return `💵 Cash Flow:\n\n↗️ Money In: ${formatINR(totalSales)}\n↘️ Money Out: ${formatINR(totalExpenses)}\n\n💰 Available: **${formatINR(totalSales - totalExpenses)}**`;
  }

  if (/cogs|cost\s*of\s*goods/i.test(normalized)) {
    const cogs = estimateCOGS(transactions);
    const pct = totalSales > 0 ? Math.round((cogs / totalSales) * 100) : 0;
    return `🧾 Estimated COGS: **${formatINR(cogs)}** (${pct}% of revenue)\n\nIncludes: vegetables, oil, gas, packaging, dairy, meat, spices, beverages.`;
  }

  if (/where.*(money|spend|going)|breakdown/i.test(normalized)) {
    const breakdown = getExpenseBreakdown(transactions);
    const lines = breakdown.slice(0, 5).map(b => `  • ${b.name}: ${formatINR(b.value)} (${b.percentage}%)`);
    return `📊 Expense Breakdown:\n\n${lines.join('\n')}`;
  }

  // Not a question, return null for normal parsing
  return null;
};
