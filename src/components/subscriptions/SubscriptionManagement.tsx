import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  RotateCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Bus,
  Wifi,
  Navigation,
  Video,
  Edit2,
  Trash2,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  Sliders,
  DollarSign,
  Send,
  Copy,
  ExternalLink,
  Layers,
  Smartphone,
  Info,
  Check,
  X,
} from 'lucide-react';
import {
  Subscription,
  SubscriptionPackage,
  Customer,
  InventoryItem,
  Invoice,
  NetworkType,
  SubscriptionPaymentStatus,
  SubscriptionPaymentMethod,
  isCEO,
  isStaffOrHigher,
} from '../../types/erp';
import { formatNPR, formatDate, getDaysUntil, getStatusBadge } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { createDocument, updateDocument, deleteDocument, logAuditEvent } from '../../services/dbService';
import { exportToExcel, exportTableToPDF } from '../../utils/exportUtils';

interface SubscriptionManagementProps {
  subscriptions: Subscription[];
  customers: Customer[];
  packages: SubscriptionPackage[];
  inventory?: InventoryItem[];
  invoices?: Invoice[];
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  subscriptions,
  customers,
  packages,
  inventory = [],
  invoices = [],
}) => {
  const { activeRole, userProfile } = useAuth();
  const canManagePackages = isCEO(activeRole);
  const canManageSubscriptions = isStaffOrHigher(activeRole);

  // Active Main View Tab
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'alerts' | 'schedules' | 'packages' | 'revenue'>('subscriptions');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  const [expiryAlertFilter, setExpiryAlertFilter] = useState<string>('all'); // 'all', '1day', '3days', '7days', '15days', '30days', 'expired'
  const [schedulePeriod, setSchedulePeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Modal States
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  // Selected Records for Modals
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);

  // Feedback & Alert Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedReminder, setCopiedReminder] = useState(false);

  // ==========================================
  // Form States
  // ==========================================

  // 1. Activation Form
  const [activationForm, setActivationForm] = useState<{
    customerId: string;
    customerName: string;
    customerPhone: string;
    busRegistrationNumber: string;
    busRoute: string;
    packageId: string;
    activationDate: string;
    durationMonths: number;
    subscriptionAmount: number;
    discount: number;
    paymentStatus: SubscriptionPaymentStatus;
    paymentMethod: SubscriptionPaymentMethod;
    paymentReference: string;
    simNumber: string;
    simImsi: string;
    simOperator: 'NTC' | 'Ncell' | 'Dual SIM';
    routerSerialNumber: string;
    gpsImei: string;
    notes: string;
  }>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    busRegistrationNumber: '',
    busRoute: '',
    packageId: '',
    activationDate: new Date().toISOString().split('T')[0],
    durationMonths: 1,
    subscriptionAmount: 3200,
    discount: 0,
    paymentStatus: 'paid',
    paymentMethod: 'eSewa',
    paymentReference: '',
    simNumber: '',
    simImsi: '',
    simOperator: 'Dual SIM',
    routerSerialNumber: '',
    gpsImei: '',
    notes: '',
  });

  // 2. Renewal Form
  const [renewalForm, setRenewalForm] = useState<{
    subId: string;
    monthsToAdd: number;
    newExpiryDate: string;
    discount: number;
    totalAmount: number;
    paymentStatus: SubscriptionPaymentStatus;
    paymentMethod: SubscriptionPaymentMethod;
    paymentReference: string;
    notes: string;
  }>({
    subId: '',
    monthsToAdd: 1,
    newExpiryDate: '',
    discount: 0,
    totalAmount: 0,
    paymentStatus: 'paid',
    paymentMethod: 'eSewa',
    paymentReference: '',
    notes: '',
  });

  // 3. Upgrade Form
  const [upgradeForm, setUpgradeForm] = useState<{
    subId: string;
    currentPackageId: string;
    newPackageId: string;
    priceDifference: number;
    paymentStatus: SubscriptionPaymentStatus;
    paymentMethod: SubscriptionPaymentMethod;
    paymentReference: string;
    notes: string;
  }>({
    subId: '',
    currentPackageId: '',
    newPackageId: '',
    priceDifference: 0,
    paymentStatus: 'paid',
    paymentMethod: 'eSewa',
    paymentReference: '',
    notes: '',
  });

  // 4. Package Form (CEO)
  const [packageForm, setPackageForm] = useState<{
    id?: string;
    packageName: string;
    networkType: NetworkType;
    durationMonths: number;
    durationLabel: string;
    sellingPriceNpr: number;
    dataAllowance: string;
    speed: string;
    supportedDevices: number;
    description: string;
    status: 'active' | 'inactive';
  }>({
    packageName: '',
    networkType: 'Dual Network',
    durationMonths: 1,
    durationLabel: 'Monthly (1 Mo)',
    sellingPriceNpr: 5500,
    dataAllowance: '300 GB Combined FUP',
    speed: '50 Mbps Dual-Carrier',
    supportedDevices: 50,
    description: 'High-speed dual-SIM auto failover bus internet.',
    status: 'active',
  });

  // ==========================================
  // Alert System Counts & Calculation
  // ==========================================
  const alertStats = useMemo(() => {
    let count1Day = 0;
    let count3Days = 0;
    let count7Days = 0;
    let count15Days = 0;
    let count30Days = 0;
    let countExpired = 0;
    let countActive = 0;
    let totalMRR = 0;
    let pendingCollectionsNpr = 0;

    subscriptions.forEach((sub) => {
      const days = getDaysUntil(sub.expiryDate);
      const isSubExpired = days < 0 || sub.status === 'expired';

      if (isSubExpired) {
        countExpired++;
      } else {
        countActive++;
        if (days >= 0 && days <= 1) count1Day++;
        if (days > 1 && days <= 3) count3Days++;
        if (days > 3 && days <= 7) count7Days++;
        if (days > 7 && days <= 15) count15Days++;
        if (days > 15 && days <= 30) count30Days++;
      }

      // Financials
      if (sub.status === 'active' || sub.status === 'pending_renewal') {
        const monthlyEquivalent = sub.durationMonths && sub.durationMonths > 0
          ? Math.round(sub.totalAmount / sub.durationMonths)
          : sub.totalAmount || sub.feeNpr || 0;
        totalMRR += monthlyEquivalent;
      }

      if (sub.paymentStatus === 'unpaid') {
        pendingCollectionsNpr += sub.totalAmount || sub.feeNpr || 0;
      }
    });

    return {
      count1Day,
      count3Days,
      count7Days,
      count15Days,
      count30Days,
      countExpired,
      countActive,
      totalMRR,
      pendingCollectionsNpr,
    };
  }, [subscriptions]);

  // ==========================================
  // Filtered Subscriptions
  // ==========================================
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (sub.busRegistrationNumber && sub.busRegistrationNumber.toLowerCase().includes(q)) ||
        (sub.vehicleNumber && sub.vehicleNumber.toLowerCase().includes(q)) ||
        (sub.customerName && sub.customerName.toLowerCase().includes(q)) ||
        (sub.packageName && sub.packageName.toLowerCase().includes(q)) ||
        (sub.planName && sub.planName.toLowerCase().includes(q)) ||
        (sub.simNumber && sub.simNumber.toLowerCase().includes(q)) ||
        (sub.customerPhone && sub.customerPhone.includes(q)) ||
        (sub.subscriptionId && sub.subscriptionId.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      const matchesNetwork =
        networkFilter === 'all' ||
        (sub.networkType && sub.networkType.toLowerCase() === networkFilter.toLowerCase());

      // Expiry Alert filter
      let matchesAlert = true;
      if (expiryAlertFilter !== 'all') {
        const days = getDaysUntil(sub.expiryDate);
        if (expiryAlertFilter === '1day') matchesAlert = days >= 0 && days <= 1;
        else if (expiryAlertFilter === '3days') matchesAlert = days >= 0 && days <= 3;
        else if (expiryAlertFilter === '7days') matchesAlert = days >= 0 && days <= 7;
        else if (expiryAlertFilter === '15days') matchesAlert = days >= 0 && days <= 15;
        else if (expiryAlertFilter === '30days') matchesAlert = days >= 0 && days <= 30;
        else if (expiryAlertFilter === 'expired') matchesAlert = days < 0 || sub.status === 'expired';
      }

      return matchesSearch && matchesStatus && matchesNetwork && matchesAlert;
    });
  }, [subscriptions, searchTerm, statusFilter, networkFilter, expiryAlertFilter]);

  // ==========================================
  // Renewal Schedules (Daily, Weekly, Monthly)
  // ==========================================
  const scheduleSubscriptions = useMemo(() => {
    return subscriptions
      .filter((sub) => {
        const days = getDaysUntil(sub.expiryDate);
        if (days < 0) return false; // Expired handled separately
        if (schedulePeriod === 'daily') return days <= 2; // Today & Tomorrow
        if (schedulePeriod === 'weekly') return days <= 7; // Next 7 Days
        if (schedulePeriod === 'monthly') return days <= 30; // Next 30 Days
        return true;
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [subscriptions, schedulePeriod]);

  // ==========================================
  // Helper: Get Expiry Urgency Badge
  // ==========================================
  const getExpiryBadge = (expiryDateStr: string, status: string) => {
    const days = getDaysUntil(expiryDateStr);
    if (status === 'expired' || days < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Expired ({Math.abs(days)}d ago)
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 animate-pulse">
          <Clock className="w-3 h-3 text-red-600" />
          Expires Today!
        </span>
      );
    }
    if (days === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 font-bold animate-pulse">
          <Clock className="w-3 h-3 text-red-600" />
          1 Day Left
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          {days} Days Left
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          {days} Days Left
        </span>
      );
    }
    if (days <= 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3 h-3 text-blue-500" />
          {days} Days Left
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3 h-3 text-slate-500" />
          {days} Days Left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        {days} Days Left
      </span>
    );
  };

  // ==========================================
  // Helper: Network Type Badge
  // ==========================================
  const getNetworkBadge = (networkType?: NetworkType | string) => {
    switch (networkType) {
      case 'Dual Network':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Layers className="w-3 h-3 text-purple-600" />
            Dual Network (NTC + Ncell)
          </span>
        );
      case 'NTC':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Smartphone className="w-3 h-3 text-blue-600" />
            NTC 4G
          </span>
        );
      case 'Ncell':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Smartphone className="w-3 h-3 text-indigo-600" />
            Ncell 4G
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Wifi className="w-3 h-3 text-slate-500" />
            Standard
          </span>
        );
    }
  };

  // ==========================================
  // Action Handlers
  // ==========================================

  // Open New Activation Modal
  const handleOpenActivationModal = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const defaultCust = customers[0];
    const defaultPkg = packages.find((p) => p.status === 'active') || packages[0];
    const defaultBus = defaultCust?.fleetVehicles?.[0] || defaultCust?.busRegistrationNumber || 'Ba 3 Kha ';

    setActivationForm({
      customerId: defaultCust?.id || '',
      customerName: defaultCust?.companyName || defaultCust?.fullName || '',
      customerPhone: defaultCust?.phone || '',
      busRegistrationNumber: defaultBus,
      busRoute: defaultCust?.busRoute || 'Kathmandu - Pokhara Luxury Coach',
      packageId: defaultPkg?.id || '',
      activationDate: new Date().toISOString().split('T')[0],
      durationMonths: defaultPkg?.durationMonths || 1,
      subscriptionAmount: defaultPkg?.sellingPriceNpr || 3200,
      discount: 0,
      paymentStatus: 'paid',
      paymentMethod: 'eSewa',
      paymentReference: 'ESEWA-' + Math.floor(100000 + Math.random() * 900000),
      simNumber: '9841',
      simImsi: '42901-',
      simOperator: defaultPkg?.networkType === 'Dual Network' ? 'Dual SIM' : (defaultPkg?.networkType || 'NTC'),
      routerSerialNumber: 'RUTX11-' + Math.floor(100000 + Math.random() * 900000),
      gpsImei: '',
      notes: 'New bus WiFi onboarding.',
    });
    setIsActivationModalOpen(true);
  };

  // Handle Customer Change in Activation
  const handleCustomerSelectChange = (custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setActivationForm((prev) => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.companyName || cust.fullName,
        customerPhone: cust.phone || '',
        busRegistrationNumber: cust.busRegistrationNumber || cust.fleetVehicles?.[0] || prev.busRegistrationNumber,
        busRoute: cust.busRoute || prev.busRoute,
      }));
    }
  };

  // Handle Package Change in Activation
  const handlePackageSelectChange = (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (pkg) {
      setActivationForm((prev) => ({
        ...prev,
        packageId: pkg.id,
        durationMonths: pkg.durationMonths,
        subscriptionAmount: pkg.sellingPriceNpr,
        simOperator: pkg.networkType === 'Dual Network' ? 'Dual SIM' : (pkg.networkType as any),
      }));
    }
  };

  // Submit Activation (with duplicate check & finance link)
  const handleSaveActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const busRegClean = activationForm.busRegistrationNumber.trim();
    if (!busRegClean) {
      setErrorMsg('Bus registration number is required.');
      return;
    }

    if (!activationForm.customerId) {
      setErrorMsg('Please select a valid customer.');
      return;
    }

    // 1. DUPLICATE CHECK: Prevent duplicate active subscriptions for the same bus and overlapping dates
    const existingActive = subscriptions.find(
      (s) =>
        s.busRegistrationNumber.trim().toLowerCase() === busRegClean.toLowerCase() &&
        (s.status === 'active' || s.status === 'pending_renewal') &&
        new Date(s.expiryDate).getTime() >= new Date(activationForm.activationDate).getTime()
    );

    if (existingActive) {
      setErrorMsg(
        `DUPLICATE SUBSCRIPTION BLOCKED: Bus ${busRegClean} already has an active subscription ("${
          existingActive.packageName || existingActive.planName
        }") valid until ${formatDate(existingActive.expiryDate)}. Overlapping active subscriptions are not permitted. Please use "Renew" or "Upgrade Package" instead.`
      );
      return;
    }

    // 2. PAYMENT RECORD CHECK: Never mark as paid without verified payment reference
    if (activationForm.paymentStatus === 'paid') {
      if (!activationForm.paymentMethod || !activationForm.paymentReference.trim()) {
        setErrorMsg(
          'A verified payment record is required! To mark as Paid, you must enter the payment method and transaction ID / voucher reference.'
        );
        return;
      }
    }

    try {
      const selectedPkg = packages.find((p) => p.id === activationForm.packageId);
      const pkgName = selectedPkg ? selectedPkg.packageName : 'Bus Internet Package';
      const netType = selectedPkg ? selectedPkg.networkType : 'Dual Network';

      // Calculate Expiry Date from activationDate + durationMonths
      const actDate = new Date(activationForm.activationDate);
      const expDate = new Date(actDate);
      expDate.setMonth(expDate.getMonth() + (activationForm.durationMonths || 1));
      const expDateStr = expDate.toISOString().split('T')[0];

      const totalAmt = Math.max(0, activationForm.subscriptionAmount - activationForm.discount);
      const newSubId = `NC-SUB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      const newSubData: Omit<Subscription, 'id'> = {
        subscriptionId: newSubId,
        customerId: activationForm.customerId,
        customerName: activationForm.customerName,
        customerPhone: activationForm.customerPhone,
        busRegistrationNumber: busRegClean,
        vehicleNumber: busRegClean,
        busRoute: activationForm.busRoute,
        route: activationForm.busRoute,
        packageId: activationForm.packageId,
        packageName: pkgName,
        planName: pkgName,
        networkType: netType,
        durationMonths: activationForm.durationMonths,
        serviceType: 'combo_all',
        billingCycle: activationForm.durationMonths === 1 ? 'monthly' : activationForm.durationMonths === 3 ? 'quarterly' : 'annual',
        subscriptionAmount: activationForm.subscriptionAmount,
        feeNpr: activationForm.subscriptionAmount,
        discount: activationForm.discount,
        totalAmount: totalAmt,
        paymentStatus: activationForm.paymentStatus,
        paymentMethod: activationForm.paymentMethod,
        paymentReference: activationForm.paymentReference.trim(),
        paymentVerified: activationForm.paymentStatus === 'paid' && Boolean(activationForm.paymentReference.trim()),
        simNumber: activationForm.simNumber,
        simImsi: activationForm.simImsi,
        simOperator: activationForm.simOperator,
        routerSerialNumber: activationForm.routerSerialNumber,
        routerSerial: activationForm.routerSerialNumber,
        gpsImei: activationForm.gpsImei,
        activationDate: activationForm.activationDate,
        startDate: activationForm.activationDate,
        expiryDate: expDateStr,
        autoRenew: true,
        status: 'active',
        lastPaymentDate: activationForm.paymentStatus === 'paid' ? activationForm.activationDate : undefined,
        renewalCount: 0,
        notes: activationForm.notes,
        createdBy: userProfile?.userId || 'usr-001',
        createdByName: userProfile?.fullName || 'Netcare Staff',
        createdAt: new Date().toISOString(),
      };

      // 1. Create Subscription Document
      const createdSubId = await createDocument('subscriptions', newSubData);

      // 2. CONNECT TO FINANCE: Generate Linked Invoice with 13% Nepal VAT
      const invoiceNumber = `NC-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const vatAmt = Math.round(totalAmt * 0.13);
      const invoiceData: Omit<Invoice, 'id'> = {
        invoiceNumber,
        customerId: activationForm.customerId,
        customerName: activationForm.customerName,
        subscriptionId: createdSubId || newSubId,
        amountNpr: totalAmt,
        vatAmountNpr: vatAmt,
        totalNpr: totalAmt + vatAmt,
        dueDate: expDateStr,
        issuedDate: activationForm.activationDate,
        status: activationForm.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        paymentMethod: activationForm.paymentMethod as any,
        paymentReference: activationForm.paymentReference.trim(),
        paidDate: activationForm.paymentStatus === 'paid' ? activationForm.activationDate : undefined,
        lineItems: [
          {
            description: `Bus Internet Package: ${pkgName} (${netType}) - Vehicle: ${busRegClean}`,
            quantity: 1,
            unitPriceNpr: totalAmt,
            totalNpr: totalAmt,
          },
        ],
        createdAt: new Date().toISOString(),
      };
      await createDocument('invoices', invoiceData);

      // 3. Log Audit Event
      await logAuditEvent(
        'NEW_SUBSCRIPTION_ACTIVATED',
        'Subscription',
        `Activated ${pkgName} on bus ${busRegClean} for ${activationForm.customerName}. Total: ${formatNPR(totalAmt)} (${activationForm.paymentStatus}). Linked Invoice: ${invoiceNumber}`,
        userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: activeRole } : undefined
      );

      setIsActivationModalOpen(false);
      setSuccessMsg(`Subscription activated successfully for Bus ${busRegClean}! Linked invoice ${invoiceNumber} created.`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error('Error activating subscription:', err);
      setErrorMsg(err?.message || 'Failed to activate subscription in database.');
    }
  };

  // Open Renewal Modal
  const handleOpenRenewalModal = (sub: Subscription) => {
    setSelectedSub(sub);
    setErrorMsg(null);
    setSuccessMsg(null);

    const currentMonths = sub.durationMonths || 1;
    // Calculate new expiry starting from current expiry if active, or from today if already expired
    const baseDate = new Date(sub.expiryDate).getTime() > Date.now() ? new Date(sub.expiryDate) : new Date();
    baseDate.setMonth(baseDate.getMonth() + currentMonths);
    const newExp = baseDate.toISOString().split('T')[0];

    const fee = sub.subscriptionAmount || sub.feeNpr || 3200;

    setRenewalForm({
      subId: sub.id,
      monthsToAdd: currentMonths,
      newExpiryDate: newExp,
      discount: 0,
      totalAmount: fee,
      paymentStatus: 'paid',
      paymentMethod: sub.paymentMethod || 'eSewa',
      paymentReference: 'REN-' + Math.floor(100000 + Math.random() * 900000),
      notes: `Renewed for ${currentMonths} month(s).`,
    });
    setIsRenewalModalOpen(true);
  };

  // Re-calculate renewal expiry when monthsToAdd changes
  const handleRenewalMonthsChange = (months: number) => {
    if (!selectedSub) return;
    const baseDate = new Date(selectedSub.expiryDate).getTime() > Date.now() ? new Date(selectedSub.expiryDate) : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);
    const newExp = baseDate.toISOString().split('T')[0];

    // Compute fee pro-rated by months
    const baseMonthly = selectedSub.durationMonths && selectedSub.durationMonths > 0
      ? selectedSub.subscriptionAmount / selectedSub.durationMonths
      : selectedSub.subscriptionAmount || 3200;
    const newFee = Math.round(baseMonthly * months);

    setRenewalForm((prev) => ({
      ...prev,
      monthsToAdd: months,
      newExpiryDate: newExp,
      totalAmount: Math.max(0, newFee - prev.discount),
    }));
  };

  // Submit Renewal
  const handleSaveRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setErrorMsg(null);

    if (renewalForm.paymentStatus === 'paid') {
      if (!renewalForm.paymentMethod || !renewalForm.paymentReference.trim()) {
        setErrorMsg('A verified payment record is required! Please provide payment method and transaction reference.');
        return;
      }
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const renewalCount = (selectedSub.renewalCount || 0) + 1;

      const updatedFields: Partial<Subscription> = {
        expiryDate: renewalForm.newExpiryDate,
        status: 'active',
        lastRenewalDate: todayStr,
        lastPaymentDate: renewalForm.paymentStatus === 'paid' ? todayStr : selectedSub.lastPaymentDate,
        paymentStatus: renewalForm.paymentStatus,
        paymentMethod: renewalForm.paymentMethod,
        paymentReference: renewalForm.paymentReference.trim(),
        paymentVerified: renewalForm.paymentStatus === 'paid',
        renewalCount,
        notes: selectedSub.notes ? `${selectedSub.notes}\n[${todayStr}] ${renewalForm.notes}` : renewalForm.notes,
        updatedAt: new Date().toISOString(),
      };

      await updateDocument('subscriptions', selectedSub.id, updatedFields);

      // Generate renewal invoice
      const invoiceNumber = `NC-REN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const vatAmt = Math.round(renewalForm.totalAmount * 0.13);
      const invoiceData: Omit<Invoice, 'id'> = {
        invoiceNumber,
        customerId: selectedSub.customerId,
        customerName: selectedSub.customerName,
        subscriptionId: selectedSub.id,
        amountNpr: renewalForm.totalAmount,
        vatAmountNpr: vatAmt,
        totalNpr: renewalForm.totalAmount + vatAmt,
        dueDate: renewalForm.newExpiryDate,
        issuedDate: todayStr,
        status: renewalForm.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        paymentMethod: renewalForm.paymentMethod as any,
        paymentReference: renewalForm.paymentReference.trim(),
        paidDate: renewalForm.paymentStatus === 'paid' ? todayStr : undefined,
        lineItems: [
          {
            description: `Renewal: ${selectedSub.packageName || selectedSub.planName} (${renewalForm.monthsToAdd} Months) - Bus: ${selectedSub.busRegistrationNumber}`,
            quantity: 1,
            unitPriceNpr: renewalForm.totalAmount,
            totalNpr: renewalForm.totalAmount,
          },
        ],
        createdAt: new Date().toISOString(),
      };
      await createDocument('invoices', invoiceData);

      await logAuditEvent(
        'SUBSCRIPTION_RENEWED',
        'Subscription',
        `Renewed subscription for Bus ${selectedSub.busRegistrationNumber} (${selectedSub.customerName}) until ${formatDate(
          renewalForm.newExpiryDate
        )}. Total: ${formatNPR(renewalForm.totalAmount)}. Invoice: ${invoiceNumber}`,
        userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: activeRole } : undefined
      );

      setIsRenewalModalOpen(false);
      setSuccessMsg(`Bus ${selectedSub.busRegistrationNumber} renewed until ${formatDate(renewalForm.newExpiryDate)}!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error renewing subscription:', err);
      setErrorMsg(err?.message || 'Failed to process renewal.');
    }
  };

  // Open Upgrade Modal
  const handleOpenUpgradeModal = (sub: Subscription) => {
    setSelectedSub(sub);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Pick first available package different from current
    const targetPkg = packages.find((p) => p.id !== sub.packageId && p.status === 'active') || packages[0];
    const currentPrice = sub.subscriptionAmount || sub.feeNpr || 0;
    const newPrice = targetPkg ? targetPkg.sellingPriceNpr : currentPrice;
    const diff = Math.max(0, newPrice - currentPrice);

    setUpgradeForm({
      subId: sub.id,
      currentPackageId: sub.packageId || '',
      newPackageId: targetPkg ? targetPkg.id : '',
      priceDifference: diff,
      paymentStatus: 'paid',
      paymentMethod: 'eSewa',
      paymentReference: 'UPG-' + Math.floor(100000 + Math.random() * 900000),
      notes: `Upgraded from ${sub.packageName || sub.planName} to ${targetPkg?.packageName}.`,
    });
    setIsUpgradeModalOpen(true);
  };

  // Handle Upgrade Package Select
  const handleUpgradeTargetChange = (newPkgId: string) => {
    if (!selectedSub) return;
    const newPkg = packages.find((p) => p.id === newPkgId);
    const currentPrice = selectedSub.subscriptionAmount || selectedSub.feeNpr || 0;
    const targetPrice = newPkg ? newPkg.sellingPriceNpr : currentPrice;
    const diff = Math.max(0, targetPrice - currentPrice);

    setUpgradeForm((prev) => ({
      ...prev,
      newPackageId: newPkgId,
      priceDifference: diff,
    }));
  };

  // Submit Package Upgrade
  const handleSaveUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setErrorMsg(null);

    const newPkg = packages.find((p) => p.id === upgradeForm.newPackageId);
    if (!newPkg) {
      setErrorMsg('Please select a valid new package.');
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const previousPlan = selectedSub.packageName || selectedSub.planName;

      const updatedFields: Partial<Subscription> = {
        packageId: newPkg.id,
        packageName: newPkg.packageName,
        planName: newPkg.packageName,
        networkType: newPkg.networkType,
        previousPackageName: previousPlan,
        subscriptionAmount: newPkg.sellingPriceNpr,
        feeNpr: newPkg.sellingPriceNpr,
        totalAmount: newPkg.sellingPriceNpr,
        simOperator: newPkg.networkType === 'Dual Network' ? 'Dual SIM' : (newPkg.networkType as any),
        notes: selectedSub.notes
          ? `${selectedSub.notes}\n[${todayStr}] Package Upgraded to ${newPkg.packageName}. Tech Note: Verify dual SIM insertion/failover test.`
          : `[${todayStr}] Package Upgraded to ${newPkg.packageName}`,
        updatedAt: new Date().toISOString(),
      };

      await updateDocument('subscriptions', selectedSub.id, updatedFields);

      // If price difference > 0, generate upgrade invoice
      if (upgradeForm.priceDifference > 0) {
        const invoiceNumber = `NC-UPG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const vatAmt = Math.round(upgradeForm.priceDifference * 0.13);
        const invoiceData: Omit<Invoice, 'id'> = {
          invoiceNumber,
          customerId: selectedSub.customerId,
          customerName: selectedSub.customerName,
          subscriptionId: selectedSub.id,
          amountNpr: upgradeForm.priceDifference,
          vatAmountNpr: vatAmt,
          totalNpr: upgradeForm.priceDifference + vatAmt,
          dueDate: todayStr,
          issuedDate: todayStr,
          status: upgradeForm.paymentStatus === 'paid' ? 'paid' : 'unpaid',
          paymentMethod: upgradeForm.paymentMethod as any,
          paymentReference: upgradeForm.paymentReference.trim(),
          paidDate: upgradeForm.paymentStatus === 'paid' ? todayStr : undefined,
          lineItems: [
            {
              description: `Package Upgrade Differential: ${previousPlan} -> ${newPkg.packageName} (Bus: ${selectedSub.busRegistrationNumber})`,
              quantity: 1,
              unitPriceNpr: upgradeForm.priceDifference,
              totalNpr: upgradeForm.priceDifference,
            },
          ],
          createdAt: new Date().toISOString(),
        };
        await createDocument('invoices', invoiceData);
      }

      await logAuditEvent(
        'PACKAGE_UPGRADED',
        'Subscription',
        `Upgraded package for Bus ${selectedSub.busRegistrationNumber} from "${previousPlan}" to "${newPkg.packageName}". Difference: ${formatNPR(
          upgradeForm.priceDifference
        )}`,
        userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: activeRole } : undefined
      );

      setIsUpgradeModalOpen(false);
      setSuccessMsg(`Bus ${selectedSub.busRegistrationNumber} successfully upgraded to ${newPkg.packageName}!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error upgrading package:', err);
      setErrorMsg(err?.message || 'Failed to upgrade package.');
    }
  };

  // Open Details Modal
  const handleOpenDetails = (sub: Subscription) => {
    setSelectedSub(sub);
    setIsDetailsModalOpen(true);
  };

  // Open Reminder Generator Modal
  const handleOpenReminder = (sub: Subscription) => {
    setSelectedSub(sub);
    setCopiedReminder(false);
    setIsReminderModalOpen(true);
  };

  // Copy Reminder Text
  const getReminderMessage = (sub: Subscription) => {
    const days = getDaysUntil(sub.expiryDate);
    const busNo = sub.busRegistrationNumber || sub.vehicleNumber;
    const pkg = sub.packageName || sub.planName;
    const exp = formatDate(sub.expiryDate);
    const fee = formatNPR(sub.totalAmount || sub.feeNpr || 3200);

    return `नमस्ते! Netcare Nepal Pvt. Ltd. बाट Bus No: ${busNo} को ${pkg} सेवा ${exp} (${days <= 0 ? 'समाप्त भएको छ' : days + ' दिन बाँकी'}) मा समाप्त हुँदैछ। \n\nबसमा यात्रुहरुको लागि द्रुत WiFi सेवा निरन्तर सुचारु राख्न कृपया नविकरण शुल्क ${fee} eSewa (9851023456 - Netcare Nepal) वा बैंक ट्रान्सफर मार्फत भुक्तानी गरि हामीलाई जानकारी गराउनुहोला। \n\nसम्पर्क: Netcare Nepal, काठमाडौँ | फोन: +977-01-4987654 / 9851023456 | www.netcarenepal.com`;
  };

  // Copy Reminder to Clipboard
  const handleCopyReminder = () => {
    if (!selectedSub) return;
    navigator.clipboard.writeText(getReminderMessage(selectedSub));
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 3000);
  };

  // Open WhatsApp with Reminder
  const handleOpenWhatsApp = () => {
    if (!selectedSub) return;
    const cleanPhone = (selectedSub.customerPhone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(getReminderMessage(selectedSub));
    const url = `https://wa.me/${cleanPhone}?text=${text}`;
    window.open(url, '_blank');
  };

  // ==========================================
  // Package Management Handlers (CEO Only)
  // ==========================================
  const handleOpenCreatePackage = () => {
    setSelectedPackage(null);
    setPackageForm({
      packageName: '',
      networkType: 'Dual Network',
      durationMonths: 1,
      durationLabel: 'Monthly (1 Mo)',
      sellingPriceNpr: 5500,
      dataAllowance: '300 GB Combined Dual-SIM FUP',
      speed: '50 Mbps Dual-Carrier',
      supportedDevices: 50,
      description: 'Industrial dual-SIM router with auto failover between NTC and Ncell.',
      status: 'active',
    });
    setIsPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: SubscriptionPackage) => {
    setSelectedPackage(pkg);
    setPackageForm({
      id: pkg.id,
      packageName: pkg.packageName,
      networkType: pkg.networkType,
      durationMonths: pkg.durationMonths,
      durationLabel: pkg.durationLabel,
      sellingPriceNpr: pkg.sellingPriceNpr,
      dataAllowance: pkg.dataAllowance,
      speed: pkg.speed,
      supportedDevices: pkg.supportedDevices,
      description: pkg.description,
      status: pkg.status,
    });
    setIsPackageModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.packageName.trim()) {
      setErrorMsg('Package name is required.');
      return;
    }

    try {
      if (selectedPackage) {
        // Edit existing package
        await updateDocument('packages', selectedPackage.id, {
          ...packageForm,
          updatedAt: new Date().toISOString(),
        });
        await logAuditEvent(
          'PACKAGE_UPDATED',
          'Subscription',
          `CEO updated package "${packageForm.packageName}" (Price: ${formatNPR(packageForm.sellingPriceNpr)})`,
          userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: activeRole } : undefined
        );
      } else {
        // Create new package
        const newPkgId = `pkg-${Math.floor(100 + Math.random() * 900)}`;
        const newPkgData: SubscriptionPackage = {
          id: newPkgId,
          ...packageForm,
          createdAt: new Date().toISOString(),
        };
        await createDocument('packages', newPkgData);
        await logAuditEvent(
          'NEW_PACKAGE_CREATED',
          'Subscription',
          `CEO created new subscription package "${packageForm.packageName}" (${packageForm.networkType}, ${formatNPR(packageForm.sellingPriceNpr)})`,
          userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: activeRole } : undefined
        );
      }

      setIsPackageModalOpen(false);
      setSuccessMsg('Package successfully saved!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error saving package:', err);
      setErrorMsg(err?.message || 'Failed to save package.');
    }
  };

  const handleTogglePackageStatus = async (pkg: SubscriptionPackage) => {
    try {
      const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
      await updateDocument('packages', pkg.id, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      await logAuditEvent(
        'PACKAGE_STATUS_CHANGED',
        'Subscription',
        `Changed package "${pkg.packageName}" status to ${newStatus}`,
        userProfile ? { id: userProfile.userId, name: userProfile.fullName, role: activeRole } : undefined
      );
    } catch (err: any) {
      console.error('Error toggling package status:', err);
    }
  };

  // ==========================================
  // Export Handlers
  // ==========================================
  const handleExportExcel = () => {
    const exportData = filteredSubscriptions.map((s) => ({
      'Subscription ID': s.subscriptionId || s.id,
      'Bus Registration': s.busRegistrationNumber || s.vehicleNumber,
      'Customer Name': s.customerName,
      Route: s.busRoute || s.route || '-',
      Package: s.packageName || s.planName,
      'Network Type': s.networkType || 'Dual Network',
      'Activation Date': formatDate(s.activationDate || s.startDate),
      'Expiry Date': formatDate(s.expiryDate),
      'Days Left': getDaysUntil(s.expiryDate),
      'Base Fee (NPR)': s.subscriptionAmount || s.feeNpr,
      'Discount (NPR)': s.discount || 0,
      'Total Amount (NPR)': s.totalAmount || s.feeNpr,
      'Payment Status': s.paymentStatus || 'paid',
      'Payment Method': s.paymentMethod || 'eSewa',
      'Payment Reference': s.paymentReference || '-',
      'SIM Number': s.simNumber || '-',
      'Router Serial': s.routerSerialNumber || s.routerSerial || '-',
      Status: s.status,
    }));
    exportToExcel(exportData, `Netcare_Subscriptions_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const headers = [
      'Sub ID',
      'Bus Reg No',
      'Customer',
      'Package',
      'Network',
      'Expiry Date',
      'Days Left',
      'Total (NPR)',
      'Pay Status',
    ];
    const rows = filteredSubscriptions.map((s) => [
      s.subscriptionId || s.id.slice(0, 8),
      s.busRegistrationNumber || s.vehicleNumber,
      s.customerName,
      s.packageName || s.planName,
      s.networkType || 'Dual Network',
      formatDate(s.expiryDate),
      String(getDaysUntil(s.expiryDate)),
      formatNPR(s.totalAmount || s.feeNpr),
      (s.paymentStatus || 'paid').toUpperCase(),
    ]);

    exportTableToPDF(
      'Netcare Nepal ERP - Subscription & Fleet Telematics Report',
      headers,
      rows,
      `Netcare_Subscriptions_${new Date().toISOString().split('T')[0]}`
    );
  };

  return (
    <div className="space-y-6">
      {/* ==========================================
          Header & Primary Actions
      ========================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
              Fleet Connectivity & Telematics
            </span>
            <span className="text-xs text-slate-500 font-medium">Asia/Kathmandu • DD/MM/YYYY</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Wifi className="w-7 h-7 text-red-600" />
            Subscription Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Single-network (NTC / Ncell) and Dual-Network high-speed WiFi, GPS and CCTV telematics for highway bus fleets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Actions */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
            title="Export filtered records to Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
            title="Export clean PDF report"
          >
            <FileText className="w-4 h-4 text-red-600" />
            PDF
          </button>

          {/* CEO Package Management */}
          {canManagePackages && (
            <button
              onClick={() => {
                setActiveTab('packages');
                handleOpenCreatePackage();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-xs transition-colors"
            >
              <Sliders className="w-4 h-4 text-amber-700" />
              Configure Packages
            </button>
          )}

          {/* New Subscription Activation */}
          {canManageSubscriptions && (
            <button
              onClick={handleOpenActivationModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              New Subscription Activation
            </button>
          )}
        </div>
      </div>

      {/* Success & Error Banner notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl flex items-center justify-between text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl flex items-center justify-between text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==========================================
          ALERT SYSTEM BANNER (30, 15, 7, 3, 1 Day Alert Cadence)
      ========================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-xl border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">
                  Upcoming Renewal Alert System
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-red-600 text-white tracking-wider">
                  Live Radar
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Targeted proactive renewals at 30, 15, 7, 3 and 1 day before service cutoff.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Monthly Recurring Revenue:</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">
              {formatNPR(alertStats.totalMRR)}
            </span>
          </div>
        </div>

        {/* Alert Cadence Grid Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-700/60">
          {/* 1 Day Alert */}
          <button
            onClick={() => {
              setActiveTab('subscriptions');
              setExpiryAlertFilter(expiryAlertFilter === '1day' ? 'all' : '1day');
            }}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              expiryAlertFilter === '1day'
                ? 'bg-red-600/30 border-red-400 shadow-md ring-2 ring-red-400/50'
                : 'bg-slate-800/80 hover:bg-slate-800 border-red-500/40 hover:border-red-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider">1 Day Left</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-red-200">{alertStats.count1Day}</span>
              <span className="text-[10px] text-red-300/80">Immediate</span>
            </div>
          </button>

          {/* 3 Days Alert */}
          <button
            onClick={() => {
              setActiveTab('subscriptions');
              setExpiryAlertFilter(expiryAlertFilter === '3days' ? 'all' : '3days');
            }}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              expiryAlertFilter === '3days'
                ? 'bg-amber-600/30 border-amber-400 shadow-md ring-2 ring-amber-400/50'
                : 'bg-slate-800/80 hover:bg-slate-800 border-amber-500/40 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">3 Days Left</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-200">{alertStats.count3Days}</span>
              <span className="text-[10px] text-amber-300/80">Urgent</span>
            </div>
          </button>

          {/* 7 Days Alert */}
          <button
            onClick={() => {
              setActiveTab('subscriptions');
              setExpiryAlertFilter(expiryAlertFilter === '7days' ? 'all' : '7days');
            }}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              expiryAlertFilter === '7days'
                ? 'bg-amber-600/30 border-amber-400 shadow-md ring-2 ring-amber-400/50'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">7 Days Left</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{alertStats.count7Days}</span>
              <span className="text-[10px] text-slate-400">Notice</span>
            </div>
          </button>

          {/* 15 Days Alert */}
          <button
            onClick={() => {
              setActiveTab('subscriptions');
              setExpiryAlertFilter(expiryAlertFilter === '15days' ? 'all' : '15days');
            }}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              expiryAlertFilter === '15days'
                ? 'bg-blue-600/30 border-blue-400 shadow-md ring-2 ring-blue-400/50'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">15 Days Left</span>
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{alertStats.count15Days}</span>
              <span className="text-[10px] text-slate-400">Advance</span>
            </div>
          </button>

          {/* 30 Days Alert */}
          <button
            onClick={() => {
              setActiveTab('subscriptions');
              setExpiryAlertFilter(expiryAlertFilter === '30days' ? 'all' : '30days');
            }}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              expiryAlertFilter === '30days'
                ? 'bg-slate-700/60 border-slate-400 shadow-md ring-2 ring-slate-400/50'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">30 Days Left</span>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{alertStats.count30Days}</span>
              <span className="text-[10px] text-slate-400">Scheduled</span>
            </div>
          </button>

          {/* Expired Tracker */}
          <button
            onClick={() => {
              setActiveTab('subscriptions');
              setExpiryAlertFilter(expiryAlertFilter === 'expired' ? 'all' : 'expired');
            }}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              expiryAlertFilter === 'expired'
                ? 'bg-rose-900/40 border-rose-400 shadow-md ring-2 ring-rose-400/50'
                : 'bg-slate-800/80 hover:bg-slate-800 border-rose-900/60 hover:border-rose-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Expired</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-300">{alertStats.countExpired}</span>
              <span className="text-[10px] text-rose-400 font-semibold">Action Needed</span>
            </div>
          </button>
        </div>

        {expiryAlertFilter !== 'all' && (
          <div className="mt-3 flex items-center justify-between text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-amber-300 font-medium">
              Filter Active: Showing only subscriptions matching &quot;{expiryAlertFilter.toUpperCase()}&quot; alert cadence.
            </span>
            <button
              onClick={() => setExpiryAlertFilter('all')}
              className="text-white hover:text-red-400 font-bold underline"
            >
              Clear Filter (Show All)
            </button>
          </div>
        )}
      </div>

      {/* ==========================================
          Navigation Tabs
      ========================================== */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'subscriptions'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bus className="w-4 h-4" />
            Active Subscriptions ({subscriptions.length})
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'schedules'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Renewal Schedules & Forecast
          </button>

          <button
            onClick={() => setActiveTab('packages')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'packages'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Configurable Packages ({packages.length})
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'revenue'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Revenue Analytics & MRR
          </button>
        </nav>
      </div>

      {/* ==========================================
          TAB 1: SUBSCRIPTIONS LIST & FILTERING
      ========================================== */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {/* Search & Quick Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search bus number (e.g. Ba 3 Kha), customer name, SIM number, phone or Sub ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Network Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Network:</span>
                <select
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
                >
                  <option value="all">All Networks</option>
                  <option value="dual network">Dual Network (NTC + Ncell)</option>
                  <option value="ntc">NTC Only</option>
                  <option value="ncell">Ncell Only</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending_renewal">Pending Renewal</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Bus & Sub ID</th>
                    <th className="py-3.5 px-4">Customer & Route</th>
                    <th className="py-3.5 px-4">Package & Network</th>
                    <th className="py-3.5 px-4">Hardware & SIM</th>
                    <th className="py-3.5 px-4">Expiry & Urgency</th>
                    <th className="py-3.5 px-4">Financials</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Bus className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">No subscriptions matched your search or filters.</p>
                        <p className="text-xs text-slate-400 mt-1">Try clearing search terms or expiry alert chips.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.map((sub) => {
                      const daysLeft = getDaysUntil(sub.expiryDate);
                      const isExpired = daysLeft < 0 || sub.status === 'expired';

                      return (
                        <tr
                          key={sub.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            daysLeft <= 1 && !isExpired
                              ? 'bg-red-50/40'
                              : daysLeft <= 3 && !isExpired
                              ? 'bg-amber-50/30'
                              : ''
                          }`}
                        >
                          {/* Bus & Sub ID */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200 shrink-0">
                                <Bus className="w-4 h-4 text-red-600" />
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 block tracking-tight">
                                  {sub.busRegistrationNumber || sub.vehicleNumber}
                                </span>
                                <span className="text-xs font-mono text-slate-500 block">
                                  {sub.subscriptionId || sub.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Customer & Route */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block truncate max-w-xs">
                              {sub.customerName}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Navigation className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-xs">{sub.busRoute || sub.route || 'Highway Route'}</span>
                            </span>
                          </td>

                          {/* Package & Network */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-800 text-xs block">
                                {sub.packageName || sub.planName}
                              </span>
                              {getNetworkBadge(sub.networkType)}
                            </div>
                          </td>

                          {/* Hardware & SIM */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs space-y-0.5">
                              <div className="flex items-center gap-1 text-slate-700 font-mono">
                                <Smartphone className="w-3 h-3 text-slate-400" />
                                <span>{sub.simNumber || 'SIM pending'}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                SN: {sub.routerSerialNumber || sub.routerSerial || 'RUTX11-AUTO'}
                              </div>
                            </div>
                          </td>

                          {/* Expiry & Urgency */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-slate-800">
                                {formatDate(sub.expiryDate)}
                              </div>
                              {getExpiryBadge(sub.expiryDate, sub.status)}
                            </div>
                          </td>

                          {/* Financials & Payment status */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="font-extrabold text-slate-900 block font-mono">
                                {formatNPR(sub.totalAmount || sub.feeNpr)}
                              </span>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full ${
                                    sub.paymentStatus === 'paid'
                                      ? 'bg-emerald-500'
                                      : sub.paymentStatus === 'partial'
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                />
                                <span className="text-[11px] font-semibold uppercase text-slate-600">
                                  {sub.paymentStatus || 'paid'}
                                </span>
                                {sub.paymentMethod && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({sub.paymentMethod})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Reminder generator */}
                              <button
                                onClick={() => handleOpenReminder(sub)}
                                title="Generate SMS / WhatsApp Renewal Reminder"
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Send className="w-4 h-4" />
                              </button>

                              {/* Upgrade Package */}
                              {canManageSubscriptions && (
                                <button
                                  onClick={() => handleOpenUpgradeModal(sub)}
                                  title="Upgrade or Change Package"
                                  className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <ArrowUpRight className="w-4 h-4" />
                                </button>
                              )}

                              {/* Renew Button */}
                              {canManageSubscriptions && (
                                <button
                                  onClick={() => handleOpenRenewalModal(sub)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors"
                                >
                                  <RotateCw className="w-3 h-3" />
                                  Renew
                                </button>
                              )}

                              {/* View 360 Details */}
                              <button
                                onClick={() => handleOpenDetails(sub)}
                                title="View Complete Subscription Dossier"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
              <div>
                Showing <span className="font-bold text-slate-800">{filteredSubscriptions.length}</span> of{' '}
                <span className="font-bold text-slate-800">{subscriptions.length}</span> fleet subscriptions.
              </div>
              <div className="flex items-center gap-4">
                <span>Active Fleets: <strong className="text-slate-800">{alertStats.countActive}</strong></span>
                <span>Expired: <strong className="text-rose-600">{alertStats.countExpired}</strong></span>
                <span>Pending Collections: <strong className="text-amber-700">{formatNPR(alertStats.pendingCollectionsNpr)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: RENEWAL SCHEDULES & FORECAST
      ========================================== */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Renewal Dispatch & Cash Flow Forecast</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target upcoming fleet renewals grouped by operational schedule.
              </p>
            </div>

            {/* Period Switcher */}
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
              <button
                onClick={() => setSchedulePeriod('daily')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  schedulePeriod === 'daily'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today & Tomorrow (Daily)
              </button>
              <button
                onClick={() => setSchedulePeriod('weekly')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  schedulePeriod === 'weekly'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Next 7 Days (Weekly)
              </button>
              <button
                onClick={() => setSchedulePeriod('monthly')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  schedulePeriod === 'monthly'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Next 30 Days (Monthly)
              </button>
            </div>
          </div>

          {/* Schedule Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Vehicles Requiring Renewal</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{scheduleSubscriptions.length} Buses</div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                During {schedulePeriod === 'daily' ? 'next 48 hours' : schedulePeriod === 'weekly' ? 'next 7 days' : 'next 30 days'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Projected Renewal Revenue</span>
              <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                {formatNPR(
                  scheduleSubscriptions.reduce((acc, sub) => acc + (sub.totalAmount || sub.feeNpr || 0), 0)
                )}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Estimated cash intake upon extension</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">High-Risk Buses (≤ 3 Days)</span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {scheduleSubscriptions.filter((s) => getDaysUntil(s.expiryDate) <= 3).length} Buses
              </div>
              <span className="text-[11px] text-rose-500 mt-0.5 block font-semibold">
                Dispatch WhatsApp reminder today
              </span>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Days Left</th>
                  <th className="py-3 px-4">Bus & Customer</th>
                  <th className="py-3 px-4">Current Package</th>
                  <th className="py-3 px-4">Expected Fee</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {scheduleSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No subscriptions scheduled for renewal in this time horizon.
                    </td>
                  </tr>
                ) : (
                  scheduleSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{formatDate(sub.expiryDate)}</td>
                      <td className="py-3 px-4">{getExpiryBadge(sub.expiryDate, sub.status)}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{sub.busRegistrationNumber || sub.vehicleNumber}</div>
                        <div className="text-xs text-slate-500">{sub.customerName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-slate-800">{sub.packageName || sub.planName}</div>
                        <div className="text-[11px] text-slate-400">{sub.networkType || 'Dual Network'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {formatNPR(sub.totalAmount || sub.feeNpr)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenReminder(sub)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Send Alert
                          </button>
                          <button
                            onClick={() => handleOpenRenewalModal(sub)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors"
                          >
                            <RotateCw className="w-3 h-3" />
                            Renew
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: CONFIGURABLE PACKAGES (CEO & TEAM)
      ========================================== */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">Configurable Internet Packages</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define single-network (NTC, Ncell) and dual-network failover packages, duration, and selling price.
              </p>
            </div>

            {canManagePackages && (
              <button
                onClick={handleOpenCreatePackage}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New Package
              </button>
            )}
          </div>

          {/* Package Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                  pkg.status === 'active'
                    ? 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    : 'border-slate-200 bg-slate-50/60 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {getNetworkBadge(pkg.networkType)}
                      <h4 className="text-base font-bold text-slate-900 mt-2">{pkg.packageName}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pkg.description}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        pkg.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {pkg.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-bold text-slate-800">{pkg.durationLabel || `${pkg.durationMonths} Mo`}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Speed:</span>
                      <span className="font-bold text-slate-800">{pkg.speed}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Data Allowance:</span>
                      <span className="font-bold text-slate-800">{pkg.dataAllowance}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Supported Devices:</span>
                      <span className="font-bold text-slate-800">{pkg.supportedDevices} Passengers</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Selling Price</span>
                    <span className="text-xl font-black text-red-600 font-mono">
                      {formatNPR(pkg.sellingPriceNpr)}
                    </span>
                  </div>

                  {canManagePackages && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTogglePackageStatus(pkg)}
                        className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100"
                        title={pkg.status === 'active' ? 'Deactivate Package' : 'Activate Package'}
                      >
                        {pkg.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleOpenEditPackage(pkg)}
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Edit Package"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: REVENUE ANALYTICS & MRR
      ========================================== */}
      {activeTab === 'revenue' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Monthly Recurring Revenue (MRR)
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
                {formatNPR(alertStats.totalMRR)}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Active recurring billing volume</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active Bus Connections
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2">{alertStats.countActive} Buses</div>
              <span className="text-xs text-slate-400 mt-1 block">Deployments across highway fleets</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Pending Uncollected Dues
              </span>
              <div className="text-2xl font-black text-amber-700 mt-2 font-mono">
                {formatNPR(alertStats.pendingCollectionsNpr)}
              </div>
              <span className="text-xs text-amber-600 mt-1 block font-medium">Unpaid subscriptions requiring follow-up</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Expired At-Risk Volume
              </span>
              <div className="text-2xl font-black text-rose-600 mt-2 font-mono">
                {formatNPR(
                  subscriptions
                    .filter((s) => s.status === 'expired' || getDaysUntil(s.expiryDate) < 0)
                    .reduce((acc, s) => acc + (s.totalAmount || s.feeNpr || 0), 0)
                )}
              </div>
              <span className="text-xs text-rose-500 mt-1 block font-medium">{alertStats.countExpired} expired buses</span>
            </div>
          </div>

          {/* Revenue by Network Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">Revenue Breakdown by Network Carrier</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dual Network */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase">Dual-Network (NTC + Ncell)</span>
                  <Layers className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-black text-purple-900 mt-2 font-mono">
                  {formatNPR(
                    subscriptions
                      .filter((s) => (s.networkType || '').toLowerCase().includes('dual'))
                      .reduce((acc, s) => acc + (s.totalAmount || s.feeNpr || 0), 0)
                  )}
                </div>
                <span className="text-xs text-purple-700 mt-1 block">
                  {subscriptions.filter((s) => (s.networkType || '').toLowerCase().includes('dual')).length} Dual-carrier buses
                </span>
              </div>

              {/* NTC Single */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase">NTC Highway 4G</span>
                  <Smartphone className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-black text-blue-900 mt-2 font-mono">
                  {formatNPR(
                    subscriptions
                      .filter((s) => (s.networkType || '').toUpperCase() === 'NTC')
                      .reduce((acc, s) => acc + (s.totalAmount || s.feeNpr || 0), 0)
                  )}
                </div>
                <span className="text-xs text-blue-700 mt-1 block">
                  {subscriptions.filter((s) => (s.networkType || '').toUpperCase() === 'NTC').length} Single NTC buses
                </span>
              </div>

              {/* Ncell Single */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 uppercase">Ncell Highway Fastrack</span>
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-black text-indigo-900 mt-2 font-mono">
                  {formatNPR(
                    subscriptions
                      .filter((s) => (s.networkType || '').toUpperCase() === 'NCELL')
                      .reduce((acc, s) => acc + (s.totalAmount || s.feeNpr || 0), 0)
                  )}
                </div>
                <span className="text-xs text-indigo-700 mt-1 block">
                  {subscriptions.filter((s) => (s.networkType || '').toUpperCase() === 'NCELL').length} Single Ncell buses
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 1: NEW SUBSCRIPTION ACTIVATION
      ========================================================= */}
      <Modal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        title="New Subscription Activation"
        subtitle="Activate internet connectivity, GPS and CCTV telematics for a bus"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveActivation} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer & Bus Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={activationForm.customerId}
                onChange={(e) => handleCustomerSelectChange(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value="">Select customer transport company...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName || c.fullName} ({c.district})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Bus Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={activationForm.busRegistrationNumber}
                onChange={(e) => setActivationForm({ ...activationForm, busRegistrationNumber: e.target.value })}
                placeholder="e.g. Ba 3 Kha 4521"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold focus:outline-hidden focus:ring-2 focus:ring-red-500 uppercase"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Duplicate check enforced automatically.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Bus Route
              </label>
              <input
                type="text"
                value={activationForm.busRoute}
                onChange={(e) => setActivationForm({ ...activationForm, busRoute: e.target.value })}
                placeholder="e.g. Kathmandu - Pokhara Luxury Coach"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Customer Phone
              </label>
              <input
                type="text"
                value={activationForm.customerPhone}
                onChange={(e) => setActivationForm({ ...activationForm, customerPhone: e.target.value })}
                placeholder="+977-98XXXXXXXX"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Package Selection & Timelines */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Package & Billing</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subscription Package <span className="text-red-500">*</span>
                </label>
                <select
                  value={activationForm.packageId}
                  onChange={(e) => handlePackageSelectChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value="">Select package...</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.packageName} ({p.networkType}) - {formatNPR(p.sellingPriceNpr)} / {p.durationLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Activation Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={activationForm.activationDate}
                  onChange={(e) => setActivationForm({ ...activationForm, activationDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Package Fee (NPR)
                </label>
                <input
                  type="number"
                  value={activationForm.subscriptionAmount}
                  onChange={(e) =>
                    setActivationForm({ ...activationForm, subscriptionAmount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Discount (NPR)
                </label>
                <input
                  type="number"
                  value={activationForm.discount}
                  onChange={(e) =>
                    setActivationForm({ ...activationForm, discount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Net Amount Payable
                </label>
                <div className="px-3 py-2 text-sm font-black font-mono bg-slate-100 rounded-lg text-slate-900 border border-slate-200">
                  {formatNPR(Math.max(0, activationForm.subscriptionAmount - activationForm.discount))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Verification (Rule: Never mark as paid without verified record) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Payment Verification
              </h4>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                Transaction Reference Mandatory for Paid Status
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Status
                </label>
                <select
                  value={activationForm.paymentStatus}
                  onChange={(e) =>
                    setActivationForm({
                      ...activationForm,
                      paymentStatus: e.target.value as SubscriptionPaymentStatus,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value="paid">Paid (Verified)</option>
                  <option value="unpaid">Unpaid / Credit</option>
                  <option value="partial">Partial Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={activationForm.paymentMethod}
                  onChange={(e) =>
                    setActivationForm({
                      ...activationForm,
                      paymentMethod: e.target.value as SubscriptionPaymentMethod,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value="eSewa">eSewa Wallet</option>
                  <option value="Khalti">Khalti Wallet</option>
                  <option value="ConnectIPS">ConnectIPS</option>
                  <option value="Bank Transfer">Bank Transfer / Deposit</option>
                  <option value="Cash">Cash Receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transaction Ref / Voucher ID {activationForm.paymentStatus === 'paid' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={activationForm.paymentReference}
                  onChange={(e) =>
                    setActivationForm({ ...activationForm, paymentReference: e.target.value })
                  }
                  placeholder="e.g. ESEWA-894102 / Bank Txn"
                  required={activationForm.paymentStatus === 'paid'}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Hardware & Connectivity Bindings */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Hardware & SIM Card Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SIM Phone Number(s)
                </label>
                <input
                  type="text"
                  value={activationForm.simNumber}
                  onChange={(e) => setActivationForm({ ...activationForm, simNumber: e.target.value })}
                  placeholder="e.g. 9841XXXXXX / 9801XXXXXX"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SIM Operator Mode
                </label>
                <select
                  value={activationForm.simOperator}
                  onChange={(e) =>
                    setActivationForm({
                      ...activationForm,
                      simOperator: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value="Dual SIM">Dual SIM (NTC + Ncell Auto-Failover)</option>
                  <option value="NTC">Single SIM - Nepal Telecom (NTC)</option>
                  <option value="Ncell">Single SIM - Ncell Axiata</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Router Serial Number
                </label>
                <input
                  type="text"
                  value={activationForm.routerSerialNumber}
                  onChange={(e) =>
                    setActivationForm({ ...activationForm, routerSerialNumber: e.target.value })
                  }
                  placeholder="e.g. RUTX11-892301"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsActivationModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-all"
            >
              Activate & Issue Finance Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          MODAL 2: SUBSCRIPTION RENEWAL
      ========================================================= */}
      <Modal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        title="Renew Bus Subscription"
        subtitle={
          selectedSub
            ? `Extending connectivity for Bus: ${selectedSub.busRegistrationNumber || selectedSub.vehicleNumber}`
            : ''
        }
        maxWidth="xl"
      >
        <form onSubmit={handleSaveRenewal} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {selectedSub && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">{selectedSub.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Package:</span>
                <span className="font-bold text-slate-800">{selectedSub.packageName || selectedSub.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Expiry:</span>
                <span className="font-bold text-red-600">{formatDate(selectedSub.expiryDate)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Renewal Duration (Months)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => handleRenewalMonthsChange(m)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    renewalForm.monthsToAdd === m
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {m === 1 ? '1 Month' : m === 3 ? '3 Mo (Quarter)' : m === 6 ? '6 Mo (Half)' : '1 Year'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Extended Expiry Date
              </label>
              <input
                type="date"
                value={renewalForm.newExpiryDate}
                onChange={(e) => setRenewalForm({ ...renewalForm, newExpiryDate: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold text-slate-900 bg-emerald-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Renewal Total Fee (NPR)
              </label>
              <input
                type="number"
                value={renewalForm.totalAmount}
                onChange={(e) => setRenewalForm({ ...renewalForm, totalAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          {/* Payment Verification */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={renewalForm.paymentMethod}
                onChange={(e) =>
                  setRenewalForm({
                    ...renewalForm,
                    paymentMethod: e.target.value as SubscriptionPaymentMethod,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="eSewa">eSewa Wallet</option>
                <option value="Khalti">Khalti</option>
                <option value="ConnectIPS">ConnectIPS</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash Receipt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Reference / Voucher ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={renewalForm.paymentReference}
                onChange={(e) => setRenewalForm({ ...renewalForm, paymentReference: e.target.value })}
                required
                placeholder="e.g. ESEWA-REF-992102"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRenewalModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md"
            >
              Confirm Renewal & Extend Service
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          MODAL 3: UPGRADE OR CHANGE PACKAGE
      ========================================================= */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade or Change Package"
        subtitle={
          selectedSub
            ? `Upgrade network plan for Bus: ${selectedSub.busRegistrationNumber || selectedSub.vehicleNumber}`
            : ''
        }
        maxWidth="xl"
      >
        <form onSubmit={handleSaveUpgrade} className="p-6 space-y-4">
          {selectedSub && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Plan:</span>
                <span className="font-bold text-slate-800">{selectedSub.packageName || selectedSub.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Base Fee:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatNPR(selectedSub.subscriptionAmount || selectedSub.feeNpr)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select New Target Package <span className="text-red-500">*</span>
            </label>
            <select
              value={upgradeForm.newPackageId}
              onChange={(e) => handleUpgradeTargetChange(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.packageName} ({p.networkType}) - {formatNPR(p.sellingPriceNpr)} / {p.durationLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Net Price Difference (NPR)
              </label>
              <input
                type="number"
                value={upgradeForm.priceDifference}
                onChange={(e) => setUpgradeForm({ ...upgradeForm, priceDifference: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Reference (if applicable)
              </label>
              <input
                type="text"
                value={upgradeForm.paymentReference}
                onChange={(e) => setUpgradeForm({ ...upgradeForm, paymentReference: e.target.value })}
                placeholder="e.g. UPG-ESEWA-001"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
            <strong>Operational Note:</strong> Upgrading between Single-SIM and Dual-Network will dispatch a technical notification to verify router dual-slot SIM configuration on the next workshop visit.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md"
            >
              Apply Package Upgrade
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          MODAL 4: CONFIGURE PACKAGE (CEO ONLY)
      ========================================================= */}
      <Modal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        title={selectedPackage ? 'Edit Subscription Package' : 'Create New Subscription Package'}
        subtitle="Manage Netcare single & dual-network pricing and data specifications"
        maxWidth="2xl"
      >
        <form onSubmit={handleSavePackage} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Package Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={packageForm.packageName}
                onChange={(e) => setPackageForm({ ...packageForm, packageName: e.target.value })}
                placeholder="e.g. Dual-Network Highway Ultra"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Network Type
              </label>
              <select
                value={packageForm.networkType}
                onChange={(e) =>
                  setPackageForm({
                    ...packageForm,
                    networkType: e.target.value as NetworkType,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Dual Network">Dual Network (NTC + Ncell Failover)</option>
                <option value="NTC">Single SIM - Nepal Telecom (NTC)</option>
                <option value="Ncell">Single SIM - Ncell Axiata</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Selling Price (NPR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={packageForm.sellingPriceNpr}
                onChange={(e) => setPackageForm({ ...packageForm, sellingPriceNpr: Number(e.target.value) })}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Duration (Months)
              </label>
              <select
                value={packageForm.durationMonths}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  const lbl = m === 1 ? 'Monthly (1 Mo)' : m === 3 ? 'Quarterly (3 Mo)' : m === 6 ? 'Semi-Annual (6 Mo)' : 'Annual (12 Mo)';
                  setPackageForm({ ...packageForm, durationMonths: m, durationLabel: lbl });
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value={1}>1 Month (Monthly)</option>
                <option value={3}>3 Months (Quarterly)</option>
                <option value={6}>6 Months (Semi-Annual)</option>
                <option value={12}>12 Months (Annual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Data Allowance
              </label>
              <input
                type="text"
                value={packageForm.dataAllowance}
                onChange={(e) => setPackageForm({ ...packageForm, dataAllowance: e.target.value })}
                placeholder="e.g. 300 GB Combined FUP"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Max Speed
              </label>
              <input
                type="text"
                value={packageForm.speed}
                onChange={(e) => setPackageForm({ ...packageForm, speed: e.target.value })}
                placeholder="e.g. 50 Mbps Dual-Carrier"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supported Devices
              </label>
              <input
                type="number"
                value={packageForm.supportedDevices}
                onChange={(e) => setPackageForm({ ...packageForm, supportedDevices: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description & Specifications
              </label>
              <textarea
                value={packageForm.description}
                onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsPackageModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md"
            >
              Save Package
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          MODAL 5: 360° SUBSCRIPTION DOSSIER
      ========================================================= */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Subscription Record & Hardware Dossier"
        subtitle={
          selectedSub
            ? `${selectedSub.busRegistrationNumber || selectedSub.vehicleNumber} • ${selectedSub.customerName}`
            : ''
        }
        maxWidth="2xl"
      >
        {selectedSub && (
          <div className="p-6 space-y-5 text-sm">
            {/* Top Quick Status */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 uppercase font-bold">Subscription ID</span>
                <div className="text-lg font-black text-slate-900 font-mono">
                  {selectedSub.subscriptionId || selectedSub.id}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Status</span>
                {getExpiryBadge(selectedSub.expiryDate, selectedSub.status)}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Customer Name:</span>
                <div className="font-bold text-slate-900">{selectedSub.customerName}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Contact Phone:</span>
                <div className="font-bold text-slate-900">{selectedSub.customerPhone || '-'}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Bus Registration:</span>
                <div className="font-extrabold text-red-600 font-mono">
                  {selectedSub.busRegistrationNumber || selectedSub.vehicleNumber}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Route:</span>
                <div className="font-medium text-slate-800">{selectedSub.busRoute || selectedSub.route || '-'}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Package:</span>
                <div className="font-bold text-slate-900">{selectedSub.packageName || selectedSub.planName}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Network Type:</span>
                <div>{getNetworkBadge(selectedSub.networkType)}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Activation Date:</span>
                <div className="font-medium text-slate-800">{formatDate(selectedSub.activationDate || selectedSub.startDate)}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Expiry Date:</span>
                <div className="font-bold text-slate-900">{formatDate(selectedSub.expiryDate)}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Renewal Counter:</span>
                <div className="font-bold text-slate-900">{selectedSub.renewalCount || 0} times renewed</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Total Subscription Fee:</span>
                <div className="font-black text-slate-900 font-mono">
                  {formatNPR(selectedSub.totalAmount || selectedSub.feeNpr)}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Payment Status & Method:</span>
                <div className="font-semibold text-slate-800">
                  <span className="uppercase">{selectedSub.paymentStatus}</span> via {selectedSub.paymentMethod || 'eSewa'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Payment Reference:</span>
                <div className="font-mono text-xs font-bold text-slate-800">
                  {selectedSub.paymentReference || 'Unverified'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">SIM Details:</span>
                <div className="font-mono text-xs text-slate-800">
                  {selectedSub.simNumber || '-'} ({selectedSub.simOperator || 'Dual SIM'})
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Router Serial Number:</span>
                <div className="font-mono text-xs text-slate-800">
                  {selectedSub.routerSerialNumber || selectedSub.routerSerial || '-'}
                </div>
              </div>
            </div>

            {selectedSub.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block mb-1">Operational Audit Notes:</span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{selectedSub.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          MODAL 6: RENEWAL REMINDER DISPATCH (SMS & WHATSAPP)
      ========================================================= */}
      <Modal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        title="Send Renewal Reminder"
        subtitle={
          selectedSub
            ? `Prepare bilingual SMS / WhatsApp notice for Bus: ${
                selectedSub.busRegistrationNumber || selectedSub.vehicleNumber
              }`
            : ''
        }
        maxWidth="lg"
      >
        {selectedSub && (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap border border-slate-700 select-all">
              {getReminderMessage(selectedSub)}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Customer Phone: <strong>{selectedSub.customerPhone || 'Not provided'}</strong></span>
              <span>Expires in: <strong>{getDaysUntil(selectedSub.expiryDate)} Days</strong></span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCopyReminder}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
              >
                {copiedReminder ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    Copy Text
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open WhatsApp Web
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
