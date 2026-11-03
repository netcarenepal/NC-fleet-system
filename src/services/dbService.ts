import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/config';
import {
  Customer,
  Subscription,
  SubscriptionPackage,
  InventoryItem,
  WorkOrder,
  Dealer,
  DealerStockRequest,
  DealerRenewalRequest,
  DealerCommissionRecord,
  Invoice,
  Expense,
  IncomeTransaction,
  AuditLog,
  UserProfile,
  StockMovement,
  Supplier,
  SystemConfig,
} from '../types/erp';
import {
  INITIAL_CUSTOMERS,
  INITIAL_PACKAGES,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_INVENTORY,
  INITIAL_WORK_ORDERS,
  INITIAL_DEALERS,
  INITIAL_DEALER_STOCK_REQUESTS,
  INITIAL_DEALER_RENEWAL_REQUESTS,
  INITIAL_DEALER_COMMISSIONS,
  INITIAL_INVOICES,
  INITIAL_EXPENSES,
  INITIAL_INCOME_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_USERS,
  INITIAL_SUPPLIERS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SYSTEM_CONFIG,
} from './seedData';

// Helper to log audit trail
export async function logAuditEvent(
  action: string,
  module: AuditLog['module'],
  details: string,
  user?: { id?: string; name?: string; role?: any },
  recordId?: string,
  changeDetails?: Record<string, any>
) {
  const path = 'auditLogs';
  const logId = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const auditData: AuditLog = {
    id: logId,
    actorId: user?.id || auth.currentUser?.uid || 'usr-system',
    actorName: user?.name || auth.currentUser?.displayName || 'System User',
    actorRole: user?.role || 'ceo',
    action,
    module,
    recordId,
    details,
    changeDetails,
    ipAddress: '103.141.22.8 (Kathmandu)',
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, path, logId), auditData);
  } catch (error) {
    console.warn('Non-blocking audit log error:', error);
  }
}

// Check & Seed Initial Database if empty
export async function seedDatabaseIfEmpty(): Promise<boolean> {
  if (!auth.currentUser) {
    // Only attempt database seed when an active authenticated session exists
    return false;
  }
  const path = 'customers';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      console.log('Seeding initial Netcare Nepal ERP data into Cloud Firestore...');
      // Seed Customers
      for (const item of INITIAL_CUSTOMERS) {
        await setDoc(doc(db, 'customers', item.id), item);
      }
      // Seed Packages
      for (const item of INITIAL_PACKAGES) {
        await setDoc(doc(db, 'packages', item.id), item);
      }
      // Seed Subscriptions
      for (const item of INITIAL_SUBSCRIPTIONS) {
        await setDoc(doc(db, 'subscriptions', item.id), item);
      }
      // Seed Inventory
      for (const item of INITIAL_INVENTORY) {
        await setDoc(doc(db, 'inventory', item.id), item);
      }
      // Seed Work Orders
      for (const item of INITIAL_WORK_ORDERS) {
        await setDoc(doc(db, 'workOrders', item.id), item);
      }
      // Seed Dealers
      for (const item of INITIAL_DEALERS) {
        await setDoc(doc(db, 'dealers', item.id), item);
      }
      // Seed Invoices
      for (const item of INITIAL_INVOICES) {
        await setDoc(doc(db, 'invoices', item.id), item);
      }
      // Seed Expenses
      for (const item of INITIAL_EXPENSES) {
        await setDoc(doc(db, 'expenses', item.id), item);
      }
      // Seed Income Transactions
      for (const item of INITIAL_INCOME_TRANSACTIONS) {
        await setDoc(doc(db, 'incomeTransactions', item.id), item);
      }
      // Seed Audit Logs
      for (const item of INITIAL_AUDIT_LOGS) {
        await setDoc(doc(db, 'auditLogs', item.id), item);
      }
      // Seed Initial Team
      for (const item of INITIAL_USERS) {
        await setDoc(doc(db, 'users', item.userId), item);
      }
      // Seed Suppliers
      for (const item of INITIAL_SUPPLIERS) {
        await setDoc(doc(db, 'suppliers', item.id), item);
      }
      // Seed Initial Stock Movements Ledger
      for (const item of INITIAL_STOCK_MOVEMENTS) {
        await setDoc(doc(db, 'stockMovements', item.id), item);
      }
      // Seed System Configuration
      await setDoc(doc(db, 'systemConfig', 'default'), INITIAL_SYSTEM_CONFIG);
      console.log('Database successfully seeded with realistic Nepali enterprise data.');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error during database seed check:', error);
    return false;
  }
}

// Real-Time Subscriptions
export function subscribeToCustomers(
  callback: (customers: Customer[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'customers';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as Customer);
        callback(items);
      },
      (error) => {
        console.warn('Firestore customer subscription warning, falling back to local seed:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    console.error('Error creating customer listener:', err);
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToPackages(
  callback: (packages: SubscriptionPackage[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'packages';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as SubscriptionPackage);
        callback(items);
      },
      (error) => {
        console.warn('Firestore packages warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToSubscriptions(
  callback: (subs: Subscription[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'subscriptions';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as Subscription);
        callback(items);
      },
      (error) => {
        console.warn('Firestore subscriptions warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToInventory(
  callback: (items: InventoryItem[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'inventory';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as InventoryItem);
        callback(items);
      },
      (error) => {
        console.warn('Firestore inventory warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToStockMovements(
  callback: (movements: StockMovement[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'stockMovements';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as StockMovement);
        callback(items);
      },
      (error) => {
        console.warn('Firestore stockMovements warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToSuppliers(
  callback: (suppliers: Supplier[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'suppliers';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as Supplier);
        callback(items);
      },
      (error) => {
        console.warn('Firestore suppliers warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToWorkOrders(
  callback: (orders: WorkOrder[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'workOrders';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as WorkOrder);
        callback(items);
      },
      (error) => {
        console.warn('Firestore work orders warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToDealers(
  callback: (dealers: Dealer[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'dealers';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as Dealer);
        callback(items);
      },
      (error) => {
        console.warn('Firestore dealers warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToDealerStockRequests(
  callback: (requests: DealerStockRequest[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'dealerStockRequests';
  try {
    const q = query(collection(db, path), orderBy('requestedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as DealerStockRequest);
        callback(items);
      },
      (error) => {
        console.warn('Firestore dealerStockRequests warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToDealerRenewalRequests(
  callback: (requests: DealerRenewalRequest[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'dealerRenewalRequests';
  try {
    const q = query(collection(db, path), orderBy('submittedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as DealerRenewalRequest);
        callback(items);
      },
      (error) => {
        console.warn('Firestore dealerRenewalRequests warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToDealerCommissions(
  callback: (commissions: DealerCommissionRecord[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'dealerCommissions';
  try {
    const q = query(collection(db, path), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as DealerCommissionRecord);
        callback(items);
      },
      (error) => {
        console.warn('Firestore dealerCommissions warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToInvoices(
  callback: (invoices: Invoice[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'invoices';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as Invoice);
        callback(items);
      },
      (error) => {
        console.warn('Firestore invoices warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToExpenses(
  callback: (expenses: Expense[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'expenses';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as Expense);
        callback(items);
      },
      (error) => {
        console.warn('Firestore expenses warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToIncomeTransactions(
  callback: (transactions: IncomeTransaction[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'incomeTransactions';
  try {
    const q = query(collection(db, path), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as IncomeTransaction);
        callback(items);
      },
      (error) => {
        console.warn('Firestore incomeTransactions warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToAuditLogs(
  callback: (logs: AuditLog[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'auditLogs';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as AuditLog);
        callback(items);
      },
      (error) => {
        console.warn('Firestore audit logs warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToUsers(
  callback: (users: UserProfile[]) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'users';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as UserProfile);
        callback(items);
      },
      (error) => {
        console.warn('Firestore users warning:', error);
        if (fallbackOnError) fallbackOnError();
        else handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export function subscribeToSystemConfig(
  callback: (config: SystemConfig) => void,
  fallbackOnError?: () => void
): () => void {
  if (!auth.currentUser) {
    callback(INITIAL_SYSTEM_CONFIG);
    return () => {};
  }
  const path = 'systemConfig';
  try {
    return onSnapshot(
      doc(db, path, 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as SystemConfig);
        } else {
          callback(INITIAL_SYSTEM_CONFIG);
        }
      },
      (error) => {
        console.warn('Firestore systemConfig warning:', error);
        callback(INITIAL_SYSTEM_CONFIG);
        if (fallbackOnError) fallbackOnError();
      }
    );
  } catch (err) {
    callback(INITIAL_SYSTEM_CONFIG);
    if (fallbackOnError) fallbackOnError();
    return () => {};
  }
}

export async function updateSystemConfig(
  updates: Partial<SystemConfig>,
  actor?: { id?: string; name?: string; role?: any }
): Promise<void> {
  const path = 'systemConfig/default';
  if (!auth.currentUser) {
    console.info('[Demo Mode] Simulated systemConfig update');
    return;
  }
  try {
    await setDoc(doc(db, 'systemConfig', 'default'), updates, { merge: true });
    await logAuditEvent(
      'SYSTEM_CONFIG_UPDATE',
      'System',
      'Company profile or critical system settings updated by authorized executive',
      actor,
      'default',
      updates
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Generic Mutation Handlers with handleFirestoreError
export async function createDocument<T extends Record<string, any>>(
  collectionName: string,
  docData: T,
  moduleName?: AuditLog['module'],
  actionName?: string,
  actor?: { id?: string; name?: string; role?: any }
): Promise<string> {
  const docId = (docData as any).id || (docData as any).userId || `doc-${Date.now()}`;
  const path = collectionName;
  if (!auth.currentUser) {
    console.info(`[Demo Mode] Simulated creation in ${collectionName} with ID: ${docId}`);
    return docId;
  }
  try {
    await setDoc(doc(db, path, docId), docData as Record<string, any>);
    if (moduleName && actionName) {
      await logAuditEvent(actionName, moduleName, `Created ${collectionName} with ID: ${docId}`, actor);
    }
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${path}/${docId}`);
    return docId;
  }
}

export async function updateDocument<T extends Record<string, any> = Record<string, any>>(
  collectionName: string,
  docId: string,
  updateFields: Partial<T> | Record<string, any>,
  moduleName?: AuditLog['module'],
  actionName?: string,
  actor?: { id?: string; name?: string; role?: any }
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  if (!auth.currentUser) {
    console.info(`[Demo Mode] Simulated update in ${collectionName} ID: ${docId}`);
    return;
  }
  try {
    await updateDoc(doc(db, collectionName, docId), updateFields as Record<string, any>);
    if (moduleName && actionName) {
      await logAuditEvent(actionName, moduleName, `Updated ${collectionName} ID: ${docId}`, actor);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDocument(
  collectionName: string,
  docId: string,
  moduleName?: AuditLog['module'],
  actionName?: string,
  actor?: { id?: string; name?: string; role?: any }
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  if (!auth.currentUser) {
    console.info(`[Demo Mode] Simulated deletion in ${collectionName} ID: ${docId}`);
    return;
  }
  try {
    await deleteDoc(doc(db, collectionName, docId));
    if (moduleName && actionName) {
      await logAuditEvent(actionName, moduleName, `Deleted from ${collectionName} ID: ${docId}`, actor);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
