import { db } from './firebase';
import {
  collection, doc, setDoc, getDocs, onSnapshot,
  deleteDoc, query, orderBy, where, limit, writeBatch
} from 'firebase/firestore';
import type { StaffMember, StaffTransaction, Transaction } from '../types';

// ============================================
// Collection Path Helpers (Org-Scoped)
// ============================================
const staffCol = (orgId: string) => collection(db, 'organizations', orgId, 'staff');
const staffDoc = (orgId: string, staffId: string) => doc(db, 'organizations', orgId, 'staff', staffId);
const staffTxnCol = (orgId: string) => collection(db, 'organizations', orgId, 'staffTransactions');
const staffTxnDoc = (orgId: string, txnId: string) => doc(db, 'organizations', orgId, 'staffTransactions', txnId);
const orgTxnDoc = (orgId: string, txnId: string) => doc(db, 'organizations', orgId, 'transactions', txnId);

// ============================================
// Staff CRUD
// ============================================
export const saveStaffMember = async (orgId: string, staff: StaffMember) => {
  await setDoc(staffDoc(orgId, staff.id), staff);
};

export const deleteStaffMember = async (orgId: string, staffId: string) => {
  try {
    // Soft delete: just update status to inactive
    await setDoc(staffDoc(orgId, staffId), { status: 'inactive', updatedAt: new Date().toISOString() }, { merge: true });
    console.log('[StaffDB] Staff member soft deleted successfully:', staffId);
  } catch (err) {
    console.error('[StaffDB] Failed to delete staff member:', err);
    throw err;
  }
};

export const hardDeleteStaffMember = async (orgId: string, staffId: string) => {
  await deleteDoc(staffDoc(orgId, staffId));
};

export const listenToStaff = (orgId: string, callback: (staff: StaffMember[]) => void) => {
  const q = query(staffCol(orgId), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const staff: StaffMember[] = [];
    snapshot.forEach(d => staff.push({ ...d.data(), id: d.id } as StaffMember));
    callback(staff);
  }, (error) => {
    console.error('[StaffDB] Error listening to staff:', error);
  });
};

// ============================================
// Staff Transactions
// ============================================
export const saveStaffTransaction = async (
  orgId: string,
  staffTxn: StaffTransaction,
  globalTxn?: Transaction
) => {
  try {
    console.log('[StaffDB] Attempting to save staff transaction:', staffTxn.id, staffTxn);
    const batch = writeBatch(db);
    batch.set(staffTxnDoc(orgId, staffTxn.id), staffTxn);
    if (globalTxn) {
      batch.set(orgTxnDoc(orgId, globalTxn.id), globalTxn);
    }
    await batch.commit();
    console.log('[StaffDB] Staff transaction saved successfully:', staffTxn.id);
  } catch (err) {
    console.error('[StaffDB] CRITICAL: Failed to save staff transaction:', err);
    throw err;
  }
};

export const deleteStaffTransaction = async (orgId: string, staffTxnId: string, globalTxnId?: string) => {
  try {
    const batch = writeBatch(db);
    batch.delete(staffTxnDoc(orgId, staffTxnId));
    if (globalTxnId) {
      batch.delete(orgTxnDoc(orgId, globalTxnId));
    }
    await batch.commit();
    console.log('[StaffDB] Transaction deleted successfully:', staffTxnId);
  } catch (err) {
    console.error('[StaffDB] Failed to delete staff transaction:', err);
    throw err;
  }
};

export const listenToStaffTransactions = (
  orgId: string,
  callback: (txns: StaffTransaction[]) => void,
  staffId?: string
) => {
  let q;
  if (staffId) {
    q = query(staffTxnCol(orgId), where('staffId', '==', staffId), orderBy('date', 'desc'), limit(100));
  } else {
    q = query(staffTxnCol(orgId), orderBy('date', 'desc'), limit(200));
  }
  return onSnapshot(q, (snapshot) => {
    const txns: StaffTransaction[] = [];
    snapshot.forEach(d => txns.push({ ...d.data(), id: d.id } as StaffTransaction));
    callback(txns);
  }, (error) => {
    console.error('[StaffDB] Error listening to staff transactions:', error);
  });
};

export const getStaffTransactionsByMember = async (orgId: string, staffId: string): Promise<StaffTransaction[]> => {
  const q = query(staffTxnCol(orgId), where('staffId', '==', staffId), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as StaffTransaction));
};
