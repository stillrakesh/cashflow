import { db } from './firebase';
import {
  collection, doc, setDoc, onSnapshot,
  deleteDoc, query, orderBy, where, limit, writeBatch
} from 'firebase/firestore';
import type { Vendor, VendorTransaction, Transaction } from '../types';

// ============================================
// Collection Path Helpers (Org-Scoped)
// ============================================
const vendorCol = (orgId: string) => collection(db, 'organizations', orgId, 'vendors');
const vendorDoc = (orgId: string, vendorId: string) => doc(db, 'organizations', orgId, 'vendors', vendorId);
const vendorTxnCol = (orgId: string) => collection(db, 'organizations', orgId, 'vendorTransactions');
const vendorTxnDoc = (orgId: string, txnId: string) => doc(db, 'organizations', orgId, 'vendorTransactions', txnId);
const orgTxnDoc = (orgId: string, txnId: string) => doc(db, 'organizations', orgId, 'transactions', txnId);

// ============================================
// Vendor CRUD
// ============================================
export const saveVendorProfile = async (orgId: string, vendor: Vendor) => {
  try {
    await setDoc(vendorDoc(orgId, vendor.id), vendor);
  } catch (err) {
    console.error('[VendorDB] Failed to save vendor:', err);
    throw err;
  }
};

export const deleteVendorProfile = async (orgId: string, vendorId: string) => {
  try {
    // Soft delete
    await setDoc(vendorDoc(orgId, vendorId), { status: 'inactive', updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('[VendorDB] Failed to delete vendor:', err);
    throw err;
  }
};

export const hardDeleteVendorProfile = async (orgId: string, vendorId: string) => {
  await deleteDoc(vendorDoc(orgId, vendorId));
};

export const listenToVendorProfiles = (orgId: string, callback: (vendors: Vendor[]) => void) => {
  const q = query(vendorCol(orgId), orderBy('name', 'asc'));
  return onSnapshot(q, (snap) => {
    const vendors: Vendor[] = [];
    snap.forEach(d => vendors.push({ ...d.data(), id: d.id } as Vendor));
    callback(vendors);
  }, (err) => {
    console.error('[VendorDB] Error listening to vendors:', err);
  });
};

// ============================================
// Vendor Transactions
// ============================================
export const saveVendorTransaction = async (
  orgId: string,
  vendorTxn: VendorTransaction,
  globalTxn?: Transaction // only for payment/advance types that affect cashflow
) => {
  try {
    console.log('[VendorDB] Saving vendor transaction:', vendorTxn.id);
    const batch = writeBatch(db);
    batch.set(vendorTxnDoc(orgId, vendorTxn.id), vendorTxn);
    if (globalTxn) {
      batch.set(orgTxnDoc(orgId, globalTxn.id), globalTxn);
    }
    await batch.commit();
    console.log('[VendorDB] Vendor transaction saved:', vendorTxn.id);
  } catch (err) {
    console.error('[VendorDB] Failed to save vendor transaction:', err);
    throw err;
  }
};

export const deleteVendorTransaction = async (orgId: string, vendorTxnId: string, globalTxnId?: string) => {
  try {
    const batch = writeBatch(db);
    batch.delete(vendorTxnDoc(orgId, vendorTxnId));
    if (globalTxnId) {
      batch.delete(orgTxnDoc(orgId, globalTxnId));
    }
    await batch.commit();
    console.log('[VendorDB] Vendor transaction deleted:', vendorTxnId);
  } catch (err) {
    console.error('[VendorDB] Failed to delete vendor transaction:', err);
    throw err;
  }
};

export const listenToVendorTransactions = (
  orgId: string,
  callback: (txns: VendorTransaction[]) => void,
  vendorId?: string
) => {
  let q;
  if (vendorId) {
    q = query(vendorTxnCol(orgId), where('vendorId', '==', vendorId), orderBy('date', 'desc'), limit(200));
  } else {
    q = query(vendorTxnCol(orgId), orderBy('date', 'desc'), limit(500));
  }
  return onSnapshot(q, (snap) => {
    const txns: VendorTransaction[] = [];
    snap.forEach(d => txns.push({ ...d.data(), id: d.id } as VendorTransaction));
    callback(txns);
  }, (err) => {
    console.error('[VendorDB] Error listening to vendor transactions:', err);
  });
};
