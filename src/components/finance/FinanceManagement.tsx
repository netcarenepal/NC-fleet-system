import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Building2,
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Undo2,
  ShieldAlert,
  Users,
  Clock,
  Layers,
  ChevronRight,
  BarChart3,
  HelpCircle,
  Percent,
} from 'lucide-react';
import {
  Invoice,
  Expense,
  IncomeTransaction,
  Customer,
  Supplier,
  Dealer,
  Subscription,
  IncomeCategory,
  ExpenseCategory,
  FinancePaymentMethod,
  PaymentRecord,
  isCEO,
  isStaffOrHigher,
} from '../../types/erp';
import { formatNPR, formatDate, getStatusBadge } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { createDocument, updateDocument, logAuditEvent } from '../../services/dbService';
import { exportToExcel, exportTableToPDF } from '../../utils/exportUtils';

interface FinanceManagementProps {
  invoices: Invoice[];
  expenses: Expense[];
  incomeTransactions: IncomeTransaction[];
  customers: Customer[];
  suppliers?: Supplier[];
  dealers?: Dealer[];
  subscriptions?: Subscription[];
  onAddIncome?: (inc: IncomeTransaction) => void;
  onAddExpense?: (exp: Expense) => void;
  onAddInvoice?: (inv: Invoice) => void;
  onUpdateInvoice?: (id: string, updates: Partial<Invoice>) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onUpdateIncome?: (id: string, updates: Partial<IncomeTransaction>) => void;
}

const INCOME_CATEGORIES: { id: IncomeCategory; label: string }[] = [
  { id: 'new_subscriptions', label: 'New Subscriptions' },
  { id: 'subscription_renewals', label: 'Subscription Renewals' },
  { id: 'wifi_equipment_sales', label: 'WiFi Equipment Sales' },
  { id: 'cctv_sales', label: 'CCTV Sales' },
  { id: 'gps_sales', label: 'GPS Sales' },
  { id: 'installation_charges', label: 'Installation Charges' },
  { id: 'other_income', label: 'Other Income' },
];

const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'internet_sim', label: 'Internet and SIM Expenses' },
  { id: 'device_purchases', label: 'Device Purchases' },
  { id: 'employee_salaries', label: 'Employee Salaries' },
  { id: 'technician_installation', label: 'Technician Installation Charges' },
  { id: 'transportation', label: 'Transportation' },
  { id: 'office_rent', label: 'Office Rent' },
  { id: 'electricity_internet', label: 'Electricity and Internet' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'repairs_maintenance', label: 'Repairs and Maintenance' },
  { id: 'other_expenses', label: 'Other Expenses' },
];

const PAYMENT_METHODS: FinancePaymentMethod[] = [
  'Cash',
  'Bank Transfer',
  'eSewa',
  'Khalti',
  'ConnectIPS',
  'Cheque',
  'Other',
];

export const FinanceManagement: React.FC<FinanceManagementProps> = ({
  invoices = [],
  expenses = [],
  incomeTransactions = [],
  customers = [],
  suppliers = [],
  dealers = [],
  subscriptions = [],
  onAddIncome,
  onAddExpense,
  onAddInvoice,
  onUpdateInvoice,
  onUpdateExpense,
  onUpdateIncome,
}) => {
  const { activeRole, userProfile } = useAuth();
  const canModifyFinance = isStaffOrHigher(activeRole);
  const canAuthorizeReversals = isCEO(activeRole) || activeRole === 'OPERATIONS_MANAGER';

  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'invoices' | 'income' | 'expenses' | 'receivables_payables' | 'reports'
  >('overview');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [activeReportType, setActiveReportType] = useState<
    'pl_statement' | 'daily_collection' | 'monthly_income' | 'cash_flow'
  >('pl_statement');

  // Modals
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [reversalTarget, setReversalTarget] = useState<{
    type: 'invoice' | 'income' | 'expense';
    item: any;
  } | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Form State: Income Entry
  const [incomeForm, setIncomeForm] = useState<{
    category: IncomeCategory;
    amountNpr: number;
    paymentMethod: FinancePaymentMethod;
    paymentReference: string;
    date: string;
    customerId: string;
    customerName: string;
    busNumber: string;
    notes: string;
  }>({
    category: 'new_subscriptions',
    amountNpr: 15000,
    paymentMethod: 'ConnectIPS',
    paymentReference: '',
    date: new Date().toISOString().slice(0, 10),
    customerId: '',
    customerName: '',
    busNumber: '',
    notes: '',
  });

  // Form State: Expense Entry
  const [expenseForm, setExpenseForm] = useState<{
    title: string;
    category: ExpenseCategory;
    amountNpr: number;
    paidTo: string;
    supplierId: string;
    paymentMethod: FinancePaymentMethod;
    paymentDate: string;
    receiptNumber: string;
    approvedBy: string;
    notes: string;
  }>({
    title: '',
    category: 'internet_sim',
    amountNpr: 25000,
    paidTo: 'Nepal Telecom (NTC)',
    supplierId: '',
    paymentMethod: 'Bank Transfer',
    paymentDate: new Date().toISOString().slice(0, 10),
    receiptNumber: '',
    approvedBy: userProfile?.fullName || 'Narayan Prasad Acharya (CEO)',
    notes: '',
  });

  // Form State: Invoice Generation
  const [invoiceForm, setInvoiceForm] = useState<{
    customerId: string;
    customerName: string;
    customerPan: string;
    busNumber: string;
    dueDate: string;
    items: { description: string; quantity: number; unitPriceNpr: number }[];
    notes: string;
  }>({
    customerId: '',
    customerName: '',
    customerPan: '',
    busNumber: '',
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    items: [
      { description: 'Monthly Highway Bus WiFi & GPS Telematics Fleet Service', quantity: 1, unitPriceNpr: 15000 },
    ],
    notes: '',
  });

  // Form State: Record Payment Against Invoice
  const [paymentForm, setPaymentForm] = useState<{
    amountNpr: number;
    paymentMethod: FinancePaymentMethod;
    paymentReference: string;
    date: string;
    notes: string;
  }>({
    amountNpr: 0,
    paymentMethod: 'ConnectIPS',
    paymentReference: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // ----------------------------------------------------
  // CALCULATIONS (STRICT CASH-BASIS P&L PER INSTRUCTIONS)
  // ----------------------------------------------------

  // Active (non-reversed) records
  const activeIncome = useMemo(
    () => incomeTransactions.filter((inc) => !inc.isReversal),
    [incomeTransactions]
  );
  const activeExpenses = useMemo(
    () => expenses.filter((exp) => !exp.isReversal && exp.status === 'paid'),
    [expenses]
  );
  const activeInvoices = useMemo(
    () => invoices.filter((inv) => !inv.isReversal && inv.status !== 'cancelled'),
    [invoices]
  );

  // 1. Total Collected Revenue (Cash Basis)
  const totalCollectedRevenue = useMemo(() => {
    return activeIncome.reduce((acc, curr) => acc + (curr.amountNpr || 0), 0);
  }, [activeIncome]);

  // 2. Total Recorded Expenses
  const totalRecordedExpenses = useMemo(() => {
    return activeExpenses.reduce((acc, curr) => acc + (curr.amountNpr || 0), 0);
  }, [activeExpenses]);

  // 3. Net Operating Profit (CRITICAL: Collected Revenue - Recorded Expenses)
  // "Calculate profit using actual recorded costs and income. Do not treat unpaid invoices as collected revenue."
  const netOperatingProfit = totalCollectedRevenue - totalRecordedExpenses;
  const operatingProfitMarginPercent =
    totalCollectedRevenue > 0
      ? Math.round((netOperatingProfit / totalCollectedRevenue) * 100)
      : 0;

  // 4. Receivables (Unpaid & Overdue Invoices)
  const totalReceivables = useMemo(() => {
    return activeInvoices.reduce((acc, curr) => {
      const balance =
        typeof curr.balanceDueNpr === 'number'
          ? curr.balanceDueNpr
          : curr.status === 'paid'
          ? 0
          : curr.totalNpr - (curr.amountPaidNpr || 0);
      return acc + Math.max(0, balance);
    }, 0);
  }, [activeInvoices]);

  const overdueInvoicesCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return activeInvoices.filter((inv) => {
      const isPastDue = inv.dueDate && inv.dueDate < today;
      const hasBalance =
        typeof inv.balanceDueNpr === 'number'
          ? inv.balanceDueNpr > 0
          : inv.status !== 'paid';
      return isPastDue && hasBalance;
    }).length;
  }, [activeInvoices]);

  // 5. Today's Collections
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayCollections = useMemo(() => {
    return activeIncome
      .filter((inc) => inc.date && inc.date.slice(0, 10) === todayDateStr)
      .reduce((acc, curr) => acc + (curr.amountNpr || 0), 0);
  }, [activeIncome, todayDateStr]);

  // 6. Selected Date Collections (For Daily Collection Report)
  const selectedDateCollections = useMemo(() => {
    return activeIncome.filter((inc) => inc.date && inc.date.slice(0, 10) === reportDate);
  }, [activeIncome, reportDate]);

  const selectedDateTotalNpr = useMemo(() => {
    return selectedDateCollections.reduce((acc, curr) => acc + (curr.amountNpr || 0), 0);
  }, [selectedDateCollections]);

  // 7. Selected Month Income (For Monthly Income Report)
  const selectedMonthIncome = useMemo(() => {
    return activeIncome.filter((inc) => inc.date && inc.date.slice(0, 7) === reportMonth);
  }, [activeIncome, reportMonth]);

  const selectedMonthExpenses = useMemo(() => {
    return activeExpenses.filter(
      (exp) => exp.paymentDate && exp.paymentDate.slice(0, 7) === reportMonth
    );
  }, [activeExpenses, reportMonth]);

  // 8. Cash Flow by Payment Method
  const cashFlowByMethod = useMemo(() => {
    const methods: Record<string, { inflow: number; outflow: number; net: number }> = {};
    PAYMENT_METHODS.forEach((m) => {
      methods[m] = { inflow: 0, outflow: 0, net: 0 };
    });

    activeIncome.forEach((inc) => {
      const m = inc.paymentMethod || 'Other';
      if (!methods[m]) methods[m] = { inflow: 0, outflow: 0, net: 0 };
      methods[m].inflow += inc.amountNpr || 0;
      methods[m].net += inc.amountNpr || 0;
    });

    activeExpenses.forEach((exp) => {
      const m = exp.paymentMethod || 'Other';
      if (!methods[m]) methods[m] = { inflow: 0, outflow: 0, net: 0 };
      methods[m].outflow += exp.amountNpr || 0;
      methods[m].net -= exp.amountNpr || 0;
    });

    return methods;
  }, [activeIncome, activeExpenses]);

  // 9. Customer Outstanding Balances Aggregation
  const customerBalances = useMemo(() => {
    const map: Record<
      string,
      {
        customerId: string;
        customerName: string;
        phone: string;
        district: string;
        totalInvoiced: number;
        totalPaid: number;
        outstandingBalance: number;
        invoiceCount: number;
        unpaidCount: number;
        lastInvoiceDate?: string;
      }
    > = {};

    customers.forEach((cust) => {
      map[cust.id] = {
        customerId: cust.id,
        customerName: cust.fullName || cust.companyName,
        phone: cust.contactNumber || cust.phone || '',
        district: cust.district || '',
        totalInvoiced: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        invoiceCount: 0,
        unpaidCount: 0,
      };
    });

    activeInvoices.forEach((inv) => {
      const cId = inv.customerId;
      if (!map[cId]) {
        map[cId] = {
          customerId: cId,
          customerName: inv.customerName,
          phone: '',
          district: '',
          totalInvoiced: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          invoiceCount: 0,
          unpaidCount: 0,
        };
      }
      map[cId].totalInvoiced += inv.totalNpr || 0;
      const paid = inv.amountPaidNpr || (inv.status === 'paid' ? inv.totalNpr : 0);
      map[cId].totalPaid += paid;
      const balance =
        typeof inv.balanceDueNpr === 'number'
          ? inv.balanceDueNpr
          : inv.totalNpr - paid;
      map[cId].outstandingBalance += Math.max(0, balance);
      map[cId].invoiceCount += 1;
      if (balance > 0) map[cId].unpaidCount += 1;
      if (!map[cId].lastInvoiceDate || inv.issuedDate > map[cId].lastInvoiceDate!) {
        map[cId].lastInvoiceDate = inv.issuedDate;
      }
    });

    return Object.values(map).sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  }, [customers, activeInvoices]);

  // 10. Supplier Payables Aggregation
  const supplierPayables = useMemo(() => {
    return suppliers.map((sup) => {
      const expensesForSup = activeExpenses.filter(
        (e) => e.supplierId === sup.id || e.paidTo.toLowerCase().includes(sup.name.toLowerCase())
      );
      const totalPaid = expensesForSup.reduce((acc, curr) => acc + (curr.amountNpr || 0), 0);
      return {
        ...sup,
        totalPaidNpr: totalPaid,
        estimatedPayableBalanceNpr: sup.supplierCode === 'SUP-NTC-01' ? 45000 : 0, // monthly revolving
      };
    });
  }, [suppliers, activeExpenses]);

  // 11. Dealer Commission Balances Aggregation
  const dealerBalances = useMemo(() => {
    return dealers.map((d) => ({
      ...d,
      accruedCommissionsNpr: d.walletBalanceNpr || 0,
      totalCommissionsPaidNpr: d.totalCommissionsPaidNpr || 0,
      outstandingBalanceNpr: d.outstandingBalanceNpr || 0,
    }));
  }, [dealers]);

  // ----------------------------------------------------
  // FILTERED LISTS
  // ----------------------------------------------------

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.busNumber && inv.busNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inv.customerPan && inv.customerPan.includes(searchTerm));

      const matchesStatus =
        statusFilter === 'all' ||
        inv.status === statusFilter ||
        (statusFilter === 'unpaid_or_overdue' && ['unpaid', 'overdue', 'partially_paid'].includes(inv.status));

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const filteredIncome = useMemo(() => {
    return incomeTransactions.filter((inc) => {
      const matchesSearch =
        inc.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inc.customerName && inc.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inc.paymentReference && inc.paymentReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inc.busNumber && inc.busNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inc.notes && inc.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || inc.category === categoryFilter;
      const matchesMethod = paymentMethodFilter === 'all' || inc.paymentMethod === paymentMethodFilter;

      return matchesSearch && matchesCategory && matchesMethod;
    });
  }, [incomeTransactions, searchTerm, categoryFilter, paymentMethodFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesSearch =
        exp.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.paidTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.receiptNumber && exp.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
      const matchesMethod = paymentMethodFilter === 'all' || exp.paymentMethod === paymentMethodFilter;

      return matchesSearch && matchesCategory && matchesMethod;
    });
  }, [expenses, searchTerm, categoryFilter, paymentMethodFilter]);

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------

  // 1. Record Direct Income
  const handleRecordIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incomeForm.amountNpr <= 0) return;

    const id = `inc-${Date.now()}`;
    const transactionNumber = `INC-2083-${Math.floor(100 + Math.random() * 900)}`;
    const catObj = INCOME_CATEGORIES.find((c) => c.id === incomeForm.category);

    const newIncome: IncomeTransaction = {
      id,
      transactionNumber,
      category: incomeForm.category,
      categoryLabel: catObj ? catObj.label : incomeForm.category,
      amountNpr: Number(incomeForm.amountNpr),
      paymentMethod: incomeForm.paymentMethod,
      paymentReference: incomeForm.paymentReference || undefined,
      date: new Date(incomeForm.date).toISOString(),
      customerId: incomeForm.customerId || undefined,
      customerName: incomeForm.customerName || undefined,
      busNumber: incomeForm.busNumber || undefined,
      recordedBy: userProfile?.fullName || 'Office Staff',
      notes: incomeForm.notes || undefined,
      createdAt: new Date().toISOString(),
    };

    if (onAddIncome) onAddIncome(newIncome);
    await createDocument(
      'incomeTransactions',
      newIncome,
      'Finance',
      'INCOME_RECORDED',
      userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
    );

    setIsIncomeModalOpen(false);
    setIncomeForm({
      category: 'new_subscriptions',
      amountNpr: 15000,
      paymentMethod: 'ConnectIPS',
      paymentReference: '',
      date: new Date().toISOString().slice(0, 10),
      customerId: '',
      customerName: '',
      busNumber: '',
      notes: '',
    });
  };

  // 2. Record Expense
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseForm.amountNpr <= 0 || !expenseForm.title || !expenseForm.paidTo) return;

    const id = `exp-${Date.now()}`;
    const expenseNumber = `EXP-2083-${Math.floor(400 + Math.random() * 500)}`;
    const catObj = EXPENSE_CATEGORIES.find((c) => c.id === expenseForm.category);

    const newExpense: Expense = {
      id,
      expenseNumber,
      title: expenseForm.title,
      category: expenseForm.category,
      categoryLabel: catObj ? catObj.label : expenseForm.category,
      amountNpr: Number(expenseForm.amountNpr),
      paidTo: expenseForm.paidTo,
      supplierId: expenseForm.supplierId || undefined,
      supplierName: expenseForm.paidTo,
      paymentMethod: expenseForm.paymentMethod,
      paymentDate: new Date(expenseForm.paymentDate).toISOString(),
      receiptNumber: expenseForm.receiptNumber || undefined,
      approvedBy: expenseForm.approvedBy || userProfile?.fullName || 'Narayan Prasad Acharya (CEO)',
      notes: expenseForm.notes || undefined,
      status: 'paid',
      createdAt: new Date().toISOString(),
    };

    if (onAddExpense) onAddExpense(newExpense);
    await createDocument(
      'expenses',
      newExpense,
      'Finance',
      'EXPENSE_RECORDED',
      userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
    );

    setIsExpenseModalOpen(false);
    setExpenseForm({
      title: '',
      category: 'internet_sim',
      amountNpr: 25000,
      paidTo: 'Nepal Telecom (NTC)',
      supplierId: '',
      paymentMethod: 'Bank Transfer',
      paymentDate: new Date().toISOString().slice(0, 10),
      receiptNumber: '',
      approvedBy: userProfile?.fullName || 'Narayan Prasad Acharya (CEO)',
      notes: '',
    });
  };

  // 3. Generate 13% VAT Customer Invoice
  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.customerName || invoiceForm.items.length === 0) return;

    const id = `inv-${Date.now()}`;
    const invoiceNumber = `NC-2083-${Math.floor(100 + Math.random() * 900)}`;

    const subtotalNpr = invoiceForm.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceNpr),
      0
    );
    const vatAmountNpr = Math.round(subtotalNpr * 0.13); // Nepal 13% VAT
    const totalNpr = subtotalNpr + vatAmountNpr;

    const newInvoice: Invoice = {
      id,
      invoiceNumber,
      customerId: invoiceForm.customerId || `cust-adhoc-${Date.now()}`,
      customerName: invoiceForm.customerName,
      customerPan: invoiceForm.customerPan || undefined,
      busNumber: invoiceForm.busNumber || undefined,
      amountNpr: subtotalNpr,
      vatAmountNpr,
      totalNpr,
      amountPaidNpr: 0,
      balanceDueNpr: totalNpr,
      dueDate: new Date(invoiceForm.dueDate).toISOString(),
      issuedDate: new Date().toISOString(),
      status: 'unpaid',
      createdBy: userProfile?.fullName || 'Office Staff',
      paymentHistory: [],
      lineItems: invoiceForm.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPriceNpr: Number(i.unitPriceNpr),
        totalNpr: Number(i.quantity) * Number(i.unitPriceNpr),
      })),
      createdAt: new Date().toISOString(),
    };

    if (onAddInvoice) onAddInvoice(newInvoice);
    await createDocument(
      'invoices',
      newInvoice,
      'Finance',
      'INVOICE_GENERATED',
      userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
    );

    setIsInvoiceModalOpen(false);
    setSelectedInvoice(newInvoice); // Prompt user with the printable VAT view immediately
    setInvoiceForm({
      customerId: '',
      customerName: '',
      customerPan: '',
      busNumber: '',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      items: [
        { description: 'Monthly Highway Bus WiFi & GPS Telematics Fleet Service', quantity: 1, unitPriceNpr: 15000 },
      ],
      notes: '',
    });
  };

  // 4. Record Partial or Full Payment Against Invoice
  const handleOpenPaymentModal = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice);
    const currentPaid = invoice.amountPaidNpr || (invoice.status === 'paid' ? invoice.totalNpr : 0);
    const remainingBalance = Math.max(0, invoice.totalNpr - currentPaid);
    setPaymentForm({
      amountNpr: remainingBalance,
      paymentMethod: (invoice.paymentMethod as FinancePaymentMethod) || 'ConnectIPS',
      paymentReference: '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment || paymentForm.amountNpr <= 0) return;

    const payAmount = Number(paymentForm.amountNpr);
    const currentPaid = selectedInvoiceForPayment.amountPaidNpr || 0;
    const newPaidTotal = currentPaid + payAmount;
    const newBalanceDue = Math.max(0, selectedInvoiceForPayment.totalNpr - newPaidTotal);
    const newStatus = newBalanceDue === 0 ? 'paid' : 'partially_paid';

    const pmtId = `pmt-${Date.now()}`;
    const paymentRecord: PaymentRecord = {
      id: pmtId,
      paymentNumber: `PMT-2083-${Math.floor(100 + Math.random() * 900)}`,
      invoiceId: selectedInvoiceForPayment.id,
      amountNpr: payAmount,
      paymentMethod: paymentForm.paymentMethod,
      paymentReference: paymentForm.paymentReference || undefined,
      date: new Date(paymentForm.date).toISOString(),
      receivedBy: userProfile?.fullName || 'Office Staff',
      notes: paymentForm.notes || undefined,
    };

    const existingHistory = selectedInvoiceForPayment.paymentHistory || [];
    const updatedHistory = [...existingHistory, paymentRecord];

    const invoiceUpdates: Partial<Invoice> = {
      amountPaidNpr: newPaidTotal,
      balanceDueNpr: newBalanceDue,
      status: newStatus,
      paidDate: newStatus === 'paid' ? new Date(paymentForm.date).toISOString() : selectedInvoiceForPayment.paidDate,
      paymentMethod: paymentForm.paymentMethod,
      paymentReference: paymentForm.paymentReference || selectedInvoiceForPayment.paymentReference,
      paymentHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    };

    // Also automatically create an associated IncomeTransaction so collections stay in sync
    const autoIncome: IncomeTransaction = {
      id: `inc-${Date.now()}`,
      transactionNumber: `INC-2083-${Math.floor(100 + Math.random() * 900)}`,
      category: 'subscription_renewals',
      categoryLabel: 'Subscription Renewals',
      amountNpr: payAmount,
      paymentMethod: paymentForm.paymentMethod,
      paymentReference: paymentForm.paymentReference || undefined,
      date: new Date(paymentForm.date).toISOString(),
      customerId: selectedInvoiceForPayment.customerId,
      customerName: selectedInvoiceForPayment.customerName,
      busNumber: selectedInvoiceForPayment.busNumber,
      invoiceId: selectedInvoiceForPayment.id,
      recordedBy: userProfile?.fullName || 'Office Staff',
      notes: `Payment for Invoice ${selectedInvoiceForPayment.invoiceNumber}${
        paymentForm.notes ? `: ${paymentForm.notes}` : ''
      }`,
      createdAt: new Date().toISOString(),
    };

    if (onUpdateInvoice) onUpdateInvoice(selectedInvoiceForPayment.id, invoiceUpdates);
    if (onAddIncome) onAddIncome(autoIncome);

    await updateDocument(
      'invoices',
      selectedInvoiceForPayment.id,
      invoiceUpdates,
      'Finance',
      'INVOICE_PAYMENT_RECORDED',
      userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
    );
    await createDocument(
      'incomeTransactions',
      autoIncome,
      'Finance',
      'INCOME_AUTO_CREATED_FROM_PAYMENT',
      userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
    );

    setIsPaymentModalOpen(false);
    setSelectedInvoiceForPayment(null);
  };

  // 5. Reversal Entries (Never delete permanently, create offsetting entry and audit log)
  const handleOpenReversalModal = (type: 'invoice' | 'income' | 'expense', item: any) => {
    setReversalTarget({ type, item });
    setReversalReason('');
    setIsReversalModalOpen(true);
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason.trim()) return;

    const { type, item } = reversalTarget;

    if (type === 'invoice') {
      const updates: Partial<Invoice> = {
        status: 'cancelled',
        isReversal: true,
        reversalReason: reversalReason.trim(),
        updatedAt: new Date().toISOString(),
      };
      if (onUpdateInvoice) onUpdateInvoice(item.id, updates);
      await updateDocument(
        'invoices',
        item.id,
        updates,
        'Finance',
        'INVOICE_VOIDED_REVERSAL',
        userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
      );
    } else if (type === 'income') {
      // Create compensating negative transaction and mark original as reversed
      const reversalIncome: IncomeTransaction = {
        id: `rev-inc-${Date.now()}`,
        transactionNumber: `REV-${item.transactionNumber}`,
        category: item.category,
        categoryLabel: `REVERSAL: ${item.categoryLabel || item.category}`,
        amountNpr: -Math.abs(item.amountNpr),
        paymentMethod: item.paymentMethod,
        paymentReference: `REVERSAL OF ${item.transactionNumber}`,
        date: new Date().toISOString(),
        customerId: item.customerId,
        customerName: item.customerName,
        busNumber: item.busNumber,
        recordedBy: userProfile?.fullName || 'Manager',
        isReversal: true,
        reversedTransactionId: item.id,
        reversalReason: reversalReason.trim(),
        notes: `Reversal of transaction ${item.transactionNumber}. Reason: ${reversalReason.trim()}`,
        createdAt: new Date().toISOString(),
      };

      if (onAddIncome) onAddIncome(reversalIncome);
      if (onUpdateIncome) onUpdateIncome(item.id, { isReversal: true, reversalReason: reversalReason.trim() });

      await createDocument(
        'incomeTransactions',
        reversalIncome,
        'Finance',
        'INCOME_TRANSACTION_REVERSED',
        userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
      );
      await updateDocument(
        'incomeTransactions',
        item.id,
        { isReversal: true, reversalReason: reversalReason.trim() },
        'Finance',
        'INCOME_ORIGINAL_MARKED_REVERSED',
        userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
      );
    } else if (type === 'expense') {
      const reversalExpense: Expense = {
        id: `rev-exp-${Date.now()}`,
        expenseNumber: `REV-${item.expenseNumber}`,
        title: `REVERSAL: ${item.title}`,
        category: item.category,
        categoryLabel: `REVERSAL: ${item.categoryLabel || item.category}`,
        amountNpr: -Math.abs(item.amountNpr),
        paidTo: item.paidTo,
        paymentMethod: item.paymentMethod,
        paymentDate: new Date().toISOString(),
        approvedBy: userProfile?.fullName || 'Narayan Prasad Acharya (CEO)',
        status: 'paid',
        isReversal: true,
        reversedExpenseId: item.id,
        reversalReason: reversalReason.trim(),
        notes: `Reversal of expense ${item.expenseNumber}. Reason: ${reversalReason.trim()}`,
        createdAt: new Date().toISOString(),
      };

      if (onAddExpense) onAddExpense(reversalExpense);
      if (onUpdateExpense) onUpdateExpense(item.id, { isReversal: true, reversalReason: reversalReason.trim() });

      await createDocument(
        'expenses',
        reversalExpense,
        'Finance',
        'EXPENSE_TRANSACTION_REVERSED',
        userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
      );
      await updateDocument(
        'expenses',
        item.id,
        { isReversal: true, reversalReason: reversalReason.trim() },
        'Finance',
        'EXPENSE_ORIGINAL_MARKED_REVERSED',
        userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: userProfile.role } : undefined
      );
    }

    setIsReversalModalOpen(false);
    setReversalTarget(null);
  };

  // ----------------------------------------------------
  // EXPORT HANDLERS
  // ----------------------------------------------------

  const handleExportInvoicesExcel = () => {
    const data = filteredInvoices.map((inv) => ({
      'Invoice #': inv.invoiceNumber,
      Date: formatDate(inv.issuedDate),
      'Customer Name': inv.customerName,
      'Bus Number': inv.busNumber || 'Fleet',
      'Customer PAN': inv.customerPan || 'N/A',
      'Subtotal (NPR)': inv.amountNpr,
      '13% VAT (NPR)': inv.vatAmountNpr,
      'Total (NPR)': inv.totalNpr,
      'Paid (NPR)': inv.amountPaidNpr || 0,
      'Balance Due (NPR)': typeof inv.balanceDueNpr === 'number' ? inv.balanceDueNpr : inv.totalNpr,
      'Due Date': formatDate(inv.dueDate),
      Status: inv.status.toUpperCase(),
      'Payment Method': inv.paymentMethod || 'N/A',
    }));
    exportToExcel(data, `Netcare_Nepal_Invoices_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportIncomeExcel = () => {
    const data = filteredIncome.map((inc) => ({
      'Txn #': inc.transactionNumber,
      Date: formatDate(inc.date),
      Category: inc.categoryLabel || inc.category,
      'Customer / Bus': inc.customerName ? `${inc.customerName} (${inc.busNumber || 'Fleet'})` : 'Ad-hoc',
      'Amount (NPR)': inc.amountNpr,
      'Payment Method': inc.paymentMethod,
      Reference: inc.paymentReference || 'N/A',
      'Recorded By': inc.recordedBy,
      Notes: inc.notes || '',
      Reversal: inc.isReversal ? 'YES' : 'NO',
    }));
    exportToExcel(data, `Netcare_Nepal_Income_Ledger_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportExpensesExcel = () => {
    const data = filteredExpenses.map((exp) => ({
      'Expense #': exp.expenseNumber,
      Date: formatDate(exp.paymentDate),
      Title: exp.title,
      Category: exp.categoryLabel || exp.category,
      'Paid To / Payee': exp.paidTo,
      'Amount (NPR)': exp.amountNpr,
      'Payment Method': exp.paymentMethod,
      'Receipt #': exp.receiptNumber || 'N/A',
      'Approved By': exp.approvedBy,
      Status: exp.status.toUpperCase(),
      Reversal: exp.isReversal ? 'YES' : 'NO',
    }));
    exportToExcel(data, `Netcare_Nepal_Expenses_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportDailyCollectionPDF = () => {
    const headers = ['Receipt #', 'Date', 'Customer & Bus', 'Category', 'Method', 'Reference', 'Amount (NPR)'];
    const rows = selectedDateCollections.map((col) => [
      col.transactionNumber,
      formatDate(col.date),
      col.customerName ? `${col.customerName} ${col.busNumber ? `(${col.busNumber})` : ''}` : 'Ad-hoc Payer',
      col.categoryLabel || col.category,
      col.paymentMethod,
      col.paymentReference || '—',
      `NPR ${col.amountNpr.toLocaleString()}`,
    ]);
    exportTableToPDF(
      `Daily Collection Report (${reportDate})`,
      headers,
      rows,
      `Netcare_Daily_Collection_${reportDate}`,
      `Total Collected: NPR ${selectedDateTotalNpr.toLocaleString()} | Realized Cash & Digital Collections`
    );
  };

  const handleExportPLStatementPDF = () => {
    const headers = ['Type', 'Category / Line Item', 'Amount (NPR)', 'Notes'];
    const rows: (string | number)[][] = [
      ['INCOME', 'TOTAL REALIZED OPERATING REVENUE', `NPR ${totalCollectedRevenue.toLocaleString()}`, 'Realized cash collections'],
      ...INCOME_CATEGORIES.map((cat) => {
        const amt = activeIncome
          .filter((i) => i.category === cat.id)
          .reduce((s, c) => s + (c.amountNpr || 0), 0);
        return ['INCOME', cat.label, `NPR ${amt.toLocaleString()}`, 'Operating revenue stream'];
      }),
      ['EXPENSE', 'TOTAL OPERATING EXPENSES', `NPR ${totalRecordedExpenses.toLocaleString()}`, 'Total operating disbursements'],
      ...EXPENSE_CATEGORIES.map((cat) => {
        const amt = activeExpenses
          .filter((e) => e.category === cat.id)
          .reduce((s, c) => s + (c.amountNpr || 0), 0);
        return ['EXPENSE', cat.label, `NPR ${amt.toLocaleString()}`, 'Operational cost center'];
      }),
      ['PROFIT', 'NET OPERATING PROFIT / (LOSS)', `NPR ${netOperatingProfit.toLocaleString()}`, `Margin: ${operatingProfitMarginPercent}% (unpaid excluded)`],
    ];
    exportTableToPDF(
      `Profit & Loss Statement (Cash Basis) - FY ${new Date().getFullYear()}`,
      headers,
      rows,
      `Netcare_PL_Statement_${new Date().toISOString().slice(0, 10)}`,
      `Net Profit: NPR ${netOperatingProfit.toLocaleString()} (${operatingProfitMarginPercent}% Margin). Realized collections minus actual expenses.`
    );
  };

  // Helper for invoice form customer selection
  const handleSelectCustomer = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setInvoiceForm((prev) => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.fullName || cust.companyName,
        customerPan: cust.panNumber || cust.remarks || '',
        busNumber: cust.busRegistrationNumber || '',
      }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Module Title & Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Finance & Accounting</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              NPR (रू) Official
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cash-basis collected revenue, expense vouchers, 13% Nepal VAT billing, partial payment ledger & audit trail
          </p>
        </div>

        {/* Global Quick Actions */}
        {canModifyFinance && (
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setIsIncomeModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Record Income</span>
            </button>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Record Expense</span>
            </button>

            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New 13% VAT Invoice</span>
            </button>
          </div>
        )}
      </div>

      {/* Financial Health Ribbon: 6 Core Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Total Collected Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Collected Revenue</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{formatNPR(totalCollectedRevenue)}</div>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Realized cash in bank/wallet</p>
          </div>
        </div>

        {/* Metric 2: Recorded Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Expenses</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{formatNPR(totalRecordedExpenses)}</div>
            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Telecom, devices, salaries</p>
          </div>
        </div>

        {/* Metric 3: Net Operating Profit (CRITICAL: Collected - Expenses) */}
        <div
          className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
            netOperatingProfit >= 0
              ? 'bg-emerald-50/60 border-emerald-200'
              : 'bg-rose-50/60 border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Net Profit (Cash Basis)</span>
            <div
              className={`p-1.5 rounded-lg ${
                netOperatingProfit >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-xl font-black ${
                netOperatingProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              {formatNPR(netOperatingProfit)}
            </div>
            <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
              Margin: {operatingProfitMarginPercent}% (unpaid excluded)
            </p>
          </div>
        </div>

        {/* Metric 4: Outstanding Receivables */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Unpaid Invoices</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-amber-600">{formatNPR(totalReceivables)}</div>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              {overdueInvoicesCount > 0 ? (
                <span className="text-rose-600 font-bold">{overdueInvoicesCount} overdue</span>
              ) : (
                'Pending bus collections'
              )}
            </p>
          </div>
        </div>

        {/* Metric 5: Today's Collection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Today's Collection</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{formatNPR(todayCollections)}</div>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{formatDate(todayDateStr)}</p>
          </div>
        </div>

        {/* Metric 6: Partner & Supplier Payables */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Dealer Wallets</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">
              {formatNPR(
                dealers.reduce((acc, curr) => acc + (curr.walletBalanceNpr || 0), 0)
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Accrued commissions</p>
          </div>
        </div>
      </div>

      {/* Accounting Methodology Banner */}
      <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
        <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Nepali Accounting Standard & Netcare Policy:</strong> Profit is computed strictly using
          <strong> actual recorded costs and collected income</strong>. Unpaid or overdue customer invoices are tracked as
          Accounts Receivable (रू {totalReceivables.toLocaleString()}) and are strictly <em>not recognized as realized revenue</em> until payment is deposited and confirmed.
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto space-x-2 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview & Cash Flow</span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'invoices'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Customer Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('income')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'income'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownRight className="w-4 h-4 text-emerald-600" />
          <span>Recorded Income ({incomeTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'expenses'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-rose-600" />
          <span>Expenses & Payables ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('receivables_payables')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'receivables_payables'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Balances: Customers & Suppliers</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Statements & Reports (P&L / Daily)</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* SUB-TAB 1: OVERVIEW & CASH FLOW                      */}
      {/* ==================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Liquidity Channels: Inflow vs Outflow */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cash Flow by Payment Method</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Liquid inflows, operational disbursements and net liquidity position
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg self-start">
                Live Liquidity
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PAYMENT_METHODS.filter((m) => ['Cash', 'Bank Transfer', 'ConnectIPS', 'eSewa'].includes(m)).map((method) => {
                const data = cashFlowByMethod[method] || { inflow: 0, outflow: 0, net: 0 };
                return (
                  <div key={method} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                      <span>{method}</span>
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="text-lg font-black text-slate-900">{formatNPR(data.net)}</div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] flex justify-between text-slate-500">
                      <span className="text-emerald-600 font-semibold">+{formatNPR(data.inflow)}</span>
                      <span className="text-rose-600 font-semibold">-{formatNPR(data.outflow)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Dual Stream: Recent Collections & Recent Expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Collections */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Realized Collections</h3>
                </div>
                <button
                  onClick={() => setActiveSubTab('income')}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2.5">
                {activeIncome.slice(0, 5).map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{inc.categoryLabel || inc.category}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {inc.customerName || 'Ad-hoc Customer'} {inc.busNumber ? `• ${inc.busNumber}` : ''} •{' '}
                        {formatDate(inc.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600">+{formatNPR(inc.amountNpr)}</div>
                      <div className="text-[10px] text-slate-400">{inc.paymentMethod}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Operational Disbursements</h3>
                </div>
                <button
                  onClick={() => setActiveSubTab('expenses')}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2.5">
                {activeExpenses.slice(0, 5).map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 line-clamp-1">{exp.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {exp.paidTo} • {formatDate(exp.paymentDate)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-rose-600">-{formatNPR(exp.amountNpr)}</div>
                      <div className="text-[10px] text-slate-400">{exp.paymentMethod}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 2: CUSTOMER INVOICES & RECEIVABLES           */}
      {/* ==================================================== */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2.5 flex-1">
              {/* Search */}
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice #, customer, PAN, bus #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Invoice Statuses</option>
                <option value="unpaid">Unpaid Only</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="overdue">Overdue Only</option>
                <option value="paid">Fully Paid</option>
                <option value="cancelled">Voided / Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportInvoicesExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                title="Export filtered invoices to Excel spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              {canModifyFinance && (
                <button
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Invoice</span>
                </button>
              )}
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice # & Date</th>
                    <th className="py-3 px-4">Customer & Bus</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">13% VAT</th>
                    <th className="py-3 px-4 text-right">Total (NPR)</th>
                    <th className="py-3 px-4 text-right">Paid (NPR)</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No customer invoices match the selected search or status criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const amountPaid =
                        typeof inv.amountPaidNpr === 'number'
                          ? inv.amountPaidNpr
                          : inv.status === 'paid'
                          ? inv.totalNpr
                          : 0;
                      const balanceDue =
                        typeof inv.balanceDueNpr === 'number'
                          ? inv.balanceDueNpr
                          : Math.max(0, inv.totalNpr - amountPaid);
                      const isOverdue =
                        inv.dueDate &&
                        inv.dueDate < new Date().toISOString().slice(0, 10) &&
                        balanceDue > 0;

                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            inv.isReversal || inv.status === 'cancelled' ? 'opacity-60 bg-slate-50/40' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <div>{inv.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-400 font-sans">{formatDate(inv.issuedDate)}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{inv.customerName}</div>
                            <div className="text-[10px] text-slate-500">
                              {inv.busNumber ? `Bus: ${inv.busNumber}` : 'Fleet Billing'}{' '}
                              {inv.customerPan ? `• PAN: ${inv.customerPan}` : ''}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-600 font-mono">
                            {formatNPR(inv.amountNpr)}
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                            {formatNPR(inv.vatAmountNpr)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                            {formatNPR(inv.totalNpr)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-emerald-600 font-mono">
                            {formatNPR(amountPaid)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            {balanceDue > 0 ? (
                              <span className="text-amber-600">{formatNPR(balanceDue)}</span>
                            ) : (
                              <span className="text-emerald-700">रू 0</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-700">{formatDate(inv.dueDate)}</div>
                            {isOverdue && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                                Overdue
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {inv.status === 'paid' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Paid
                              </span>
                            )}
                            {inv.status === 'partially_paid' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                Partial
                              </span>
                            )}
                            {inv.status === 'unpaid' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Unpaid
                              </span>
                            )}
                            {inv.status === 'overdue' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Overdue
                              </span>
                            )}
                            {inv.status === 'cancelled' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                Voided
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Record Payment Button */}
                              {canModifyFinance && balanceDue > 0 && inv.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-colors border border-emerald-200"
                                  title="Record partial or full payment"
                                >
                                  Collect
                                </button>
                              )}

                              {/* View / Print VAT Tax Receipt */}
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="View official Nepal VAT tax invoice"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Reversal / Void Entry */}
                              {canAuthorizeReversals && inv.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleOpenReversalModal('invoice', inv)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Void invoice / Create audit reversal entry"
                                >
                                  <Undo2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 3: RECORDED INCOME ENTRIES                   */}
      {/* ==================================================== */}
      {activeSubTab === 'income' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2.5 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search receipt #, customer, ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Income Streams</option>
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* Payment Method Filter */}
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Payment Methods</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportIncomeExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              {canModifyFinance && (
                <button
                  onClick={() => setIsIncomeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Income</span>
                </button>
              )}
            </div>
          </div>

          {/* Income Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Customer & Bus Linkage</th>
                    <th className="py-3 px-4 text-right">Amount (NPR)</th>
                    <th className="py-3 px-4">Payment Method & Ref</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-right">Audit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIncome.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No income transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredIncome.map((inc) => (
                      <tr
                        key={inc.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          inc.isReversal ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <div>{inc.transactionNumber}</div>
                          {inc.isReversal && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                              REVERSAL ENTRY
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">{formatDate(inc.date)}</td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900">
                            {inc.categoryLabel || inc.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {inc.customerName || 'Ad-hoc Payer'}
                          </div>
                          {inc.busNumber && (
                            <div className="text-[10px] text-slate-500 font-mono">Bus: {inc.busNumber}</div>
                          )}
                        </td>

                        <td
                          className={`py-3.5 px-4 text-right font-mono font-black ${
                            inc.amountNpr >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {inc.amountNpr >= 0 ? '+' : ''}
                          {formatNPR(inc.amountNpr)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{inc.paymentMethod}</div>
                          {inc.paymentReference && (
                            <div className="text-[10px] text-slate-500 font-mono">Ref: {inc.paymentReference}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">{inc.recordedBy}</td>

                        <td className="py-3.5 px-4 text-right">
                          {canAuthorizeReversals && !inc.isReversal && (
                            <button
                              onClick={() => handleOpenReversalModal('income', inc)}
                              className="px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-[11px] font-semibold border border-slate-200"
                              title="Create offsetting reversal entry"
                            >
                              Void Entry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 4: EXPENSES & OPERATIONAL PAYABLES           */}
      {/* ==================================================== */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2.5 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search expense #, title, payee, receipt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Expense Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* Payment Method Filter */}
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Payment Methods</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExpensesExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              {canModifyFinance && (
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Expense</span>
                </button>
              )}
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Voucher #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Expense Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Paid To (Vendor)</th>
                    <th className="py-3 px-4 text-right">Amount (NPR)</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Approved By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No expense records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          exp.isReversal ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <div>{exp.expenseNumber}</div>
                          {exp.isReversal && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                              REVERSED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">{formatDate(exp.paymentDate)}</td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 line-clamp-1">{exp.title}</div>
                          {exp.receiptNumber && (
                            <div className="text-[10px] text-slate-500 font-mono">Bill/Receipt: {exp.receiptNumber}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {exp.categoryLabel || exp.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800">{exp.paidTo}</td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600">
                          -{formatNPR(exp.amountNpr)}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">{exp.paymentMethod}</td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">{exp.approvedBy}</td>

                        <td className="py-3.5 px-4 text-right">
                          {canAuthorizeReversals && !exp.isReversal && (
                            <button
                              onClick={() => handleOpenReversalModal('expense', exp)}
                              className="px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-[11px] font-semibold border border-slate-200"
                              title="Create offsetting reversal entry"
                            >
                              Void Entry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 5: BALANCES - CUSTOMERS & SUPPLIERS          */}
      {/* ==================================================== */}
      {activeSubTab === 'receivables_payables' && (
        <div className="space-y-6">
          {/* Customer Receivables Aging & Outstanding Ledger */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Accounts Receivable Ledger</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregate billing, collections, and outstanding receivables per bus transport operator
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-bold">Total Receivables: </span>
                <span className="text-sm font-black text-amber-600 font-mono">{formatNPR(totalReceivables)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Customer Company</th>
                    <th className="py-2.5 px-3">District</th>
                    <th className="py-2.5 px-3 text-right">Invoiced (NPR)</th>
                    <th className="py-2.5 px-3 text-right">Paid (NPR)</th>
                    <th className="py-2.5 px-3 text-right">Balance Due (NPR)</th>
                    <th className="py-2.5 px-3 text-center">Invoices</th>
                    <th className="py-2.5 px-3 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerBalances.map((item) => (
                    <tr key={item.customerId} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.customerName}</div>
                        <div className="text-[10px] text-slate-400">{item.phone}</div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">{item.district || 'Nepal'}</td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatNPR(item.totalInvoiced)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-emerald-600 font-bold">
                        {formatNPR(item.totalPaid)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black">
                        {item.outstandingBalance > 0 ? (
                          <span className="text-amber-600">{formatNPR(item.outstandingBalance)}</span>
                        ) : (
                          <span className="text-slate-400">रू 0</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center text-slate-500">
                        {item.invoiceCount} ({item.unpaidCount} unpaid)
                      </td>

                      <td className="py-3 px-3 text-right">
                        {item.outstandingBalance > 0 && canModifyFinance ? (
                          <button
                            onClick={() => {
                              // Find oldest unpaid invoice for this customer
                              const targetInv = activeInvoices.find(
                                (i) => i.customerId === item.customerId && (i.balanceDueNpr || 0) > 0
                              );
                              if (targetInv) {
                                handleOpenPaymentModal(targetInv);
                              } else {
                                // Fallback to direct income modal
                                setIncomeForm((prev) => ({
                                  ...prev,
                                  customerId: item.customerId,
                                  customerName: item.customerName,
                                  amountNpr: item.outstandingBalance,
                                }));
                                setIsIncomeModalOpen(true);
                              }
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200"
                          >
                            Collect Balance
                          </button>
                        ) : (
                          <span className="text-emerald-700 text-[11px] font-semibold">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplier Payables & Dealer Balances */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Supplier Accounts Payable */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900">Supplier Procurement Accounts</h3>
                </div>
                <span className="text-xs text-slate-500">{suppliers.length} Vendors</span>
              </div>

              <div className="space-y-3">
                {supplierPayables.map((sup) => (
                  <div
                    key={sup.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{sup.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {sup.contactPerson} • {sup.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500 text-[10px]">Total Paid YTD</div>
                      <div className="font-black text-slate-900 font-mono">{formatNPR(sup.totalPaidNpr)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Dealer Partner Balances */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Regional Partner Wallets & Commissions</h3>
                </div>
                <span className="text-xs text-slate-500">{dealers.length} Partners</span>
              </div>

              <div className="space-y-3">
                {dealerBalances.map((dlr) => (
                  <div
                    key={dlr.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{dlr.dealerName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {dlr.territory} • {dlr.businessName || 'Franchise Partner'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500 text-[10px]">Accrued Wallet</div>
                      <div className="font-black text-indigo-600 font-mono">
                        {formatNPR(dlr.walletBalanceNpr || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 6: FINANCIAL STATEMENTS & REPORTS            */}
      {/* ==================================================== */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Type Selector Pills */}
          <div className="flex items-center flex-wrap gap-2 pb-2">
            <button
              onClick={() => setActiveReportType('pl_statement')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeReportType === 'pl_statement'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              1. Profit & Loss Statement (P&L)
            </button>

            <button
              onClick={() => setActiveReportType('daily_collection')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeReportType === 'daily_collection'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              2. Daily Collection Report
            </button>

            <button
              onClick={() => setActiveReportType('monthly_income')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeReportType === 'monthly_income'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              3. Monthly Income & Expense Report
            </button>

            <button
              onClick={() => setActiveReportType('cash_flow')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeReportType === 'cash_flow'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              4. Cash Flow Statement
            </button>
          </div>

          {/* REPORT 1: PROFIT & LOSS STATEMENT */}
          {activeReportType === 'pl_statement' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-black text-slate-900">Profit & Loss Statement (Cash-Basis)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Netcare Nepal Pvt. Ltd. • Actual collected revenue minus recognized operating expenses
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportPLStatementPDF}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              </div>

              {/* Printable P&L Table */}
              <div id="pl-statement-table" className="space-y-6">
                {/* 1. Operating Income */}
                <div>
                  <div className="bg-slate-50 px-4 py-2 font-bold text-xs text-slate-900 border-y border-slate-200 flex justify-between">
                    <span>1. REALIZED OPERATING INCOME (COLLECTIONS)</span>
                    <span>AMOUNT (NPR)</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {INCOME_CATEGORIES.map((cat) => {
                      const amount = activeIncome
                        .filter((inc) => inc.category === cat.id)
                        .reduce((sum, curr) => sum + (curr.amountNpr || 0), 0);
                      return (
                        <div key={cat.id} className="py-2 px-4 flex justify-between text-slate-700">
                          <span>{cat.label}</span>
                          <span className="font-mono">{formatNPR(amount)}</span>
                        </div>
                      );
                    })}
                    <div className="py-2.5 px-4 bg-emerald-50/50 font-bold text-emerald-900 flex justify-between border-t border-emerald-200">
                      <span>TOTAL REALIZED OPERATING REVENUE</span>
                      <span className="font-mono font-black">{formatNPR(totalCollectedRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Operating Expenses */}
                <div>
                  <div className="bg-slate-50 px-4 py-2 font-bold text-xs text-slate-900 border-y border-slate-200 flex justify-between">
                    <span>2. OPERATING EXPENSES (COST OF OPERATIONS)</span>
                    <span>AMOUNT (NPR)</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const amount = activeExpenses
                        .filter((exp) => exp.category === cat.id)
                        .reduce((sum, curr) => sum + (curr.amountNpr || 0), 0);
                      return (
                        <div key={cat.id} className="py-2 px-4 flex justify-between text-slate-700">
                          <span>{cat.label}</span>
                          <span className="font-mono">{formatNPR(amount)}</span>
                        </div>
                      );
                    })}
                    <div className="py-2.5 px-4 bg-rose-50/50 font-bold text-rose-900 flex justify-between border-t border-rose-200">
                      <span>TOTAL OPERATING EXPENSES</span>
                      <span className="font-mono font-black">{formatNPR(totalRecordedExpenses)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Net Operating Profit */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between text-sm font-black ${
                    netOperatingProfit >= 0
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                      : 'bg-rose-100/70 border-rose-300 text-rose-900'
                  }`}
                >
                  <div>
                    <div>NET OPERATING PROFIT / (LOSS)</div>
                    <div className="text-[11px] font-normal mt-0.5 opacity-80">
                      Operating Margin: {operatingProfitMarginPercent}%
                    </div>
                  </div>
                  <div className="text-xl font-mono">{formatNPR(netOperatingProfit)}</div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 2: DAILY COLLECTION REPORT */}
          {activeReportType === 'daily_collection' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-black text-slate-900">Daily Collection Report</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Breakdown of money collected by channel and customer for selected audit date
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  />
                  <button
                    onClick={handleExportDailyCollectionPDF}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Total Collected</div>
                  <div className="text-lg font-black text-emerald-600 mt-1 font-mono">
                    {formatNPR(selectedDateTotalNpr)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Transactions</div>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {selectedDateCollections.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Cash Received</div>
                  <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                    {formatNPR(
                      selectedDateCollections
                        .filter((c) => c.paymentMethod === 'Cash')
                        .reduce((s, c) => s + c.amountNpr, 0)
                    )}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Digital / Bank</div>
                  <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                    {formatNPR(
                      selectedDateCollections
                        .filter((c) => c.paymentMethod !== 'Cash')
                        .reduce((s, c) => s + c.amountNpr, 0)
                    )}
                  </div>
                </div>
              </div>

              {/* Daily Table */}
              <div id="daily-collection-table" className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Customer & Bus</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3 text-right">Amount (NPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDateCollections.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No collection entries recorded on {formatDate(reportDate)}.
                        </td>
                      </tr>
                    ) : (
                      selectedDateCollections.map((col) => (
                        <tr key={col.id}>
                          <td className="py-2.5 px-3 font-mono font-bold">{col.transactionNumber}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900">{col.customerName || 'Ad-hoc'}</span>
                            {col.busNumber && (
                              <span className="text-[10px] text-slate-400 ml-1">({col.busNumber})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{col.categoryLabel || col.category}</td>
                          <td className="py-2.5 px-3 text-slate-700">{col.paymentMethod}</td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                            {col.paymentReference || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600">
                            {formatNPR(col.amountNpr)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 3: MONTHLY INCOME & EXPENSE REPORT */}
          {activeReportType === 'monthly_income' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-black text-slate-900">Monthly Financial Overview</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly income stream categorization and operational cost analysis
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Income Breakdown */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Monthly Revenue Streams ({reportMonth})
                  </h4>
                  <div className="space-y-2">
                    {INCOME_CATEGORIES.map((cat) => {
                      const amount = selectedMonthIncome
                        .filter((inc) => inc.category === cat.id)
                        .reduce((s, c) => s + c.amountNpr, 0);
                      return (
                        <div key={cat.id} className="flex justify-between text-xs py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-700">{cat.label}</span>
                          <span className="font-mono font-bold text-slate-900">{formatNPR(amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Expense Breakdown */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Monthly Expense Centers ({reportMonth})
                  </h4>
                  <div className="space-y-2">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const amount = selectedMonthExpenses
                        .filter((exp) => exp.category === cat.id)
                        .reduce((s, c) => s + c.amountNpr, 0);
                      return (
                        <div key={cat.id} className="flex justify-between text-xs py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-700">{cat.label}</span>
                          <span className="font-mono font-bold text-rose-600">-{formatNPR(amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 4: CASH FLOW STATEMENT */}
          {activeReportType === 'cash_flow' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-black text-slate-900">Cash Flow Statement</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operating inflows vs operational outflows classified by banking and digital wallet rails
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-2.5 px-4">Channel / Gateway</th>
                      <th className="py-2.5 px-4 text-right">Cash Inflows (NPR)</th>
                      <th className="py-2.5 px-4 text-right">Cash Outflows (NPR)</th>
                      <th className="py-2.5 px-4 text-right">Net Liquidity (NPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {PAYMENT_METHODS.map((m) => {
                      const data = cashFlowByMethod[m] || { inflow: 0, outflow: 0, net: 0 };
                      return (
                        <tr key={m} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-semibold text-slate-900">{m}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">
                            +{formatNPR(data.inflow)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                            -{formatNPR(data.outflow)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-black ${
                              data.net >= 0 ? 'text-slate-900' : 'text-rose-600'
                            }`}
                          >
                            {formatNPR(data.net)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-black text-xs border-t-2 border-slate-300">
                      <td className="py-3 px-4">TOTAL NET CASH POSITION</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        +{formatNPR(totalCollectedRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700">
                        -{formatNPR(totalRecordedExpenses)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-base text-slate-900">
                        {formatNPR(netOperatingProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: RECORD DIRECT INCOME                        */}
      {/* ==================================================== */}
      <Modal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        title="Record Realized Income"
        maxWidth="xl"
      >
        <form onSubmit={handleRecordIncome} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Income Stream / Category *</label>
              <select
                value={incomeForm.category}
                onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value as IncomeCategory })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              >
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount (NPR) *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={incomeForm.amountNpr}
                onChange={(e) => setIncomeForm({ ...incomeForm, amountNpr: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Date *</label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
              <select
                value={incomeForm.paymentMethod}
                onChange={(e) =>
                  setIncomeForm({ ...incomeForm, paymentMethod: e.target.value as FinancePaymentMethod })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Txn / Cheque Reference #</label>
              <input
                type="text"
                placeholder="e.g. TXN-ESEWA-881923"
                value={incomeForm.paymentReference}
                onChange={(e) => setIncomeForm({ ...incomeForm, paymentReference: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            {/* Customer Picker (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Linked Customer (Optional)</label>
              <select
                value={incomeForm.customerId}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === e.target.value);
                  setIncomeForm({
                    ...incomeForm,
                    customerId: e.target.value,
                    customerName: cust ? cust.fullName || cust.companyName : '',
                    busNumber: cust?.busRegistrationNumber || incomeForm.busNumber,
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="">-- Ad-hoc / Counter Sale --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* Bus Registration # */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bus Registration #</label>
              <input
                type="text"
                placeholder="e.g. Ba 3 Kha 4521"
                value={incomeForm.busNumber}
                onChange={(e) => setIncomeForm({ ...incomeForm, busNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
              <textarea
                rows={2}
                placeholder="Details of hardware, router serial, or renewal details..."
                value={incomeForm.notes}
                onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsIncomeModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Confirm & Post Income
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 2: RECORD EXPENSE                              */}
      {/* ==================================================== */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Operating Expense"
        maxWidth="xl"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Expense Title *</label>
              <input
                type="text"
                placeholder="e.g. NTC Bulk 4G M2M Data SIM Recharges"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category *</label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount (NPR) *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={expenseForm.amountNpr}
                onChange={(e) => setExpenseForm({ ...expenseForm, amountNpr: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                required
              />
            </div>

            {/* Paid To */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Paid To (Payee / Vendor) *</label>
              <input
                type="text"
                placeholder="e.g. Nepal Doorsanchar Co. Ltd. (NTC)"
                value={expenseForm.paidTo}
                onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
              <select
                value={expenseForm.paymentMethod}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as FinancePaymentMethod })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Disbursement Date *</label>
              <input
                type="date"
                value={expenseForm.paymentDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                required
              />
            </div>

            {/* Receipt / Voucher Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bill / Receipt Number</label>
              <input
                type="text"
                placeholder="e.g. NTC-CR-2083/10-8812"
                value={expenseForm.receiptNumber}
                onChange={(e) => setExpenseForm({ ...expenseForm, receiptNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            {/* Approver */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Approved By (Authorized Executive)</label>
              <input
                type="text"
                value={expenseForm.approvedBy}
                onChange={(e) => setExpenseForm({ ...expenseForm, approvedBy: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Operational Justification / Notes</label>
              <textarea
                rows={2}
                placeholder="Reason for expense, technical scope, or vendor invoice details..."
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Record Disbursement
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 3: GENERATE CUSTOMER INVOICE (13% VAT)         */}
      {/* ==================================================== */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Generate Official 13% VAT Tax Invoice"
        maxWidth="2xl"
      >
        <form onSubmit={handleGenerateInvoice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Select Customer */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer Operator *</label>
              <select
                value={invoiceForm.customerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              >
                <option value="">-- Choose Customer from Directory --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.companyName} {c.busRegistrationNumber ? `(${c.busRegistrationNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Company Name *</label>
              <input
                type="text"
                value={invoiceForm.customerName}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                required
              />
            </div>

            {/* Customer PAN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer PAN / VAT Number</label>
              <input
                type="text"
                placeholder="e.g. 601289341"
                value={invoiceForm.customerPan}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, customerPan: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            {/* Bus Registration # */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bus Number (Vehicle Reg)</label>
              <input
                type="text"
                placeholder="e.g. Ba 3 Kha 4521"
                value={invoiceForm.busNumber}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, busNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Due Date *</label>
              <input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                required
              />
            </div>
          </div>

          {/* Line Items Builder */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">Invoice Line Items</label>
              <button
                type="button"
                onClick={() =>
                  setInvoiceForm({
                    ...invoiceForm,
                    items: [
                      ...invoiceForm.items,
                      { description: 'Additional Device or Service', quantity: 1, unitPriceNpr: 5000 },
                    ],
                  })
                }
                className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {invoiceForm.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Description of goods/service"
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...invoiceForm.items];
                      updated[idx].description = e.target.value;
                      setInvoiceForm({ ...invoiceForm, items: updated });
                    }}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...invoiceForm.items];
                      updated[idx].quantity = Number(e.target.value);
                      setInvoiceForm({ ...invoiceForm, items: updated });
                    }}
                    className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Rate"
                    value={item.unitPriceNpr}
                    onChange={(e) => {
                      const updated = [...invoiceForm.items];
                      updated[idx].unitPriceNpr = Number(e.target.value);
                      setInvoiceForm({ ...invoiceForm, items: updated });
                    }}
                    className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-right"
                    required
                  />
                  <span className="w-24 text-right font-mono font-bold text-xs text-slate-700">
                    {formatNPR(item.quantity * item.unitPriceNpr)}
                  </span>
                  {invoiceForm.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = invoiceForm.items.filter((_, i) => i !== idx);
                        setInvoiceForm({ ...invoiceForm, items: updated });
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}

              {/* VAT & Grand Total Calculations */}
              {(() => {
                const sub = invoiceForm.items.reduce((s, i) => s + i.quantity * i.unitPriceNpr, 0);
                const vat = Math.round(sub * 0.13);
                const tot = sub + vat;
                return (
                  <div className="pt-3 mt-2 border-t border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal (Exclusive of VAT):</span>
                      <span className="font-mono font-semibold">{formatNPR(sub)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Nepal Value Added Tax (13% VAT):</span>
                      <span className="font-mono font-semibold">{formatNPR(vat)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                      <span>Grand Total Payable:</span>
                      <span className="font-mono text-emerald-700">{formatNPR(tot)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Generate & Issue Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 4: RECORD PARTIAL / FULL PAYMENT               */}
      {/* ==================================================== */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Invoice Payment"
        maxWidth="md"
      >
        {selectedInvoiceForPayment && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {/* Invoice Summary Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Invoice #{selectedInvoiceForPayment.invoiceNumber}</span>
                <span>{formatNPR(selectedInvoiceForPayment.totalNpr)}</span>
              </div>
              <div className="text-slate-500">{selectedInvoiceForPayment.customerName}</div>
              <div className="flex justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                <span>Already Paid: {formatNPR(selectedInvoiceForPayment.amountPaidNpr || 0)}</span>
                <span className="font-bold text-amber-700">
                  Remaining Due: {formatNPR(selectedInvoiceForPayment.balanceDueNpr ?? selectedInvoiceForPayment.totalNpr)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (NPR) *</label>
              <input
                type="number"
                min="1"
                max={selectedInvoiceForPayment.balanceDueNpr ?? selectedInvoiceForPayment.totalNpr}
                step="1"
                value={paymentForm.amountNpr}
                onChange={(e) => setPaymentForm({ ...paymentForm, amountNpr: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Enter full or partial payment amount. The remaining balance will stay open on the customer ledger.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as FinancePaymentMethod })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank / Cheque / eSewa Reference #</label>
              <input
                type="text"
                placeholder="e.g. TXN-NABIL-991204"
                value={paymentForm.paymentReference}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Deposit Date *</label>
              <input
                type="date"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Notes</label>
              <input
                type="text"
                placeholder="Optional remark on collection..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Post Payment
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 5: REVERSAL / VOID ENTRY (IMMUTABLE AUDIT)     */}
      {/* ==================================================== */}
      <Modal
        isOpen={isReversalModalOpen}
        onClose={() => setIsReversalModalOpen(false)}
        title="Authorize Transaction Reversal"
        maxWidth="md"
      >
        {reversalTarget && (
          <form onSubmit={handleExecuteReversal} className="space-y-4">
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Zero Hard-Delete Compliance Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-800">
                In compliance with strict financial audit standards, transactions are never hard-deleted. Executing this will post a neutralizing reversing entry and create an immutable audit record.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-900">
                Target: {reversalTarget.type.toUpperCase()}{' '}
                {reversalTarget.item.invoiceNumber ||
                  reversalTarget.item.transactionNumber ||
                  reversalTarget.item.expenseNumber}
              </div>
              <div className="text-slate-500 mt-0.5">
                Amount:{' '}
                {formatNPR(
                  reversalTarget.item.totalNpr ||
                    reversalTarget.item.amountNpr ||
                    reversalTarget.item.amountPaidNpr ||
                    0
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Audit Justification / Reason *
              </label>
              <textarea
                rows={3}
                placeholder="State reason: e.g. Bounced cheque, erroneous duplicate entry, customer credit note..."
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsReversalModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Authorize Reversal
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 6: OFFICIAL NEPAL VAT TAX INVOICE (PRINTABLE) */}
      {/* ==================================================== */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title="VAT Tax Invoice Receipt"
        maxWidth="2xl"
      >
        {selectedInvoice && (
          <div className="space-y-6 text-slate-800">
            {/* Header: Company & Tax Details */}
            <div className="border-b border-slate-300 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900">NETCARE NEPAL PVT. LTD.</h2>
                <p className="text-xs text-slate-600">Subidhanagar, Tinkune, Kathmandu, Nepal</p>
                <p className="text-xs text-slate-600">Phone: +977-01-4112345 | Email: billing@netcarenepal.com</p>
                <div className="inline-block mt-2 px-2.5 py-1 bg-slate-100 rounded text-xs font-mono font-bold text-slate-800 border border-slate-300">
                  PAN / VAT NO: 601289110
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-slate-900 text-white">
                  TAX INVOICE
                </span>
                <div className="text-sm font-mono font-black text-slate-900 mt-2">
                  #{selectedInvoice.invoiceNumber}
                </div>
                <div className="text-xs text-slate-500">Date: {formatDate(selectedInvoice.issuedDate)}</div>
                <div className="text-xs text-slate-500">Due: {formatDate(selectedInvoice.dueDate)}</div>
              </div>
            </div>

            {/* Bill To Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Customer Details:</span>
                <div className="font-bold text-slate-900 mt-1">{selectedInvoice.customerName}</div>
                <div className="text-slate-600 mt-0.5">
                  PAN: {selectedInvoice.customerPan || 'N/A (Consumer Fleet)'}
                </div>
                {selectedInvoice.busNumber && (
                  <div className="text-slate-600 mt-0.5">Bus Reg: {selectedInvoice.busNumber}</div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Status:</span>
                <div className="mt-1 font-bold text-slate-900">
                  Status:{' '}
                  <span className="uppercase text-emerald-700 font-black">{selectedInvoice.status}</span>
                </div>
                <div className="text-slate-600 mt-0.5">
                  Paid to Date: {formatNPR(selectedInvoice.amountPaidNpr || 0)}
                </div>
                <div className="text-slate-600 mt-0.5">
                  Balance Remaining: {formatNPR(selectedInvoice.balanceDueNpr ?? selectedInvoice.totalNpr)}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">S.N.</th>
                    <th className="py-2.5 px-3">Description of Goods / Services</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate (NPR)</th>
                    <th className="py-2.5 px-3 text-right">Amount (NPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{item.description}</td>
                      <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatNPR(item.unitPriceNpr)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatNPR(item.totalNpr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Taxable Amount):</span>
                  <span className="font-mono">{formatNPR(selectedInvoice.amountNpr)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Value Added Tax (13% VAT):</span>
                  <span className="font-mono">{formatNPR(selectedInvoice.vatAmountNpr)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                  <span>Grand Total (NPR):</span>
                  <span className="font-mono">{formatNPR(selectedInvoice.totalNpr)}</span>
                </div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="pt-8 mt-6 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-500">
              <div>
                <p className="font-bold text-slate-800">Receiver's Signature</p>
                <div className="mt-8 border-t border-slate-300 w-40" />
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">For Netcare Nepal Pvt. Ltd.</p>
                <div className="mt-8 border-t border-slate-300 w-40 ml-auto" />
                <p className="text-[10px] text-slate-400 mt-1">Authorized Signatory</p>
              </div>
            </div>

            {/* Print Button */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Tax Invoice</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default FinanceManagement;
