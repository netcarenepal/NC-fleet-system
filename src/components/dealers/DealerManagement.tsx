import React, { useState, useMemo } from 'react';
import {
  Handshake,
  Plus,
  Search,
  FileSpreadsheet,
  FileText,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Bus,
  TrendingUp,
  CreditCard,
  Edit2,
  Trash2,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Award,
  Sliders,
  Download,
  ArrowUpRight,
  Eye,
  Truck,
  Wallet,
  Users,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  Dealer,
  Customer,
  Subscription,
  SubscriptionPackage,
  InventoryItem,
  StockMovement,
  DealerStockRequest,
  DealerRenewalRequest,
  DealerCommissionRecord,
  isCEO,
  isManagerOrHigher,
} from '../../types/erp';
import { formatNPR, formatDate, getStatusBadge } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  logAuditEvent,
} from '../../services/dbService';
import { exportToExcel, exportTableToPDF } from '../../utils/exportUtils';

interface DealerManagementProps {
  dealers: Dealer[];
  customers?: Customer[];
  subscriptions?: Subscription[];
  packages?: SubscriptionPackage[];
  inventory?: InventoryItem[];
  stockMovements?: StockMovement[];
  dealerStockRequests?: DealerStockRequest[];
  dealerRenewalRequests?: DealerRenewalRequest[];
  dealerCommissions?: DealerCommissionRecord[];
  onAddCustomer?: (customer: Customer) => void;
  onAddSubscription?: (subscription: Subscription) => void;
  onAddStockMovement?: (movement: StockMovement) => void;
  onAddStockRequest?: (request: DealerStockRequest) => void;
  onUpdateStockRequest?: (id: string, updates: Partial<DealerStockRequest>) => void;
  onAddRenewalRequest?: (request: DealerRenewalRequest) => void;
  onUpdateRenewalRequest?: (id: string, updates: Partial<DealerRenewalRequest>) => void;
  onAddCommission?: (commission: DealerCommissionRecord) => void;
  onUpdateDealer?: (id: string, updates: Partial<Dealer>) => void;
}

export const DealerManagement: React.FC<DealerManagementProps> = ({
  dealers = [],
  customers = [],
  subscriptions = [],
  packages = [],
  inventory = [],
  stockMovements = [],
  dealerStockRequests = [],
  dealerRenewalRequests = [],
  dealerCommissions = [],
  onAddCustomer,
  onAddSubscription,
  onAddStockMovement,
  onAddStockRequest,
  onUpdateStockRequest,
  onAddRenewalRequest,
  onUpdateRenewalRequest,
  onAddCommission,
  onUpdateDealer,
}) => {
  const { activeRole, userProfile } = useAuth();

  // Determine if viewing as dedicated dealer
  const isDealerRole = activeRole === 'DEALER';
  const effectiveDealerId = isDealerRole
    ? userProfile?.assignedDealerId || 'dlr-002'
    : null;

  // Selected dealer for CEO/Manager detailed portal drill-down
  const [selectedDealerId, setSelectedDealerId] = useState<string>(
    effectiveDealerId || dealers[1]?.id || 'dlr-002'
  );

  // Active view mode for CEO/Manager: 'network_overview' or 'dealer_portal'
  const [viewMode, setViewMode] = useState<'network_overview' | 'dealer_portal'>(
    isDealerRole ? 'dealer_portal' : 'network_overview'
  );

  // Sub-tab within Dealer Portal: 'customers' | 'subscriptions' | 'renewals' | 'stock' | 'commissions' | 'reports'
  const [portalTab, setPortalTab] = useState<
    'customers' | 'subscriptions' | 'renewals' | 'stock' | 'commissions' | 'reports'
  >('customers');

  // Search and Filter states for Network Overview
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modals state
  const [isDealerModalOpen, setIsDealerModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutDealer, setPayoutDealer] = useState<Dealer | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);

  // Portal Modals
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddSubscriptionModalOpen, setIsAddSubscriptionModalOpen] = useState(false);
  const [isStockRequestModalOpen, setIsStockRequestModalOpen] = useState(false);
  const [isRenewalRequestModalOpen, setIsRenewalRequestModalOpen] = useState(false);

  // Dealer Form State (CEO Features)
  const [dealerFormData, setDealerFormData] = useState({
    dealerId: '',
    dealerName: '',
    businessName: '',
    contactPerson: '',
    phone: '+977-',
    email: '',
    district: 'Kaski',
    province: 'Gandaki Province',
    territory: 'Gandaki Province (Pokhara, Damauli, Baglung, Syangja)',
    address: '',
    panNumber: '',
    commissionRatePercent: 10,
    hardwareCommissionRate: 10,
    renewalCommissionRate: 15,
    status: 'active' as Dealer['status'],
    bankName: 'Global IME Bank Ltd.',
    accountName: '',
    accountNumber: '',
    branch: 'Pokhara',
    terms: 'Exclusive regional partner agreement for bus passenger WiFi and CCTV installations.',
  });

  // Current Active Dealer Object for Portal
  const activePortalDealer = useMemo(() => {
    const targetId = isDealerRole ? effectiveDealerId : selectedDealerId;
    return (
      dealers.find((d) => d.id === targetId || d.dealerId === targetId) ||
      dealers[0] || {
        id: 'dlr-002',
        dealerId: 'DLR-PKR-002',
        dealerName: 'Anil Gurung',
        businessName: 'Gandaki Telematics & Tech Pvt. Ltd.',
        contactPerson: 'Anil Gurung',
        phone: '+977-9856012984',
        email: 'gandaki.telematics@gmail.com',
        district: 'Kaski',
        province: 'Gandaki Province',
        territory: 'Gandaki Province (Pokhara)',
        address: 'Prithvi Chowk, Pokhara',
        commissionRatePercent: 10,
        hardwareCommissionRate: 10,
        renewalCommissionRate: 15,
        totalSalesNpr: 840000,
        walletBalanceNpr: 68000,
        activeBusCount: 62,
        status: 'active',
        createdAt: '2024-05-15T00:00:00Z',
      }
    );
  }, [dealers, isDealerRole, effectiveDealerId, selectedDealerId]);

  // Security isolation: Dealer's own customers only
  const dealerCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.dealerId === activePortalDealer.id ||
        c.assignedDealerId === activePortalDealer.id ||
        c.dealerName?.toLowerCase().includes(activePortalDealer.dealerName.toLowerCase()) ||
        c.assignedDealerName?.toLowerCase().includes(activePortalDealer.dealerName.toLowerCase())
    );
  }, [customers, activePortalDealer]);

  // Dealer's own subscriptions
  const dealerCustomerIds = useMemo(
    () => new Set(dealerCustomers.map((c) => c.id || c.customerId)),
    [dealerCustomers]
  );

  const dealerSubscriptions = useMemo(() => {
    return subscriptions.filter(
      (s) =>
        dealerCustomerIds.has(s.customerId) ||
        s.customerName?.toLowerCase().includes(activePortalDealer.dealerName.toLowerCase())
    );
  }, [subscriptions, dealerCustomerIds, activePortalDealer]);

  // Dealer's allocated stock & consignment inventory
  const dealerAllocatedStock = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.allocatedToId === activePortalDealer.id ||
        i.location?.toLowerCase().includes(activePortalDealer.territory.toLowerCase()) ||
        i.location?.toLowerCase().includes('pokhara') ||
        i.location?.toLowerCase().includes('butwal')
    );
  }, [inventory, activePortalDealer]);

  // Dealer's stock requests
  const filteredStockRequests = useMemo(() => {
    if (isDealerRole) {
      return dealerStockRequests.filter((r) => r.dealerId === activePortalDealer.id);
    }
    return dealerStockRequests;
  }, [dealerStockRequests, isDealerRole, activePortalDealer]);

  // Dealer's renewal requests
  const filteredRenewalRequests = useMemo(() => {
    if (isDealerRole) {
      return dealerRenewalRequests.filter((r) => r.dealerId === activePortalDealer.id);
    }
    return dealerRenewalRequests;
  }, [dealerRenewalRequests, isDealerRole, activePortalDealer]);

  // Dealer's commission ledger
  const filteredCommissions = useMemo(() => {
    if (isDealerRole) {
      return dealerCommissions.filter((c) => c.dealerId === activePortalDealer.id);
    }
    return dealerCommissions.filter((c) => c.dealerId === activePortalDealer.id);
  }, [dealerCommissions, isDealerRole, activePortalDealer]);

  // Filtered Dealers for CEO/Manager Network List
  const filteredDealers = useMemo(() => {
    return dealers.filter((d) => {
      const matchesSearch =
        d.dealerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.businessName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.territory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.district || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProvince =
        selectedProvince === 'All' || d.province === selectedProvince;

      const matchesStatus =
        selectedStatus === 'All' || d.status === selectedStatus;

      return matchesSearch && matchesProvince && matchesStatus;
    });
  }, [dealers, searchTerm, selectedProvince, selectedStatus]);

  // Regional Network KPIs
  const networkKpis = useMemo(() => {
    const totalSales = dealers.reduce((acc, d) => acc + (d.totalSalesNpr || 0), 0);
    const totalWallet = dealers.reduce((acc, d) => acc + (d.walletBalanceNpr || 0), 0);
    const totalBuses = dealers.reduce((acc, d) => acc + (d.activeBusCount || 0), 0);
    const activeCount = dealers.filter((d) => d.status === 'active').length;
    return { totalSales, totalWallet, totalBuses, activeCount };
  }, [dealers]);

  // Open Create Dealer Modal
  const handleOpenCreateDealer = () => {
    setEditingDealer(null);
    setDealerFormData({
      dealerId: `DLR-${Date.now().toString().slice(-4)}`,
      dealerName: '',
      businessName: '',
      contactPerson: '',
      phone: '+977-',
      email: '',
      district: 'Kaski',
      province: 'Gandaki Province',
      territory: 'Gandaki Province (Pokhara, Damauli, Baglung, Syangja)',
      address: '',
      panNumber: '',
      commissionRatePercent: 10,
      hardwareCommissionRate: 10,
      renewalCommissionRate: 15,
      status: 'active',
      bankName: 'Global IME Bank Ltd.',
      accountName: '',
      accountNumber: '',
      branch: 'Pokhara',
      terms: 'Exclusive regional partner agreement for bus passenger WiFi and CCTV installations.',
    });
    setIsDealerModalOpen(true);
  };

  // Open Edit Dealer Modal
  const handleOpenEditDealer = (dealer: Dealer) => {
    setEditingDealer(dealer);
    setDealerFormData({
      dealerId: dealer.dealerId || dealer.id,
      dealerName: dealer.dealerName,
      businessName: dealer.businessName || dealer.dealerName,
      contactPerson: dealer.contactPerson,
      phone: dealer.phone,
      email: dealer.email,
      district: dealer.district || 'Kaski',
      province: dealer.province || 'Gandaki Province',
      territory: dealer.territory,
      address: dealer.address,
      panNumber: dealer.panNumber || '',
      commissionRatePercent: dealer.commissionRatePercent,
      hardwareCommissionRate: dealer.hardwareCommissionRate || dealer.commissionRatePercent,
      renewalCommissionRate: dealer.renewalCommissionRate || 15,
      status: dealer.status,
      bankName: dealer.bankAccountDetails?.bankName || 'Nabil Bank Ltd.',
      accountName: dealer.bankAccountDetails?.accountName || dealer.dealerName,
      accountNumber: dealer.bankAccountDetails?.accountNumber || '',
      branch: dealer.bankAccountDetails?.branch || 'Head Office',
      terms: dealer.commissionAgreement?.terms || 'Standard partner terms and conditions.',
    });
    setIsDealerModalOpen(true);
  };

  // Handle Save / Create Dealer
  const handleSaveDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerFormData.dealerName || !dealerFormData.phone) {
      alert('Please fill in required proprietor name and contact number.');
      return;
    }

    const payload: Partial<Dealer> = {
      dealerName: dealerFormData.dealerName,
      businessName: dealerFormData.businessName || dealerFormData.dealerName,
      contactPerson: dealerFormData.contactPerson || dealerFormData.dealerName,
      contactNumber: dealerFormData.phone,
      phone: dealerFormData.phone,
      email: dealerFormData.email,
      district: dealerFormData.district,
      province: dealerFormData.province,
      territory: dealerFormData.territory,
      address: dealerFormData.address,
      panNumber: dealerFormData.panNumber,
      commissionRatePercent: Number(dealerFormData.commissionRatePercent),
      hardwareCommissionRate: Number(dealerFormData.hardwareCommissionRate),
      renewalCommissionRate: Number(dealerFormData.renewalCommissionRate),
      status: dealerFormData.status,
      bankAccountDetails: {
        bankName: dealerFormData.bankName,
        accountName: dealerFormData.accountName || dealerFormData.dealerName,
        accountNumber: dealerFormData.accountNumber,
        branch: dealerFormData.branch,
      },
      commissionAgreement: {
        agreementNumber: `AGR-${dealerFormData.district.toUpperCase().slice(0, 3)}-2026`,
        hardwareRatePercent: Number(dealerFormData.hardwareCommissionRate),
        renewalRatePercent: Number(dealerFormData.renewalCommissionRate),
        signedDate: new Date().toISOString().split('T')[0],
        validUntil: '2028-12-31',
        terms: dealerFormData.terms,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingDealer) {
        await updateDocument<Dealer>(
          'dealers',
          editingDealer.id,
          payload,
          'Dealer',
          'DEALER_UPDATE',
          { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
        );
        if (onUpdateDealer) onUpdateDealer(editingDealer.id, payload);
      } else {
        const newId = `dlr-${Date.now().toString().slice(-5)}`;
        const newRecord: Dealer = {
          id: newId,
          dealerId: dealerFormData.dealerId || `DLR-${newId.toUpperCase()}`,
          totalSalesNpr: 0,
          walletBalanceNpr: 0,
          totalCommissionsPaidNpr: 0,
          outstandingBalanceNpr: 0,
          activeBusCount: 0,
          createdAt: new Date().toISOString(),
          ...payload,
        } as Dealer;

        await createDocument<Dealer>(
          'dealers',
          newRecord,
          'Dealer',
          'DEALER_CREATE',
          { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
        );
      }
      setIsDealerModalOpen(false);
    } catch (err) {
      console.error(err);
      setIsDealerModalOpen(false);
    }
  };

  // Open Payout Modal
  const handleOpenPayout = (dealer: Dealer) => {
    setPayoutDealer(dealer);
    setPayoutAmount(dealer.walletBalanceNpr);
    setIsPayoutModalOpen(true);
  };

  // Confirm Commission Payout
  const handleConfirmPayout = async () => {
    if (!payoutDealer || payoutAmount <= 0) return;
    try {
      const remainingBalance = Math.max(0, payoutDealer.walletBalanceNpr - payoutAmount);
      const updatedTotalPaid = (payoutDealer.totalCommissionsPaidNpr || 0) + payoutAmount;

      await updateDocument<Dealer>(
        'dealers',
        payoutDealer.id,
        {
          walletBalanceNpr: remainingBalance,
          totalCommissionsPaidNpr: updatedTotalPaid,
          updatedAt: new Date().toISOString(),
        },
        'Dealer',
        'DEALER_COMMISSION_PAYOUT',
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
      );

      // Record disbursement in commissions ledger
      const commissionRecord: DealerCommissionRecord = {
        id: `COMM-${Date.now().toString().slice(-6)}`,
        dealerId: payoutDealer.id,
        dealerName: payoutDealer.dealerName,
        type: 'payout_disbursement',
        referenceId: `PAYOUT-${Date.now().toString().slice(-5)}`,
        saleAmountNpr: payoutAmount,
        commissionRatePercent: payoutDealer.commissionRatePercent,
        commissionAmountNpr: -payoutAmount,
        status: 'paid',
        date: new Date().toISOString(),
        notes: `Direct bank transfer to ${payoutDealer.bankAccountDetails?.bankName || 'Partner Bank'}. Account: ${payoutDealer.bankAccountDetails?.accountNumber || 'N/A'}.`,
      };

      await createDocument<DealerCommissionRecord>(
        'dealerCommissions',
        commissionRecord,
        'Dealer',
        'DEALER_COMMISSION_DISBURSEMENT',
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
      );

      if (onAddCommission) onAddCommission(commissionRecord);
      if (onUpdateDealer) {
        onUpdateDealer(payoutDealer.id, {
          walletBalanceNpr: remainingBalance,
          totalCommissionsPaidNpr: updatedTotalPaid,
        });
      }

      setIsPayoutModalOpen(false);
      alert(`Disbursement of ${formatNPR(payoutAmount)} processed for ${payoutDealer.dealerName}.`);
    } catch (err) {
      console.error(err);
      setIsPayoutModalOpen(false);
    }
  };

  // Toggle Dealer Status (CEO Feature)
  const handleToggleStatus = async (dealer: Dealer) => {
    if (!isCEO(activeRole)) {
      alert('Only the CEO has permission to activate or suspend regional partner accounts.');
      return;
    }
    const newStatus = dealer.status === 'active' ? 'suspended' : 'active';
    const confirmMsg = `Are you sure you want to change partner "${dealer.dealerName}" status to ${newStatus.toUpperCase()}?`;
    if (!confirm(confirmMsg)) return;

    try {
      await updateDocument<Dealer>(
        'dealers',
        dealer.id,
        { status: newStatus, updatedAt: new Date().toISOString() },
        'Dealer',
        'DEALER_STATUS_TOGGLE',
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
      );
      if (onUpdateDealer) onUpdateDealer(dealer.id, { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  // CEO Approve Stock Request
  const handleApproveStockRequest = async (request: DealerStockRequest) => {
    if (!isManagerOrHigher(activeRole)) {
      alert('Only Executive Management can approve stock allocations.');
      return;
    }

    try {
      const movementId = `mov-${Date.now().toString().slice(-6)}`;
      const movement: StockMovement = {
        id: movementId,
        movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
        movementType: 'dealer_allocation',
        itemId: request.itemId,
        itemName: request.itemName,
        sku: request.sku,
        category: request.category,
        quantity: request.requestedQuantity,
        previousStock: 20,
        newStock: Math.max(0, 20 - request.requestedQuantity),
        unitCostNpr: 18000,
        totalCostNpr: 18000 * request.requestedQuantity,
        fromLocation: 'Kathmandu Central Warehouse, Bay A-1',
        toLocation: `${request.dealerName} Partner Depot (${request.territory || 'Regional Hub'})`,
        allocatedToId: request.dealerId,
        allocatedToName: request.dealerName,
        allocatedToType: 'dealer',
        reason: `Approved replenishment request ${request.id}: ${request.reason}`,
        authorizedBy: userProfile?.fullName || 'CEO (Narayan Prasad Acharya)',
        actorId: userProfile?.userId || 'usr-ceo-01',
        actorName: userProfile?.fullName || 'Narayan Prasad Acharya',
        actorRole: activeRole,
        timestamp: new Date().toISOString(),
      };

      await createDocument<StockMovement>(
        'stockMovements',
        movement,
        'Inventory',
        'DEALER_STOCK_DISPATCH',
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
      );

      await updateDocument<DealerStockRequest>(
        'dealerStockRequests',
        request.id,
        {
          status: 'approved',
          reviewedBy: userProfile?.fullName || 'CEO',
          reviewedAt: new Date().toISOString(),
          adminNotes: `Approved and dispatched from central warehouse via shipment record ${movementId}.`,
          stockMovementId: movementId,
        },
        'Dealer',
        'STOCK_REQUEST_APPROVE',
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
      );

      if (onAddStockMovement) onAddStockMovement(movement);
      if (onUpdateStockRequest) {
        onUpdateStockRequest(request.id, {
          status: 'approved',
          reviewedBy: userProfile?.fullName || 'CEO',
          reviewedAt: new Date().toISOString(),
          stockMovementId: movementId,
        });
      }

      alert(`Stock request approved. Consignment dispatched to ${request.dealerName}.`);
    } catch (err) {
      console.error(err);
    }
  };

  // CEO Approve Renewal Request
  const handleApproveRenewalRequest = async (request: DealerRenewalRequest) => {
    if (!isManagerOrHigher(activeRole)) return;

    try {
      await updateDocument<DealerRenewalRequest>(
        'dealerRenewalRequests',
        request.id,
        {
          status: 'approved',
          reviewedBy: userProfile?.fullName || 'CEO',
          reviewedAt: new Date().toISOString(),
        },
        'Subscription',
        'DEALER_RENEWAL_APPROVE',
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
      );

      // Accrue commission to dealer
      const commRecord: DealerCommissionRecord = {
        id: `COMM-${Date.now().toString().slice(-6)}`,
        dealerId: request.dealerId,
        dealerName: request.dealerName,
        type: 'subscription_renewal',
        referenceId: request.id,
        customerName: request.customerName,
        busNumber: request.busNumber,
        saleAmountNpr: request.finalAmountNpr,
        commissionRatePercent: 15,
        commissionAmountNpr: request.commissionEarnedNpr,
        status: 'accrued',
        date: new Date().toISOString(),
        notes: `Renewal commission approved for Bus ${request.busNumber} (${request.packageName}).`,
      };

      await createDocument<DealerCommissionRecord>(
        'dealerCommissions',
        commRecord,
        'Dealer',
        'DEALER_COMMISSION_ACCRUAL',
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
      );

      // Update dealer wallet balance
      const targetDealer = dealers.find((d) => d.id === request.dealerId);
      if (targetDealer) {
        const updatedWallet = targetDealer.walletBalanceNpr + request.commissionEarnedNpr;
        const updatedSales = targetDealer.totalSalesNpr + request.finalAmountNpr;
        await updateDocument<Dealer>(
          'dealers',
          targetDealer.id,
          {
            walletBalanceNpr: updatedWallet,
            totalSalesNpr: updatedSales,
          },
          'Dealer',
          'DEALER_WALLET_CREDIT',
          { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
        );
        if (onUpdateDealer) {
          onUpdateDealer(targetDealer.id, {
            walletBalanceNpr: updatedWallet,
            totalSalesNpr: updatedSales,
          });
        }
      }

      if (onAddCommission) onAddCommission(commRecord);
      if (onUpdateRenewalRequest) {
        onUpdateRenewalRequest(request.id, {
          status: 'approved',
          reviewedBy: userProfile?.fullName || 'CEO',
          reviewedAt: new Date().toISOString(),
        });
      }

      alert(`Renewal approved and commission of ${formatNPR(request.commissionEarnedNpr)} credited to ${request.dealerName}'s wallet.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Export Network Overview
  const handleExportNetworkExcel = () => {
    const data = filteredDealers.map((d) => ({
      'Dealer ID': d.dealerId || d.id,
      'Proprietor Name': d.dealerName,
      'Business Name': d.businessName || d.dealerName,
      'Contact Person': d.contactPerson,
      Phone: d.phone,
      District: d.district || 'N/A',
      Province: d.province || 'N/A',
      Territory: d.territory,
      'Hardware Commission %': `${d.hardwareCommissionRate || d.commissionRatePercent}%`,
      'Renewal Commission %': `${d.renewalCommissionRate || 15}%`,
      'Active Buses': d.activeBusCount,
      'Total Sales (NPR)': d.totalSalesNpr,
      'Wallet Balance (NPR)': d.walletBalanceNpr,
      'Commissions Paid (NPR)': d.totalCommissionsPaidNpr || 0,
      Status: d.status.toUpperCase(),
    }));
    exportToExcel(data, 'Netcare_Regional_Dealers_Network', 'Dealers');
  };

  // Export Dealer Portal Customers
  const handleExportDealerCustomers = () => {
    const data = dealerCustomers.map((c) => ({
      'Customer ID': c.customerId || c.id,
      'Company Name': c.companyName,
      'Contact Person': c.fullName,
      Phone: c.phone,
      Route: c.busRoute,
      'Bus Registration': c.busRegistrationNumber,
      'Fleet Size': c.fleetSize || 1,
      Services: Array.isArray(c.services) ? c.services.join(', ') : c.services,
      Status: c.status.toUpperCase(),
    }));
    exportToExcel(
      data,
      `${activePortalDealer.dealerName.replace(/\s+/g, '_')}_Customers`,
      'My_Customers'
    );
  };

  // Export Dealer Commission Ledger
  const handleExportDealerCommissions = () => {
    const headers = ['Date', 'Type', 'Reference', 'Customer / Bus', 'Sale Amount', 'Rate', 'Commission', 'Status'];
    const rows = filteredCommissions.map((c) => [
      formatDate(c.date),
      c.type.replace('_', ' ').toUpperCase(),
      c.referenceId,
      c.busNumber ? `${c.customerName} (${c.busNumber})` : c.customerName || 'N/A',
      formatNPR(c.saleAmountNpr),
      `${c.commissionRatePercent}%`,
      formatNPR(c.commissionAmountNpr),
      c.status.toUpperCase(),
    ]);
    exportTableToPDF(
      `${activePortalDealer.businessName || activePortalDealer.dealerName} - Commission Statement`,
      headers,
      rows,
      `Commission_Statement_${activePortalDealer.id}`,
      `Proprietor: ${activePortalDealer.dealerName} • Territory: ${activePortalDealer.territory} • Balance: ${formatNPR(activePortalDealer.walletBalanceNpr)}`
    );
  };

  return (
    <div className="space-y-6">
      {/* View Switcher for CEO / Operations Manager */}
      {!isDealerRole && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Display Perspective:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setViewMode('network_overview')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'network_overview'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                HQ Regional Network ({dealers.length} Partners)
              </button>
              <button
                onClick={() => setViewMode('dealer_portal')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'dealer_portal'
                    ? 'bg-red-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dealer Partner Portal Preview
              </button>
            </div>
          </div>

          {viewMode === 'dealer_portal' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Viewing as Partner:</span>
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
              >
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dealerName} • {d.territory}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 1: CEO & HQ EXECUTIVE DEALER NETWORK OVERVIEW */}
      {/* ======================================================== */}
      {viewMode === 'network_overview' && !isDealerRole && (
        <>
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-red-50 text-red-600">
                  <Handshake className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Regional Dealer & Franchise Partner Management
                  </h2>
                  <p className="text-xs text-slate-500">
                    Nepal-wide territory mapping, commission agreements, and consignment stock control
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExportNetworkExcel}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Network</span>
              </button>

              {isCEO(activeRole) && (
                <button
                  onClick={handleOpenCreateDealer}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Onboard New Partner</span>
                </button>
              )}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Active Partners</span>
                <Handshake className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {networkKpis.activeCount} <span className="text-xs font-normal text-slate-400">/ {dealers.length}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Pokhara, Butwal, Chitwan & East</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Fleet Buses Managed</span>
                <Bus className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {networkKpis.totalBuses} <span className="text-xs font-normal text-slate-400">Buses</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Equipped with Netcare WiFi & GPS</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Regional Sales Volume</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {formatNPR(networkKpis.totalSales)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Hardware + Subscriptions Total</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Accrued Commissions</span>
                <Wallet className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-700">
                {formatNPR(networkKpis.totalWallet)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Pending partner wallet payouts</p>
            </div>
          </div>

          {/* Pending Stock & Renewal Approvals Banner for CEO */}
          {(filteredStockRequests.some((r) => r.status === 'pending') ||
            filteredRenewalRequests.some((r) => r.status === 'pending')) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-amber-900">
                    Action Required: Pending Partner Requests
                  </h4>
                  <p className="text-[11px] text-amber-700">
                    {filteredStockRequests.filter((r) => r.status === 'pending').length} stock replenishment requests and{' '}
                    {filteredRenewalRequests.filter((r) => r.status === 'pending').length} subscription renewal submissions require executive authorization.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setViewMode('dealer_portal');
                  setPortalTab('stock');
                }}
                className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0"
              >
                Review Requests & Approvals
              </button>
            </div>
          )}

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search partner, proprietor, district, or territory..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium"
              >
                <option value="All">All Provinces</option>
                <option value="Bagmati Province">Bagmati Province</option>
                <option value="Gandaki Province">Gandaki Province</option>
                <option value="Lumbini Province">Lumbini Province</option>
                <option value="Koshi Province">Koshi Province</option>
                <option value="Madhesh Province">Madhesh Province</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Dealers Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDealers.map((dealer) => {
              const badge = getStatusBadge(dealer.status);
              return (
                <div
                  key={dealer.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedDealerId(dealer.id);
                            setViewMode('dealer_portal');
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Open Partner Portal"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        {isCEO(activeRole) && (
                          <button
                            onClick={() => handleOpenEditDealer(dealer)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Partner Agreement"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {dealer.businessName || dealer.dealerName}
                    </h3>
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      Proprietor: {dealer.dealerName}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-red-600 font-semibold mt-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{dealer.territory}</span>
                    </div>

                    {/* Partner Details */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">District / Province:</span>
                        <span className="font-semibold text-slate-800">
                          {dealer.district || 'Kaski'}, {dealer.province || 'Gandaki'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Phone Contact:</span>
                        <span className="font-mono text-slate-800">{dealer.phone}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Agreement Rates:</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                          HW: {dealer.hardwareCommissionRate || dealer.commissionRatePercent}% • Renewal: {dealer.renewalCommissionRate || 15}%
                        </span>
                      </div>
                    </div>

                    {/* Performance Box */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Active Buses</div>
                        <div className="text-base font-black text-slate-900 flex items-center gap-1 mt-0.5">
                          <Bus className="w-4 h-4 text-blue-600" />
                          <span>{dealer.activeBusCount}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Sales Volume</div>
                        <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                          {formatNPR(dealer.totalSalesNpr)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Wallet & Payout Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Wallet Balance</div>
                      <div className="text-sm font-black text-emerald-700">
                        {formatNPR(dealer.walletBalanceNpr)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCEO(activeRole) && (
                        <button
                          onClick={() => handleToggleStatus(dealer)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                            dealer.status === 'active'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {dealer.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}

                      {dealer.walletBalanceNpr > 0 && isManagerOrHigher(activeRole) && (
                        <button
                          onClick={() => handleOpenPayout(dealer)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Disburse</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* MODE 2: DEDICATED DEALER REGIONAL PARTNER PORTAL */}
      {/* ======================================================== */}
      {(viewMode === 'dealer_portal' || isDealerRole) && (
        <div className="space-y-6">
          {/* Dealer Portal Header Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                  <span>Verified Regional Partner Portal • {activePortalDealer.dealerId || activePortalDealer.id}</span>
                </div>
                <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white">
                  {activePortalDealer.businessName || activePortalDealer.dealerName}
                </h2>
                <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    {activePortalDealer.territory} ({activePortalDealer.district}, {activePortalDealer.province})
                  </span>
                  <span>•</span>
                  <span>Proprietor: {activePortalDealer.dealerName}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-300">{activePortalDealer.phone}</span>
                </p>
              </div>

              {/* Portal Quick Financial Highlights */}
              <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                <div>
                  <div className="text-[10px] text-slate-300 font-bold uppercase">Wallet Balance</div>
                  <div className="text-lg font-black text-emerald-400">
                    {formatNPR(activePortalDealer.walletBalanceNpr)}
                  </div>
                </div>
                <div className="h-8 w-px bg-white/20 mx-1" />
                <div>
                  <div className="text-[10px] text-slate-300 font-bold uppercase">Commission Rate</div>
                  <div className="text-sm font-bold text-white">
                    HW: {activePortalDealer.hardwareCommissionRate || activePortalDealer.commissionRatePercent}% | Ren: {activePortalDealer.renewalCommissionRate || 15}%
                  </div>
                </div>
                <div className="h-8 w-px bg-white/20 mx-1" />
                <div>
                  <div className="text-[10px] text-slate-300 font-bold uppercase">My Active Buses</div>
                  <div className="text-lg font-black text-white flex items-center gap-1">
                    <Bus className="w-4 h-4 text-red-400" />
                    <span>{dealerSubscriptions.length || activePortalDealer.activeBusCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Portal Sub-navigation Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs text-xs font-bold text-slate-600">
            <button
              onClick={() => setPortalTab('customers')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                portalTab === 'customers'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>My Customers ({dealerCustomers.length})</span>
            </button>

            <button
              onClick={() => setPortalTab('subscriptions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                portalTab === 'subscriptions'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Bus className="w-4 h-4" />
              <span>Subscriptions & Buses ({dealerSubscriptions.length})</span>
            </button>

            <button
              onClick={() => setPortalTab('renewals')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                portalTab === 'renewals'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Renewal Submissions ({filteredRenewalRequests.length})</span>
            </button>

            <button
              onClick={() => setPortalTab('stock')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                portalTab === 'stock'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Allocated Stock & Requests ({filteredStockRequests.length})</span>
            </button>

            <button
              onClick={() => setPortalTab('commissions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                portalTab === 'commissions'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Commissions & Ledger</span>
            </button>

            <button
              onClick={() => setPortalTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                portalTab === 'reports'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Authorized Reports</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: MY CUSTOMERS (BUS OPERATORS) */}
          {/* ======================================================== */}
          {portalTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    My Registered Bus Operators & Transport Clients
                  </h3>
                  <p className="text-xs text-slate-500">
                    Client operators exclusively assigned to {activePortalDealer.businessName || activePortalDealer.dealerName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportDealerCustomers}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export</span>
                  </button>

                  <button
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register New Customer</span>
                  </button>
                </div>
              </div>

              {dealerCustomers.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No customers registered yet</p>
                  <p className="mt-1">Click "Register New Customer" to onboard your first transport fleet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dealerCustomers.map((c) => {
                    const badge = getStatusBadge(c.status);
                    return (
                      <div
                        key={c.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              {c.customerId || c.id}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-sm">{c.companyName}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Contact: {c.fullName || c.contactPerson}</p>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Phone:</span>
                              <span className="font-mono text-slate-800">{c.phone}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Route:</span>
                              <span className="truncate max-w-[170px] text-slate-800 font-medium">
                                {c.busRoute || 'Valley Express'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Active Bus:</span>
                              <span className="font-mono font-bold text-red-600">
                                {c.busRegistrationNumber || 'Fleet Vehicle'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">Fleet: {c.fleetSize || 1} Buses</span>
                          <span className="text-[11px] font-bold text-emerald-700">Protected Partner Record</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MY SUBSCRIPTIONS & BUS SERVICES */}
          {/* ======================================================== */}
          {portalTab === 'subscriptions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Fleet Bus Subscriptions & Telematics Services
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live single and dual-network bus WiFi, GPS trackers, and CCTV package contracts
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddSubscriptionModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register New Subscription</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Bus Registration</th>
                        <th className="px-4 py-3">Operator Client</th>
                        <th className="px-4 py-3">Service Package</th>
                        <th className="px-4 py-3">Network</th>
                        <th className="px-4 py-3">Billing Fee</th>
                        <th className="px-4 py-3">Expiry Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {dealerSubscriptions.map((sub) => {
                        const badge = getStatusBadge(sub.status);
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              {sub.vehicleNumber || sub.busRegistrationNumber || 'N/A'}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">{sub.customerName}</td>
                            <td className="px-4 py-3">{sub.planName || sub.packageName}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                                {sub.networkType || 'Dual Network'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-black text-slate-900">
                              {formatNPR(sub.feeNpr || sub.totalAmount || 0)}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{formatDate(sub.expiryDate)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setIsRenewalRequestModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold transition-colors"
                              >
                                Submit Renewal
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: RENEWAL SUBMISSIONS */}
          {/* ======================================================== */}
          {portalTab === 'renewals' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Subscription Renewal Requests & Approvals
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track renewal requests submitted for customer buses and verified commission earnings
                  </p>
                </div>

                <button
                  onClick={() => setIsRenewalRequestModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Renewal Request</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRenewalRequests.map((ren) => {
                  const badge = getStatusBadge(ren.status);
                  return (
                    <div
                      key={ren.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400">{ren.id}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4 text-red-600" />
                          <h4 className="font-bold text-slate-900 text-sm">{ren.busNumber}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{ren.customerName}</p>

                        <div className="mt-3 p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Package:</span>
                            <span className="font-bold text-slate-800 truncate max-w-[160px]">
                              {ren.packageName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Duration:</span>
                            <span className="font-semibold text-slate-800">{ren.durationMonths} Months</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Renewal Fee:</span>
                            <span className="font-black text-slate-900">{formatNPR(ren.finalAmountNpr)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                            <span className="text-emerald-700 font-bold">Dealer Commission:</span>
                            <span className="font-black text-emerald-700">
                              +{formatNPR(ren.commissionEarnedNpr)}
                            </span>
                          </div>
                        </div>

                        {ren.paymentReference && (
                          <div className="mt-2 text-[10px] text-slate-500 font-mono">
                            Ref: {ren.paymentReference} • {ren.paymentMethod}
                          </div>
                        )}
                      </div>

                      {/* Approval Action for CEO/Manager */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">{formatDate(ren.submittedAt)}</span>

                        {isManagerOrHigher(activeRole) && ren.status === 'pending' && (
                          <button
                            onClick={() => handleApproveRenewalRequest(ren)}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Credit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: ALLOCATED STOCK & REQUESTS */}
          {/* ======================================================== */}
          {portalTab === 'stock' && (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Consignment Hardware & Territory Stock
                  </h3>
                  <p className="text-xs text-slate-500">
                    Routers, antennas, CCTV cameras, and M2M SIMs in partner inventory
                  </p>
                </div>

                <button
                  onClick={() => setIsStockRequestModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>Request Additional Stock</span>
                </button>
              </div>

              {/* Stock Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Currently Allocated Consignment Stock</span>
                  <span className="text-[11px] text-slate-500">
                    {dealerAllocatedStock.length} Product SKUs Available
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Item Name</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">SKU</th>
                        <th className="px-4 py-2.5">In Hand Stock</th>
                        <th className="px-4 py-2.5">Selling Price</th>
                        <th className="px-4 py-2.5">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {dealerAllocatedStock.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{item.itemName}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-500">{item.sku}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">
                            {item.currentStock} Units
                          </td>
                          <td className="px-4 py-2.5 font-black text-slate-900">
                            {formatNPR(item.sellingNpr || item.sellingPriceNpr)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{item.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Replenishment Requests */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Stock Replenishment Requests to Netcare HQ</span>
                  <span className="text-[11px] text-slate-500">Permanent Movement Audit Log</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {filteredStockRequests.map((req) => {
                    const badge = getStatusBadge(req.status);
                    return (
                      <div
                        key={req.id}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-400">{req.id}</span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                            >
                              {badge.label}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold">
                              {req.urgency} Urgency
                            </span>
                          </div>
                          <div className="font-extrabold text-slate-900 text-sm">
                            {req.requestedQuantity}x {req.itemName}
                          </div>
                          <p className="text-slate-500 text-xs">Reason: {req.reason}</p>
                          <p className="text-[11px] text-slate-400">
                            Delivery to: {req.shippingAddress} • Requested on {formatDate(req.requestedAt)}
                          </p>
                        </div>

                        {/* CEO / Manager Approve Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isManagerOrHigher(activeRole) && req.status === 'pending' && (
                            <button
                              onClick={() => handleApproveStockRequest(req)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                            >
                              <Truck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Approve & Dispatch</span>
                            </button>
                          )}
                          {req.status === 'approved' && (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Dispatched
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: COMMISSIONS & FINANCIAL LEDGER */}
          {/* ======================================================== */}
          {portalTab === 'commissions' && (
            <div className="space-y-6">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-400 font-bold uppercase">Available Wallet Balance</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {formatNPR(activePortalDealer.walletBalanceNpr)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Ready for direct bank remittance</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-400 font-bold uppercase">Total Commissions Paid</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {formatNPR(activePortalDealer.totalCommissionsPaidNpr || 54000)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Lifetime disbursed remittances</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-400 font-bold uppercase">Registered Sales Volume</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {formatNPR(activePortalDealer.totalSalesNpr)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Total revenue generated by partner</p>
                </div>
              </div>

              {/* Bank Account Verification Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-slate-700" />
                    <span>Registered Settlement Bank Account</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">
                    {activePortalDealer.bankAccountDetails?.bankName || 'Global IME Bank Ltd.'} • A/C:{' '}
                    <span className="font-mono font-bold">
                      {activePortalDealer.bankAccountDetails?.accountNumber || '0400101008921'}
                    </span>{' '}
                    • Branch: {activePortalDealer.bankAccountDetails?.branch || 'Prithvi Chowk'}
                  </p>
                </div>

                <button
                  onClick={handleExportDealerCommissions}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold shadow-xs transition-colors shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  <span>Download Commission PDF</span>
                </button>
              </div>

              {/* Chronological Commission Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                  Chronological Transaction Commission Audit Trail
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Transaction Type</th>
                        <th className="px-4 py-2.5">Reference ID</th>
                        <th className="px-4 py-2.5">Customer / Bus</th>
                        <th className="px-4 py-2.5">Sale Amount</th>
                        <th className="px-4 py-2.5">Commission Rate</th>
                        <th className="px-4 py-2.5">Commission (NPR)</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {filteredCommissions.map((comm) => (
                        <tr key={comm.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 text-slate-500">{formatDate(comm.date)}</td>
                          <td className="px-4 py-2.5 font-bold capitalize text-slate-900">
                            {comm.type.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-500">{comm.referenceId}</td>
                          <td className="px-4 py-2.5">
                            {comm.customerName}{' '}
                            {comm.busNumber && (
                              <span className="font-mono text-slate-500">({comm.busNumber})</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">
                            {formatNPR(comm.saleAmountNpr)}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-600">
                            {comm.commissionRatePercent}%
                          </td>
                          <td
                            className={`px-4 py-2.5 font-black ${
                              comm.commissionAmountNpr > 0 ? 'text-emerald-700' : 'text-slate-800'
                            }`}
                          >
                            {comm.commissionAmountNpr > 0 ? '+' : ''}
                            {formatNPR(comm.commissionAmountNpr)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                comm.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {comm.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: AUTHORIZED REPORTS */}
          {/* ======================================================== */}
          {portalTab === 'reports' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 w-fit mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900">Customer Roster Export</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Download complete spreadsheet of bus transport companies registered under this partner account.
                  </p>
                </div>
                <button
                  onClick={handleExportDealerCustomers}
                  className="mt-4 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Customers Excel</span>
                </button>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 w-fit mb-3">
                    <Bus className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900">Active Bus Fleet Roster</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Export list of all verified buses, assigned router models, and subscription expiry timelines.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const data = dealerSubscriptions.map((s) => ({
                      'Bus Number': s.vehicleNumber || s.busRegistrationNumber,
                      Operator: s.customerName,
                      Package: s.planName || s.packageName,
                      'Expiry Date': formatDate(s.expiryDate),
                      Status: s.status.toUpperCase(),
                    }));
                    exportToExcel(data, `${activePortalDealer.id}_Fleet_Buses`, 'Buses');
                  }}
                  className="mt-4 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Bus Fleet Excel</span>
                </button>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-600 w-fit mb-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900">Official Commission Statement</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Generate signed official PDF statement of commissions accrued, paid remittances, and tax withholding.
                  </p>
                </div>
                <button
                  onClick={handleExportDealerCommissions}
                  className="mt-4 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Statement</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ONBOARD / EDIT DEALER PARTNER (CEO ONLY) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDealerModalOpen}
        onClose={() => setIsDealerModalOpen(false)}
        title={editingDealer ? 'Edit Partner Agreement & Territory' : 'Onboard Regional Partner / Dealer'}
        subtitle="Configure partner business registration, assigned territory corridor, and commission rates"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveDealer} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Proprietor Full Name *</label>
              <input
                type="text"
                required
                value={dealerFormData.dealerName}
                onChange={(e) => setDealerFormData({ ...dealerFormData, dealerName: e.target.value })}
                placeholder="e.g. Anil Gurung"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Registered Business Name</label>
              <input
                type="text"
                value={dealerFormData.businessName}
                onChange={(e) => setDealerFormData({ ...dealerFormData, businessName: e.target.value })}
                placeholder="e.g. Gandaki Telematics & Tech Pvt. Ltd."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone *</label>
              <input
                type="text"
                required
                value={dealerFormData.phone}
                onChange={(e) => setDealerFormData({ ...dealerFormData, phone: e.target.value })}
                placeholder="+977-9856012984"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={dealerFormData.email}
                onChange={(e) => setDealerFormData({ ...dealerFormData, email: e.target.value })}
                placeholder="partner@netcarenepal.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">PAN / VAT Number</label>
              <input
                type="text"
                value={dealerFormData.panNumber}
                onChange={(e) => setDealerFormData({ ...dealerFormData, panNumber: e.target.value })}
                placeholder="e.g. 609823419"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">District *</label>
              <input
                type="text"
                required
                value={dealerFormData.district}
                onChange={(e) => setDealerFormData({ ...dealerFormData, district: e.target.value })}
                placeholder="e.g. Kaski, Rupandehi, Chitwan"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Province *</label>
              <select
                value={dealerFormData.province}
                onChange={(e) => setDealerFormData({ ...dealerFormData, province: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20"
              >
                <option value="Bagmati Province">Bagmati Province</option>
                <option value="Gandaki Province">Gandaki Province</option>
                <option value="Lumbini Province">Lumbini Province</option>
                <option value="Koshi Province">Koshi Province</option>
                <option value="Madhesh Province">Madhesh Province</option>
                <option value="Karnali Province">Karnali Province</option>
                <option value="Sudurpashchim Province">Sudurpashchim Province</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Assigned Territory Corridor *</label>
            <input
              type="text"
              required
              value={dealerFormData.territory}
              onChange={(e) => setDealerFormData({ ...dealerFormData, territory: e.target.value })}
              placeholder="e.g. Gandaki Province (Pokhara, Damauli, Baglung, Syangja, Beni Corridor)"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hardware Commission Rate (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={dealerFormData.hardwareCommissionRate}
                onChange={(e) =>
                  setDealerFormData({
                    ...dealerFormData,
                    hardwareCommissionRate: Number(e.target.value),
                    commissionRatePercent: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Renewal Commission Rate (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={dealerFormData.renewalCommissionRate}
                onChange={(e) => setDealerFormData({ ...dealerFormData, renewalCommissionRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 font-bold"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block font-bold text-slate-700 mb-1">Settlement Bank Name & Account Number</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                value={dealerFormData.bankName}
                onChange={(e) => setDealerFormData({ ...dealerFormData, bankName: e.target.value })}
                placeholder="Bank Name e.g. Global IME Bank"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs"
              />
              <input
                type="text"
                value={dealerFormData.accountNumber}
                onChange={(e) => setDealerFormData({ ...dealerFormData, accountNumber: e.target.value })}
                placeholder="Account Number"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDealerModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors"
            >
              {editingDealer ? 'Save Partner Agreement' : 'Authorize Regional Partner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: DISBURSE COMMISSION PAYOUT (CEO / MANAGER) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        title="Disburse Partner Commission Payout"
        subtitle={`Partner: ${payoutDealer?.dealerName} • Territory: ${payoutDealer?.territory}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Disbursement Amount (NPR) *</label>
            <input
              type="number"
              min="100"
              max={payoutDealer?.walletBalanceNpr || 0}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-black text-lg text-slate-900 focus:bg-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Available Wallet Balance: {formatNPR(payoutDealer?.walletBalanceNpr)}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs space-y-1">
            <p className="font-bold text-slate-800">Direct Bank Remittance Target:</p>
            <p>{payoutDealer?.bankAccountDetails?.bankName || 'Partner Bank'}</p>
            <p className="font-mono font-bold text-slate-800">
              A/C: {payoutDealer?.bankAccountDetails?.accountNumber || '0400101008921'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsPayoutModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmPayout}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-xs"
            >
              Confirm Bank Payout
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: DEALER REGISTER NEW CUSTOMER */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        title="Onboard New Bus Transport Company"
        subtitle={`Partner: ${activePortalDealer.businessName || activePortalDealer.dealerName} • Territory: ${activePortalDealer.territory}`}
        maxWidth="lg"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const companyName = (form.elements.namedItem('companyName') as HTMLInputElement).value;
            const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value;
            const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
            const busReg = (form.elements.namedItem('busReg') as HTMLInputElement).value;
            const route = (form.elements.namedItem('route') as HTMLInputElement).value;

            const newCust: Customer = {
              id: `cust-${Date.now().toString().slice(-5)}`,
              customerId: `NC-CUST-${Date.now().toString().slice(-4)}`,
              companyName,
              fullName,
              phone,
              whatsappNumber: phone,
              busRegistrationNumber: busReg,
              busRoute: route,
              busPark: 'Prithvi Chowk Central Bus Park, Pokhara',
              district: activePortalDealer.district || 'Kaski',
              province: activePortalDealer.province || 'Gandaki Province',
              address: activePortalDealer.address || 'Prithvi Chowk, Pokhara',
              registrationDate: new Date().toLocaleDateString('en-GB'),
              dealerId: activePortalDealer.id,
              dealerName: activePortalDealer.businessName || activePortalDealer.dealerName,
              assignedDealerId: activePortalDealer.id,
              assignedDealerName: activePortalDealer.businessName || activePortalDealer.dealerName,
              status: 'active',
              createdAt: new Date().toISOString(),
            };

            try {
              await createDocument<Customer>(
                'customers',
                newCust,
                'Customer',
                'DEALER_CUSTOMER_ONBOARD',
                { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
              );
              if (onAddCustomer) onAddCustomer(newCust);
              setIsAddCustomerModalOpen(false);
              alert(`Customer "${companyName}" successfully registered under your partner account.`);
            } catch (err) {
              console.error(err);
              setIsAddCustomerModalOpen(false);
            }
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-700 mb-1">Bus Company / Operator Name *</label>
            <input
              name="companyName"
              required
              placeholder="e.g. Annapurna Deluxe Express Pvt. Ltd."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Proprietor / Contact Name *</label>
              <input
                name="fullName"
                required
                placeholder="e.g. Ram Bahadur Thapa"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone *</label>
              <input
                name="phone"
                required
                placeholder="+977-9856011223"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Initial Bus Registration *</label>
              <input
                name="busReg"
                required
                placeholder="e.g. Ga 1 Kha 9921"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Highway Route *</label>
              <input
                name="route"
                required
                placeholder="e.g. Pokhara - Damauli - Mugling - Kathmandu"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddCustomerModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors"
            >
              Register Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: DEALER REQUEST ADDITIONAL STOCK */}
      {/* ======================================================== */}
      <Modal
        isOpen={isStockRequestModalOpen}
        onClose={() => setIsStockRequestModalOpen(false)}
        title="Request Consignment Stock from Central Warehouse"
        subtitle={`Destination: ${activePortalDealer.territory} (${activePortalDealer.address || 'Regional Depot'})`}
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const itemId = (form.elements.namedItem('itemId') as HTMLSelectElement).value;
            const qty = Number((form.elements.namedItem('quantity') as HTMLInputElement).value);
            const urgency = (form.elements.namedItem('urgency') as HTMLSelectElement).value as any;
            const reason = (form.elements.namedItem('reason') as HTMLTextAreaElement).value;

            const selectedItem = inventory.find((i) => i.id === itemId);
            const newRequest: DealerStockRequest = {
              id: `DSR-${Date.now().toString().slice(-5)}`,
              dealerId: activePortalDealer.id,
              dealerName: activePortalDealer.dealerName,
              businessName: activePortalDealer.businessName,
              territory: activePortalDealer.territory,
              itemId: itemId || 'inv-001',
              itemName: selectedItem?.itemName || 'Teltonika RUTX11 Dual-SIM Bus Router',
              sku: selectedItem?.sku || 'RUTX11-CAT6-NP',
              category: selectedItem?.category || '4G WiFi Router',
              requestedQuantity: qty,
              urgency: urgency || 'Normal',
              reason,
              shippingAddress: activePortalDealer.address || 'Prithvi Chowk Regional Counter, Pokhara',
              status: 'pending',
              requestedAt: new Date().toISOString(),
            };

            try {
              await createDocument<DealerStockRequest>(
                'dealerStockRequests',
                newRequest,
                'Inventory',
                'DEALER_STOCK_REQUEST',
                { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
              );
              if (onAddStockRequest) onAddStockRequest(newRequest);
              setIsStockRequestModalOpen(false);
              alert('Stock request submitted to Netcare HQ warehouse.');
            } catch (err) {
              console.error(err);
              setIsStockRequestModalOpen(false);
            }
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-700 mb-1">Equipment Item *</label>
            <select
              name="itemId"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
            >
              {inventory.slice(0, 10).map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.itemName} ({inv.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantity Needed *</label>
              <input
                name="quantity"
                type="number"
                min="1"
                max="50"
                defaultValue="5"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Urgency Level *</label>
              <select
                name="urgency"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
              >
                <option value="Normal">Normal Replenishment</option>
                <option value="Urgent">Urgent (Customer Waiting)</option>
                <option value="Critical">Critical (Breakdown Replacement)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Deployment Reason / Notes *</label>
            <textarea
              name="reason"
              required
              rows={2}
              placeholder="e.g. 5 deluxe express buses retrofitting scheduled for weekend at bus park."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsStockRequestModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors"
            >
              Submit Stock Request
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: SUBMIT SUBSCRIPTION RENEWAL REQUEST */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRenewalRequestModalOpen}
        onClose={() => setIsRenewalRequestModalOpen(false)}
        title="Submit Bus Subscription Renewal Request"
        subtitle={`Select customer bus and package period to earn verified commission`}
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const busNumber = (form.elements.namedItem('busNumber') as HTMLInputElement).value;
            const customerName = (form.elements.namedItem('customerName') as HTMLInputElement).value;
            const duration = Number((form.elements.namedItem('duration') as HTMLSelectElement).value);
            const paymentRef = (form.elements.namedItem('paymentRef') as HTMLInputElement).value;
            const paymentMethod = (form.elements.namedItem('paymentMethod') as HTMLSelectElement).value;

            const baseRate = 3200;
            const finalAmount = baseRate * duration;
            const commissionEarned = Math.round(
              finalAmount * ((activePortalDealer.renewalCommissionRate || 15) / 100)
            );

            const newRen: DealerRenewalRequest = {
              id: `DRN-${Date.now().toString().slice(-5)}`,
              dealerId: activePortalDealer.id,
              dealerName: activePortalDealer.dealerName,
              customerId: 'cust-003',
              customerName: customerName || 'Blue Sky Travels & Tours Nepal',
              busNumber: busNumber || 'Ga 1 Kha 8912',
              subscriptionId: 'sub-003',
              packageName: 'Dual-Network Smart Failover Express',
              durationMonths: duration,
              packagePriceNpr: finalAmount,
              discountNpr: 0,
              finalAmountNpr: finalAmount,
              commissionEarnedNpr: commissionEarned,
              paymentMethod,
              paymentReference: paymentRef || 'DEP-CIPS-9921',
              status: 'pending',
              submittedAt: new Date().toISOString(),
            };

            try {
              await createDocument<DealerRenewalRequest>(
                'dealerRenewalRequests',
                newRen,
                'Subscription',
                'DEALER_RENEWAL_SUBMIT',
                { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
              );
              if (onAddRenewalRequest) onAddRenewalRequest(newRen);
              setIsRenewalRequestModalOpen(false);
              alert(`Renewal request submitted for Bus ${busNumber}. Expected commission: ${formatNPR(commissionEarned)}.`);
            } catch (err) {
              console.error(err);
              setIsRenewalRequestModalOpen(false);
            }
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bus Registration *</label>
              <input
                name="busNumber"
                required
                defaultValue="Ga 1 Kha 8912"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Operator Company *</label>
              <input
                name="customerName"
                required
                defaultValue="Blue Sky Travels & Tours Nepal"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Renewal Duration *</label>
              <select
                name="duration"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
              >
                <option value="1">1 Month (Monthly)</option>
                <option value="3">3 Months (Quarterly)</option>
                <option value="6">6 Months (Semi-Annual)</option>
                <option value="12">12 Months (Annual Deluxe)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
              <select
                name="paymentMethod"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
              >
                <option value="ConnectIPS">ConnectIPS</option>
                <option value="eSewa">eSewa Mobile Wallet</option>
                <option value="Khalti">Khalti Digital Wallet</option>
                <option value="Bank Transfer">Bank Deposit / QR</option>
                <option value="Cash">Cash Collected by Dealer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Deposit Slip / Transaction Reference *</label>
            <input
              name="paymentRef"
              required
              placeholder="e.g. TXN-CIPS-9988124 or eSewa Ref ID"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
            <p className="font-bold">Partner Commission Guarantee:</p>
            <p className="text-[11px] mt-0.5">
              Your registered renewal commission ({activePortalDealer.renewalCommissionRate || 15}%) will be automatically accrued to your wallet once approved.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRenewalRequestModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors"
            >
              Submit for Approval
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
