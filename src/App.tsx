import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ShieldCheck } from 'lucide-react';

// 10 ERP Modules
import { CeoDashboard } from './components/dashboard/CeoDashboard';
import { CustomerManagement } from './components/customers/CustomerManagement';
import { SubscriptionManagement } from './components/subscriptions/SubscriptionManagement';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { OperationsManagement } from './components/operations/OperationsManagement';
import { DealerManagement } from './components/dealers/DealerManagement';
import { FinanceManagement } from './components/finance/FinanceManagement';
import { ReportsAnalytics } from './components/reports/ReportsAnalytics';
import { TeamManagement } from './components/team/TeamManagement';
import { SettingsAudit } from './components/settings/SettingsAudit';

// Data Types and Fallbacks
import {
  Customer,
  Subscription,
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
  SubscriptionPackage,
  StockMovement,
  Supplier,
  SystemConfig,
} from './types/erp';
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
} from './services/seedData';
import {
  subscribeToCustomers,
  subscribeToPackages,
  subscribeToSubscriptions,
  subscribeToInventory,
  subscribeToStockMovements,
  subscribeToSuppliers,
  subscribeToWorkOrders,
  subscribeToDealers,
  subscribeToDealerStockRequests,
  subscribeToDealerRenewalRequests,
  subscribeToDealerCommissions,
  subscribeToInvoices,
  subscribeToExpenses,
  subscribeToIncomeTransactions,
  subscribeToAuditLogs,
  subscribeToUsers,
  subscribeToSystemConfig,
} from './services/dbService';

import { ToastProvider } from './context/ToastContext';

function ErpApp() {
  const { currentUser, activeRole, userProfile, accountSuspended, signOut, isDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('ceo-dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Data States initialized with fallback seed data
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [packages, setPackages] = useState<SubscriptionPackage[]>(INITIAL_PACKAGES);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_STOCK_MOVEMENTS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [dealers, setDealers] = useState<Dealer[]>(INITIAL_DEALERS);
  const [dealerStockRequests, setDealerStockRequests] = useState<DealerStockRequest[]>(INITIAL_DEALER_STOCK_REQUESTS);
  const [dealerRenewalRequests, setDealerRenewalRequests] = useState<DealerRenewalRequest[]>(INITIAL_DEALER_RENEWAL_REQUESTS);
  const [dealerCommissions, setDealerCommissions] = useState<DealerCommissionRecord[]>(INITIAL_DEALER_COMMISSIONS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [incomeTransactions, setIncomeTransactions] = useState<IncomeTransaction[]>(INITIAL_INCOME_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);

  // Hook into Firestore Real-time subscriptions only when authenticated
  useEffect(() => {
    if (!currentUser) {
      // In unauthenticated / demo preview state, retain rich in-memory dataset
      return;
    }

    const unsubs: (() => void)[] = [];
    const isOpsOrCeo = activeRole === 'CEO' || activeRole === 'OPERATIONS_MANAGER';
    const isOfficeStaffOrAbove = isOpsOrCeo || activeRole === 'OFFICE_STAFF';

    // 1. Packages & Inventory: readable by all authenticated users
    unsubs.push(
      subscribeToPackages((data) => {
        if (data && data.length > 0) setPackages(data);
      })
    );
    unsubs.push(
      subscribeToInventory((data) => {
        if (data && data.length > 0) setInventory(data);
      })
    );

    // 2. Customers and Subscriptions: readable by Office Staff, CEO, Ops Manager, and Dealers
    if (isOfficeStaffOrAbove || activeRole === 'DEALER') {
      unsubs.push(
        subscribeToCustomers((data) => {
          if (data && data.length > 0) setCustomers(data);
        })
      );
      unsubs.push(
        subscribeToSubscriptions((data) => {
          if (data && data.length > 0) setSubscriptions(data);
        })
      );
    }

    // 3. Work Orders & Stock Movements: readable by Field Technicians and Office Staff / Managers / CEO
    if (isOfficeStaffOrAbove || activeRole === 'FIELD_TECHNICIAN') {
      unsubs.push(
        subscribeToWorkOrders((data) => {
          if (data && data.length > 0) setWorkOrders(data);
        })
      );
      unsubs.push(
        subscribeToStockMovements((data) => {
          if (data && data.length > 0) setStockMovements(data);
        })
      );
    }

    // 4. Invoices, Expenses, and Income: restricted to Office Staff / Managers / CEO
    if (isOfficeStaffOrAbove) {
      unsubs.push(
        subscribeToInvoices((data) => {
          if (data && data.length > 0) setInvoices(data);
        })
      );
      unsubs.push(
        subscribeToExpenses((data) => {
          if (data && data.length > 0) setExpenses(data);
        })
      );
      unsubs.push(
        subscribeToIncomeTransactions((data) => {
          if (data && data.length > 0) setIncomeTransactions(data);
        })
      );
    }

    // 5. Suppliers, Dealers, Audit Logs, Users: restricted to Operations Manager / CEO
    if (isOpsOrCeo) {
      unsubs.push(
        subscribeToSuppliers((data) => {
          if (data && data.length > 0) setSuppliers(data);
        })
      );
      unsubs.push(
        subscribeToDealers((data) => {
          if (data && data.length > 0) setDealers(data);
        })
      );
      unsubs.push(
        subscribeToAuditLogs((data) => {
          if (data && data.length > 0) setAuditLogs(data);
        })
      );
      unsubs.push(
        subscribeToUsers((data) => {
          if (data && data.length > 0) setUsers(data);
        })
      );
      unsubs.push(
        subscribeToSystemConfig((data) => {
          if (data) setSystemConfig(data);
        })
      );
    }

    // 6. Dealer Portal & Requests: accessible by Dealers and Operations Manager / CEO
    if (isOpsOrCeo || activeRole === 'DEALER') {
      unsubs.push(
        subscribeToDealerStockRequests((data) => {
          if (data && data.length > 0) setDealerStockRequests(data);
        })
      );
      unsubs.push(
        subscribeToDealerRenewalRequests((data) => {
          if (data && data.length > 0) setDealerRenewalRequests(data);
        })
      );
      unsubs.push(
        subscribeToDealerCommissions((data) => {
          if (data && data.length > 0) setDealerCommissions(data);
        })
      );
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentUser, activeRole]);

  // When role changes, ensure user is on an accessible tab
  useEffect(() => {
    if (activeRole === 'FIELD_TECHNICIAN' && !['operations', 'inventory'].includes(activeTab)) {
      setActiveTab('operations');
    } else if (activeRole === 'DEALER' && !['dealers', 'customers', 'subscriptions', 'reports'].includes(activeTab)) {
      setActiveTab('dealers');
    }
  }, [activeRole]);

  const handleOpenQuickAction = (action: string) => {
    if (action === 'work_order') {
      setActiveTab('operations');
    }
  };

  const counts = {
    customers: customers.length,
    subscriptions: subscriptions.filter((s) => s.status === 'active').length,
    inventory: inventory.filter((i) => i.status === 'in_stock').length,
    workOrders: workOrders.filter((w) => ['pending', 'assigned', 'in_progress'].includes(w.status)).length,
    dealers: dealers.length,
    invoices: invoices.filter((i) => i.status === 'unpaid' || i.status === 'overdue').length,
  };

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-800 antialiased selection:bg-red-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={counts}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-68'
        } flex flex-col min-w-0 min-h-screen transition-all duration-200`}
      >
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={activeTab}
          onOpenQuickAction={handleOpenQuickAction}
        />

        {/* Role Viewport Notice Banner */}
        <div className="bg-slate-900 text-slate-300 text-xs px-4 lg:px-8 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>
              Operating as: <strong className="text-white">{userProfile?.fullName}</strong> ({userProfile?.role?.toUpperCase()})
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">
              Company: <strong>Netcare Nepal Pvt. Ltd.</strong> (Kathmandu, Nepal)
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Currency: NPR (रू)</span>
            <span>•</span>
            <span>Date: DD/MM/YYYY</span>
          </div>
        </div>

        {/* Page Content Body */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {accountSuspended ? (
            <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-xl max-w-2xl mx-auto text-center my-12 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted • Account Inactive</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Your corporate account has not been activated or has been suspended by the Netcare Nepal executive administrator. Under our Zero-Trust security rules, public user registration is prohibited.
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-5 text-left text-xs text-slate-700">
                <p className="font-bold text-slate-900">Corporate Security Clearance:</p>
                <p className="mt-1">
                  Only the CEO (<span className="font-mono text-red-600 font-bold">netcarenepal@gmail.com</span>) can provision user roles, activate staff accounts, and authorize regional dealer access in Cloud Firestore.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={signOut}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'ceo-dashboard' && (
                <CeoDashboard
                  customers={customers}
                  subscriptions={subscriptions}
                  inventory={inventory}
                  workOrders={workOrders}
                  dealers={dealers}
                  invoices={invoices}
                  expenses={expenses}
                  incomeTransactions={incomeTransactions}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'customers' && (
                <CustomerManagement
                  customers={customers}
                  subscriptions={subscriptions}
                  inventory={inventory}
                  workOrders={workOrders}
                  invoices={invoices}
                  dealers={dealers}
                  users={users}
                />
              )}

              {activeTab === 'subscriptions' && (
                <SubscriptionManagement
                  subscriptions={subscriptions}
                  customers={customers}
                  packages={packages}
                  inventory={inventory}
                  invoices={invoices}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryManagement
                  inventory={inventory}
                  stockMovements={stockMovements}
                  suppliers={suppliers}
                  customers={customers}
                  dealers={dealers}
                  users={users}
                />
              )}

              {activeTab === 'operations' && (
                <OperationsManagement
                  workOrders={workOrders}
                  customers={customers}
                  inventory={inventory}
                  users={users}
                  stockMovements={stockMovements}
                />
              )}

              {activeTab === 'dealers' && (
                <DealerManagement
                  dealers={dealers}
                  customers={customers}
                  subscriptions={subscriptions}
                  packages={packages}
                  inventory={inventory}
                  stockMovements={stockMovements}
                  dealerStockRequests={dealerStockRequests}
                  dealerRenewalRequests={dealerRenewalRequests}
                  dealerCommissions={dealerCommissions}
                  onAddCustomer={(c) => setCustomers((prev) => [c, ...prev])}
                  onAddSubscription={(s) => setSubscriptions((prev) => [s, ...prev])}
                  onAddStockMovement={(m) => setStockMovements((prev) => [m, ...prev])}
                  onAddStockRequest={(r) => setDealerStockRequests((prev) => [r, ...prev])}
                  onUpdateStockRequest={(id, updates) =>
                    setDealerStockRequests((prev) =>
                      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
                    )
                  }
                  onAddRenewalRequest={(ren) => setDealerRenewalRequests((prev) => [ren, ...prev])}
                  onUpdateRenewalRequest={(id, updates) =>
                    setDealerRenewalRequests((prev) =>
                      prev.map((ren) => (ren.id === id ? { ...ren, ...updates } : ren))
                    )
                  }
                  onAddCommission={(comm) => setDealerCommissions((prev) => [comm, ...prev])}
                  onUpdateDealer={(id, updates) =>
                    setDealers((prev) =>
                      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
                    )
                  }
                />
              )}

              {activeTab === 'finance' && (
                <FinanceManagement
                  invoices={invoices}
                  expenses={expenses}
                  incomeTransactions={incomeTransactions}
                  customers={customers}
                  suppliers={suppliers}
                  dealers={dealers}
                  subscriptions={subscriptions}
                  onAddIncome={(inc) => setIncomeTransactions((prev) => [inc, ...prev])}
                  onAddExpense={(exp) => setExpenses((prev) => [exp, ...prev])}
                  onAddInvoice={(inv) => setInvoices((prev) => [inv, ...prev])}
                  onUpdateInvoice={(id, updates) =>
                    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)))
                  }
                  onUpdateExpense={(id, updates) =>
                    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)))
                  }
                  onUpdateIncome={(id, updates) =>
                    setIncomeTransactions((prev) => prev.map((inc) => (inc.id === id ? { ...inc, ...updates } : inc)))
                  }
                />
              )}

              {activeTab === 'reports' && (
                <ReportsAnalytics
                  customers={customers}
                  subscriptions={subscriptions}
                  inventory={inventory}
                  workOrders={workOrders}
                  dealers={dealers}
                  invoices={invoices}
                  expenses={expenses}
                />
              )}

              {activeTab === 'team' && (
                <TeamManagement
                  users={users}
                  onAddUser={(newUser) => setUsers((prev) => [newUser, ...prev])}
                  onUpdateUser={(userId, updates) =>
                    setUsers((prev) => prev.map((u) => (u.userId === userId ? { ...u, ...updates } : u)))
                  }
                />
              )}

              {activeTab === 'settings' && (
                <SettingsAudit
                  auditLogs={auditLogs}
                  systemConfig={systemConfig}
                  onUpdateSystemConfig={(updates) => setSystemConfig((prev) => ({ ...prev, ...updates }))}
                  users={users}
                  customers={customers}
                  subscriptions={subscriptions}
                  inventory={inventory}
                  workOrders={workOrders}
                  dealers={dealers}
                  invoices={invoices}
                  expenses={expenses}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ErpApp />
      </ToastProvider>
    </AuthProvider>
  );
}
