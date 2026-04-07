import { db } from './firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, deleteDoc, writeBatch } from 'firebase/firestore';
import type { Transaction, User } from '../types';

export const USERS_COLLECTION = 'users';
export const TRANSACTIONS_COLLECTION = 'transactions';

// Snapshot listeners
export const listenToTransactions = (callback: (transactions: Transaction[]) => void) => {
  return onSnapshot(collection(db, TRANSACTIONS_COLLECTION), (snapshot) => {
    const txns: Transaction[] = [];
    snapshot.forEach(doc => {
      txns.push(doc.data() as Transaction);
    });
    // Sort by descending date
    txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(txns);
  }, (error) => {
    console.error("Error listening to transactions: ", error);
  });
};

export const listenToUsers = (callback: (users: User[]) => void) => {
  return onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
    const users: User[] = [];
    snapshot.forEach(doc => {
      users.push({ ...doc.data(), id: doc.id } as User);
    });
    callback(users);
  }, (error) => {
    console.error("Error listening to users: ", error);
  });
};

// CRUD Operations
export const addTransactionToDb = async (txn: Transaction) => {
  const docRef = doc(collection(db, TRANSACTIONS_COLLECTION), txn.id);
  await setDoc(docRef, txn);
};

export const updateTransactionInDb = async (id: string, updates: Partial<Transaction>) => {
  const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
  await setDoc(docRef, updates, { merge: true });
};

export const deleteTransactionFromDb = async (id: string) => {
  const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const updateUserInDb = async (user: User) => {
  const docRef = doc(db, USERS_COLLECTION, user.id);
  await setDoc(docRef, user);
};

export const deleteUserFromDb = async (id: string) => {
  const docRef = doc(db, USERS_COLLECTION, id);
  await deleteDoc(docRef);
};

// DB Initialization / Migration
export const initializeDatabase = async (mockUsers: User[], localTransactions: Transaction[]) => {
  const usersRef = collection(db, USERS_COLLECTION);
  const usersSnap = await getDocs(usersRef);

  const batch = writeBatch(db);
  let isMigrating = false;

  // 1. Seed users if empty
  if (usersSnap.empty) {
    console.log("Empty users collection. Seeding initial users...");
    mockUsers.forEach(u => {
      const ref = doc(db, USERS_COLLECTION, u.id);
      batch.set(ref, u);
    });
    isMigrating = true;
  }

  // 2. Migrate transactions if any local exist but cloud is empty
  const rxRef = collection(db, TRANSACTIONS_COLLECTION);
  const rxSnap = await getDocs(rxRef);
  
  if (rxSnap.empty && localTransactions.length > 0) {
    console.log(`Migrating ${localTransactions.length} local transactions to Firestore...`);
    // Batch writes are limited to 500 ops. We will migrate up to 400 at a time safely.
    const toMigrate = localTransactions.slice(0, 400); 
    toMigrate.forEach(t => {
      const ref = doc(db, TRANSACTIONS_COLLECTION, t.id);
      batch.set(ref, t);
    });
    isMigrating = true;
  }

  if (isMigrating) {
    await batch.commit();
    console.log("Database initialized/migrated successfully.");
  }
};
