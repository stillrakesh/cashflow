import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, onSnapshot, deleteDoc, writeBatch, query, where, limit, orderBy } from 'firebase/firestore';
import type { Transaction, User, Organization, Shift, DailyReport, Vendor, RecurringExpense, CategoryConfig } from '../types';

// ============================================
// Collection Path Helpers (Tenant-Scoped)
// ============================================
const orgDoc = (orgId: string) => doc(db, 'organizations', orgId);
const membersCol = (orgId: string) => collection(db, 'organizations', orgId, 'members');
const memberDoc = (orgId: string, userId: string) => doc(db, 'organizations', orgId, 'members', userId);
const txnCol = (orgId: string) => collection(db, 'organizations', orgId, 'transactions');
const txnDoc = (orgId: string, txnId: string) => doc(db, 'organizations', orgId, 'transactions', txnId);
const settingsDoc = (orgId: string) => doc(db, 'organizations', orgId, 'settings', 'app');
const shiftCol = (orgId: string) => collection(db, 'organizations', orgId, 'shifts');
const shiftDoc = (orgId: string, shiftId: string) => doc(db, 'organizations', orgId, 'shifts', shiftId);
const reportCol = (orgId: string) => collection(db, 'organizations', orgId, 'dailyReports');
const reportDoc = (orgId: string, dateId: string) => doc(db, 'organizations', orgId, 'dailyReports', dateId);
const vendorCol = (orgId: string) => collection(db, 'organizations', orgId, 'vendors');
const vendorDoc = (orgId: string, vendorId: string) => doc(db, 'organizations', orgId, 'vendors', vendorId);
const recurringCol = (orgId: string) => collection(db, 'organizations', orgId, 'recurringExpenses');
const recurringDoc = (orgId: string, recId: string) => doc(db, 'organizations', orgId, 'recurringExpenses', recId);

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  // COGS / Variable (raw materials & consumables)
  { id: 'cat_veg', name: 'vegetables', classification: 'variable', icon: '🥬' },
  { id: 'cat_oil', name: 'oil', classification: 'variable', icon: '🫒' },
  { id: 'cat_dairy', name: 'dairy', classification: 'variable', icon: '🥛' },
  { id: 'cat_meat', name: 'meat', classification: 'variable', icon: '🍖' },
  { id: 'cat_spice', name: 'spices', classification: 'variable', icon: '🌶️' },
  { id: 'cat_bev', name: 'beverages', classification: 'variable', icon: '☕' },
  { id: 'cat_gas', name: 'gas', classification: 'variable', icon: '⛽' },
  { id: 'cat_pack', name: 'packaging', classification: 'variable', icon: '📦' },
  { id: 'cat_clean', name: 'cleaning', classification: 'variable', icon: '🧹' },
  { id: 'cat_trans', name: 'transport', classification: 'variable', icon: '🚛' },
  { id: 'cat_waste', name: 'wastage', classification: 'variable', icon: '🗑️' },
  { id: 'cat_commission', name: 'commissions', classification: 'variable', icon: '💸' },
  // Fixed / Overhead
  { id: 'cat_rent', name: 'rent', classification: 'fixed', icon: '🏠' },
  { id: 'cat_util', name: 'utilities', classification: 'fixed', icon: '💡' },
  { id: 'cat_sal', name: 'salary', classification: 'fixed', icon: '👥' },
  { id: 'cat_mark', name: 'marketing', classification: 'fixed', icon: '📣' },
  { id: 'cat_insure', name: 'insurance', classification: 'fixed', icon: '🛡️' },
  { id: 'cat_license', name: 'licenses', classification: 'fixed', icon: '📋' },
  { id: 'cat_laundry', name: 'laundry', classification: 'fixed', icon: '👔' },
  { id: 'cat_pest', name: 'pest control', classification: 'fixed', icon: '🪲' },
  { id: 'cat_loan', name: 'loan / EMI', classification: 'fixed', icon: '🏦' },
  { id: 'cat_tax', name: 'taxes', classification: 'fixed', icon: '🧾' },
  // One-Time / CapEx
  { id: 'cat_equip', name: 'equipment', classification: 'one-time', icon: '🔧' },
  { id: 'cat_repair', name: 'repairs', classification: 'one-time', icon: '🛠️' },
  { id: 'cat_furniture', name: 'furniture', classification: 'one-time', icon: '🪑' },
  { id: 'cat_decor', name: 'renovation', classification: 'one-time', icon: '🎨' },
  // Other
  { id: 'cat_misc', name: 'misc', classification: 'variable', icon: '📝' },
];

// ============================================
// Organization CRUD
// ============================================
export const createOrganization = async (org: Organization, adminUser: User) => {
  // 1. Create the organization doc
  await setDoc(orgDoc(org.id), org);
  // 2. Create the admin as the first member in the org
  await setDoc(memberDoc(org.id, adminUser.id), adminUser);
  // 3. Also store a flat user-lookup record for login resolution
  await setDoc(doc(db, 'userLookup', adminUser.id), {
    orgId: org.id,
    email: adminUser.email,
    username: adminUser.username,
    role: adminUser.role,
  });
};

export const listenToOrganization = (orgId: string, callback: (org: Organization | null) => void) => {
  return onSnapshot(orgDoc(orgId), (snap) => {
    callback(snap.exists() ? { ...snap.data(), id: snap.id } as Organization : null);
  }, (error) => {
    console.error("Error listening to organization:", error);
  });
};

export const updateOrganization = async (orgId: string, updates: Partial<Organization>) => {
  await setDoc(orgDoc(orgId), updates, { merge: true });
};

// ============================================
// User Lookup (for login — finds which org a user belongs to)
// ============================================
export const findOrgByCredential = async (credential: string): Promise<{ orgId: string; userId: string } | null> => {
  const q1 = credential.toLowerCase().trim();
  
  // Search the flat userLookup collection by email
  const emailQuery = query(collection(db, 'userLookup'), where('email', '==', q1), limit(1));
  const emailSnap = await getDocs(emailQuery);
  if (!emailSnap.empty) {
    const data = emailSnap.docs[0].data();
    return { orgId: data.orgId, userId: emailSnap.docs[0].id };
  }
  
  // Search by username
  const usernameQuery = query(collection(db, 'userLookup'), where('username', '==', q1), limit(1));
  const usernameSnap = await getDocs(usernameQuery);
  if (!usernameSnap.empty) {
    const data = usernameSnap.docs[0].data();
    return { orgId: data.orgId, userId: usernameSnap.docs[0].id };
  }
  
  return null;
};

// Check if an email or username is already taken globally
export const isCredentialTaken = async (email: string, username: string): Promise<boolean> => {
  const emailQ = query(collection(db, 'userLookup'), where('email', '==', email.toLowerCase().trim()), limit(1));
  const emailSnap = await getDocs(emailQ);
  if (!emailSnap.empty) return true;
  
  const usernameQ = query(collection(db, 'userLookup'), where('username', '==', username.toLowerCase().trim()), limit(1));
  const usernameSnap = await getDocs(usernameQ);
  if (!usernameSnap.empty) return true;
  
  return false;
};

// ============================================
// Members (Org-Scoped Users)
// ============================================
export const listenToOrgMembers = (orgId: string, callback: (users: User[]) => void) => {
  return onSnapshot(membersCol(orgId), (snapshot) => {
    const users: User[] = [];
    snapshot.forEach(d => {
      users.push({ ...d.data(), id: d.id } as User);
    });
    callback(users);
  }, (error) => {
    console.error("Error listening to org members:", error);
  });
};

export const addOrgMember = async (orgId: string, user: User) => {
  await setDoc(memberDoc(orgId, user.id), user);
  // Also add to the flat lookup for login resolution
  await setDoc(doc(db, 'userLookup', user.id), {
    orgId,
    email: user.email,
    username: user.username,
    role: user.role,
  });
};

export const updateOrgMember = async (orgId: string, user: User) => {
  await setDoc(memberDoc(orgId, user.id), user, { merge: true });
  // Keep lookup in sync
  await setDoc(doc(db, 'userLookup', user.id), {
    orgId,
    email: user.email,
    username: user.username,
    role: user.role,
  }, { merge: true });
};

export const deleteOrgMember = async (orgId: string, userId: string) => {
  await deleteDoc(memberDoc(orgId, userId));
  await deleteDoc(doc(db, 'userLookup', userId));
};

// ============================================
// Workspace Cleanup (Admin Account Deletion)
// ============================================
export const deleteOrganization = async (orgId: string) => {
  // 1. Delete all members and their lookup entries
  const membersSnap = await getDocs(membersCol(orgId));
  const batch1 = writeBatch(db);
  membersSnap.forEach(d => {
    batch1.delete(d.ref);
    batch1.delete(doc(db, 'userLookup', d.id));
  });
  await batch1.commit();

  // 2. Delete all transactions (batching in chunks of 500 if needed, simplified for now)
  const txnsSnap = await getDocs(txnCol(orgId));
  const batch2 = writeBatch(db);
  let count = 0;
  for (const d of txnsSnap.docs) {
    batch2.delete(d.ref);
    count++;
    if (count % 490 === 0) {
      await batch2.commit();
    }
  }
  if (count % 490 !== 0) await batch2.commit();

  // 3. Delete settings and the org doc itself
  await deleteDoc(settingsDoc(orgId));
  await deleteDoc(orgDoc(orgId));
};

// ============================================
// Transactions (Org-Scoped)
// ============================================
export const listenToTransactions = (orgId: string, callback: (transactions: Transaction[]) => void) => {
  return onSnapshot(txnCol(orgId), (snapshot) => {
    const txns: Transaction[] = [];
    snapshot.forEach(d => {
      txns.push(d.data() as Transaction);
    });
    // Sort by descending creation/update time
    txns.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || a.date).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || b.date).getTime();
      return timeB - timeA;
    });
    callback(txns);
  }, (error) => {
    console.error("Error listening to transactions:", error);
  });
};

export const addTransactionToDb = async (orgId: string, txn: Transaction) => {
  try {
    console.log('[CafeFlow DB] Attempting to save transaction:', txn.id, txn);
    await setDoc(txnDoc(orgId, txn.id), txn);
    console.log('[CafeFlow DB] Transaction saved successfully:', txn.id);
  } catch (error) {
    console.error('[CafeFlow DB] CRITICAL: Failed to add transaction:', error);
    throw error;
  }
};

export const updateTransactionInDb = async (orgId: string, id: string, updates: Partial<Transaction>) => {
  await setDoc(txnDoc(orgId, id), updates, { merge: true });
};

export const deleteTransactionFromDb = async (orgId: string, id: string) => {
  await deleteDoc(txnDoc(orgId, id));
};

// ============================================
// Org Settings (Org-Scoped)
// ============================================
export const listenToOrgSettings = (orgId: string, callback: (settings: any) => void) => {
  return onSnapshot(settingsDoc(orgId), (snap) => {
    callback(snap.exists() ? snap.data() : {});
  }, (error) => {
    console.error("Error listening to org settings:", error);
  });
};

export const updateOrgSettings = async (orgId: string, updates: any) => {
  await setDoc(settingsDoc(orgId), updates, { merge: true });
};

// ============================================
// One-Time Migration: Move existing flat data into an org
// ============================================
export const migrateExistingData = async () => {
  // Check if old flat collections exist
  const oldUsersSnap = await getDocs(collection(db, 'users'));
  const oldTxnSnap = await getDocs(collection(db, 'transactions'));
  
  if (oldUsersSnap.empty && oldTxnSnap.empty) return null; // Nothing to migrate
  
  // Check if migration already completed
  const migrationDoc = await getDocs(collection(db, 'organizations'));
  if (!migrationDoc.empty) return null; // Orgs already exist, skip
  
  console.log('[Migration] Migrating existing data to multi-tenant structure...');
  
  const orgId = 'org_' + Date.now().toString(36);
  const now = new Date().toISOString();
  
  // Find the admin user to use as org creator
  const oldUsers: User[] = [];
  oldUsersSnap.forEach(d => oldUsers.push({ ...d.data(), id: d.id } as User));
  
  const admin = oldUsers.find(u => u.role === 'admin') || oldUsers[0];
  
  const batch = writeBatch(db);
  
  // 1. Create org
  const org: Organization = {
    id: orgId,
    name: 'My Business',
    businessType: 'restaurant',
    currency: 'INR',
    plan: 'free',
    createdAt: now,
    createdBy: admin?.id || 'unknown',
  };
  batch.set(orgDoc(orgId), org);
  
  // 2. Migrate users as members
  oldUsers.forEach(u => {
    const member = { ...u, orgId };
    batch.set(memberDoc(orgId, u.id), member);
    batch.set(doc(db, 'userLookup', u.id), {
      orgId,
      email: u.email || '',
      username: u.username || u.name.toLowerCase().replace(/\s+/g, '_'),
      role: u.role,
    });
  });
  
  // 3. Migrate transactions
  const oldTxns: Transaction[] = [];
  oldTxnSnap.forEach(d => oldTxns.push(d.data() as Transaction));
  
  // Batch limit is 500; split if needed
  const toMigrate = oldTxns.slice(0, 450);
  toMigrate.forEach(t => {
    const txn = { ...t, orgId };
    batch.set(txnDoc(orgId, t.id), txn);
  });
  
  // 4. Migrate settings
  try {
    const oldSettings = await getDocs(collection(db, 'settings'));
    oldSettings.forEach(d => {
      batch.set(settingsDoc(orgId), d.data(), { merge: true } as any);
    });
  } catch { /* no settings to migrate */ }
  
  await batch.commit();
  console.log(`[Migration] Complete. Created org "${orgId}" with ${oldUsers.length} users and ${toMigrate.length} transactions.`);
  
  return { orgId, org };
};

// ============================================
// Shift Logging & Reconciliation
// ============================================
export const listenToActiveShift = (orgId: string, userId: string, callback: (shift: Shift | null) => void) => {
  const q = query(shiftCol(orgId), where('userId', '==', userId), where('status', '==', 'open'), limit(1));
  return onSnapshot(q, (snap) => {
    if (!snap.empty) {
      callback({ ...snap.docs[0].data(), id: snap.docs[0].id } as Shift);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error listening to active shift:", error);
  });
};

export const listenToAllShifts = (orgId: string, callback: (shifts: Shift[]) => void) => {
  return onSnapshot(shiftCol(orgId), (snap) => {
    const shifts: Shift[] = [];
    snap.forEach(d => shifts.push({ ...d.data(), id: d.id } as Shift));
    shifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    callback(shifts);
  });
};

export const startShift = async (orgId: string, shift: Shift) => {
  await setDoc(shiftDoc(orgId, shift.id), shift);
};

export const endShift = async (orgId: string, shiftId: string, updates: Partial<Shift>) => {
  await setDoc(shiftDoc(orgId, shiftId), updates, { merge: true });
};

// ============================================
// Backup & Restore
// ============================================
export const getCompleteOrgData = async (orgId: string) => {
  const orgSnap = await getDoc(orgDoc(orgId));
  const membersSnap = await getDocs(membersCol(orgId));
  const txnsSnap = await getDocs(txnCol(orgId));
  const shiftsSnap = await getDocs(shiftCol(orgId));
  const settingsSnap = await getDoc(settingsDoc(orgId));

  return {
    organization: orgSnap.exists() ? orgSnap.data() as Organization : null,
    members: membersSnap.docs.map(d => d.data() as User),
    transactions: txnsSnap.docs.map(d => d.data() as Transaction),
    shifts: shiftsSnap.docs.map(d => d.data() as Shift),
    settings: settingsSnap.exists() ? settingsSnap.data() : null
  };
};

export const restoreCompleteOrgData = async (orgId: string, data: any) => {
  const batch = writeBatch(db);

  // Restore Organization doc
  if (data.organization) {
    batch.set(orgDoc(orgId), data.organization);
  }

  // Restore Members and userLookup
  if (Array.isArray(data.members)) {
    data.members.forEach((m: User) => {
      batch.set(memberDoc(orgId, m.id), m);
      batch.set(doc(db, 'userLookup', m.id), {
        orgId: orgId,
        email: m.email || '',
        username: m.username || '',
        role: m.role,
      });
    });
  }

  // Restore Transactions
  if (Array.isArray(data.transactions)) {
    data.transactions.forEach((t: Transaction) => {
      batch.set(txnDoc(orgId, t.id), t);
    });
  }

  // Restore Shifts
  if (Array.isArray(data.shifts)) {
    data.shifts.forEach((s: Shift) => {
      batch.set(shiftDoc(orgId, s.id), s);
    });
  }

  // Restore Settings
  if (data.settings) {
    batch.set(settingsDoc(orgId), data.settings);
  }

  await batch.commit();
};
// ============================================
// Daily Reports (Day Closing)
// ============================================
export const saveDailyReport = async (orgId: string, report: DailyReport) => {
  const docRef = reportDoc(orgId, report.id);
  await setDoc(docRef, { ...report, orgId });
};

export const deleteDailyReport = async (orgId: string, reportId: string) => {
  const docRef = reportDoc(orgId, reportId);
  await deleteDoc(docRef);
};

export const listenToDailyReports = (orgId: string, callback: (reports: DailyReport[]) => void) => {
  const q = query(reportCol(orgId), orderBy('date', 'desc'), limit(30));
  return onSnapshot(q, (snapshot) => {
    const reports: DailyReport[] = [];
    snapshot.forEach(d => reports.push({ ...d.data(), id: d.id } as DailyReport));
    callback(reports);
  });
};

// ============================================
// Vendors (Org-Scoped)
// ============================================
export const listenToVendors = (orgId: string, callback: (vendors: Vendor[]) => void) => {
  return onSnapshot(vendorCol(orgId), (snap) => {
    const vendors: Vendor[] = [];
    snap.forEach(d => vendors.push({ ...d.data(), id: d.id } as Vendor));
    vendors.sort((a, b) => a.name.localeCompare(b.name));
    callback(vendors);
  }, (error) => {
    console.error("Error listening to vendors:", error);
  });
};

export const saveVendor = async (orgId: string, vendor: Vendor) => {
  await setDoc(vendorDoc(orgId, vendor.id), vendor);
};

export const deleteVendor = async (orgId: string, vendorId: string) => {
  await deleteDoc(vendorDoc(orgId, vendorId));
};

// ============================================
// Recurring Expenses (Org-Scoped)
// ============================================
export const listenToRecurringExpenses = (orgId: string, callback: (expenses: RecurringExpense[]) => void) => {
  return onSnapshot(recurringCol(orgId), (snap) => {
    const expenses: RecurringExpense[] = [];
    snap.forEach(d => expenses.push({ ...d.data(), id: d.id } as RecurringExpense));
    expenses.sort((a, b) => a.name.localeCompare(b.name));
    callback(expenses);
  }, (error) => {
    console.error("Error listening to recurring expenses:", error);
  });
};

export const saveRecurringExpense = async (orgId: string, expense: RecurringExpense) => {
  await setDoc(recurringDoc(orgId, expense.id), expense);
};

export const updateRecurringExpense = async (orgId: string, recId: string, updates: Partial<RecurringExpense>) => {
  await setDoc(recurringDoc(orgId, recId), updates, { merge: true });
};

export const deleteRecurringExpense = async (orgId: string, recId: string) => {
  await deleteDoc(recurringDoc(orgId, recId));
};
