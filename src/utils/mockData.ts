// ============================================
// CafeFlow v3.5 — Realistic Data Enrichment
// ============================================

import type { Transaction, User, VersionInfo } from '../types';

export const mockUsers: User[] = [
  { id: '1', name: 'Rakesh (Admin)', email: 'admin@cafe.com', role: 'admin', pin: '1234' },
  { id: '2', name: 'John (Staff)', email: 'john@cafe.com', role: 'user', pin: '1234' },
  { id: '3', name: 'Alice (Staff)', email: 'alice@cafe.com', role: 'user', pin: '1234' },
];

const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
};

const generateMockSales = () => {
  const tx: Transaction[] = [];
  const vendors = ['Lunch Rush', 'Dinner Rush', 'Delivery App', 'Evening Tea', 'B-day Party'];
  
  // Last 30 days
  for (let i = 0; i < 30; i++) {
    // 1-3 sales per day
    const numSales = Math.floor(Math.random() * 2) + 1;
    for (let j = 0; j < numSales; j++) {
      const amt = Math.floor(Math.random() * 5000) + 2000;
      tx.push({
        id: `s-${i}-${j}`,
        type: 'sale',
        amount: amt,
        date: daysAgo(i, 12 + (j * 4)),
        status: 'approved',
        userId: '1',
        userName: 'Rakesh (Admin)',
        category: 'sale',
        paymentType: Math.random() > 0.4 ? 'upi' : 'cash',
        notes: vendors[Math.floor(Math.random() * vendors.length)],
        createdAt: daysAgo(i, 10)
      });
    }
  }
  return tx;
};

const generateMockExpenses = () => {
  const tx: Transaction[] = [];
  const staff = [
    { id: '2', name: 'John (Staff)' },
    { id: '3', name: 'Alice (Staff)' },
    { id: '1', name: 'Rakesh (Admin)' }
  ];

  // Restock logic (every few days)
  for (let i = 0; i < 30; i++) {
    if (i % 2 === 0) { // Veggies every 2 days
      const s = staff[i % 3];
      tx.push({
        id: `e-v-${i}`, type: 'expense', amount: Math.floor(Math.random() * 1500) + 500,
        date: daysAgo(i, 8), status: 'approved', userId: s.id, userName: s.name,
        category: 'vegetables', paymentType: 'cash', notes: 'Mandai Market Purchase',
        createdAt: daysAgo(i, 7)
      });
    }
    if (i % 3 === 0) { // Dairy every 3 days
      const s = staff[(i + 1) % 3];
      tx.push({
        id: `e-d-${i}`, type: 'expense', amount: Math.floor(Math.random() * 1200) + 800,
        date: daysAgo(i, 9), status: 'approved', userId: s.id, userName: s.name,
        category: 'dairy', paymentType: 'upi', notes: 'Milk & Curd Restock',
        createdAt: daysAgo(i, 8)
      });
    }
    if (i % 7 === 0) { // Meat every week
      tx.push({
        id: `e-m-${i}`, type: 'expense', amount: Math.floor(Math.random() * 4000) + 2000,
        date: daysAgo(i, 10), status: 'approved', userId: '1', userName: 'Rakesh (Admin)',
        category: 'meat', paymentType: 'bank', notes: 'Whole chicken bulk purchase',
        createdAt: daysAgo(i, 9)
      });
    }
  }

  // Monthly Fixed Costs (approx 5 days ago)
  tx.push({
    id: 'f-1', type: 'expense', amount: 25000, date: daysAgo(5, 11), status: 'approved',
    userId: '1', userName: 'Rakesh (Admin)', category: 'rent', paymentType: 'bank',
    notes: 'Monthly Cafe Rent', classification: 'fixed'
  });
  tx.push({
    id: 'f-2', type: 'expense', amount: 8500, date: daysAgo(4, 14), status: 'approved',
    userId: '1', userName: 'Rakesh (Admin)', category: 'utilities', paymentType: 'bank',
    notes: 'Electricity Bill', classification: 'fixed'
  });
  tx.push({
    id: 'f-3', type: 'expense', amount: 5000, date: daysAgo(2, 10), status: 'approved',
    userId: '1', userName: 'Rakesh (Admin)', category: 'salary', paymentType: 'bank',
    notes: 'Part-time staff salary', classification: 'fixed'
  });

  return tx;
};

export const mockTransactions: Transaction[] = [
  ...generateMockSales(),
  ...generateMockExpenses()
];

export const versions: VersionInfo[] = [
  {
    version: '3.5.0',
    date: '2026-04-07',
    changelog: [
      'Split Login (Admin Manual entry vs Staff Profile selection)',
      'Advanced Verification-based Admin PIN recovery (Email/Mobile)',
      'Granular Data Manager with date-range wiping',
      'Realistic high-volume mock data set',
      'Staff PIN reset tool for Admins',
    ],
  },
  {
    version: '3.1.0',
    date: '2026-04-06',
    changelog: [
      'Multi-User RBAC system with Privacy Mode',
      'AI Vision receipt scanning (Gemini 1.5 Flash)',
      'High-fidelity Branded PDF generating',
      'Persistent Security PIN Lock',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-04-05',
    changelog: [
      'Initial release of Cafe Financial Dashboard',
      'Basic sales & expense tracking',
    ],
  },
];
