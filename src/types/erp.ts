export type UserRole =
  | 'CEO'
  | 'OPERATIONS_MANAGER'
  | 'OFFICE_STAFF'
  | 'FIELD_TECHNICIAN'
  | 'DEALER';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export const isCEO = (role: string) => role === 'CEO' || role === 'ceo';
export const isManagerOrHigher = (role: string) => isCEO(role) || role === 'OPERATIONS_MANAGER' || role === 'manager';
export const isStaffOrHigher = (role: string) => isManagerOrHigher(role) || role === 'OFFICE_STAFF' || role === 'staff';
export const isTechnician = (role: string) => role === 'FIELD_TECHNICIAN' || role === 'technician';
export const isDealer = (role: string) => role === 'DEALER' || role === 'dealer';

export interface LoginActivityRecord {
  id?: string;
  timestamp: string;
  ipAddress: string;
  userAgent?: string;
  action: 'login' | 'logout';
  status: 'success' | 'failed';
}

export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  assignedDealerId?: string;
  department?: string;
  managerId?: string;
  managerName?: string;
  responsibilities?: string[];
  lastLoginAt?: string;
  lastLoginIp?: string;
  loginCount?: number;
  loginActivity?: LoginActivityRecord[];
  isActive?: boolean;
  avatarUrl?: string;
  territory?: string;
  invitedBy?: string;
  invitedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CustomerStatus = 'active' | 'suspended' | 'prospective' | 'inactive' | 'terminated';

export interface Customer {
  id: string; // Firestore document ID
  customerId: string; // Unique Customer ID, e.g. NC-CUST-1001
  fullName: string; // Customer contact person / proprietor full name
  companyName: string; // Bus company name / transport operator
  phone: string; // Contact number
  whatsappNumber: string; // WhatsApp number
  busRegistrationNumber: string; // Primary bus registration number, e.g. Ba 3 Kha 4521
  fleetVehicles?: string[]; // Optional array of registered bus numbers
  busRoute: string; // Bus route, e.g. Kathmandu - Pokhara Luxury Coach
  busPark: string; // Bus park, e.g. Gongabu New Bus Park
  district: string; // District, e.g. Kathmandu, Kaski, Chitwan
  province: string; // Province, e.g. Bagmati Province, Gandaki Province
  address: string; // Physical or garage address
  status: CustomerStatus; // Customer status
  registrationDate: string; // Registration date (DD/MM/YYYY or ISO)
  assignedStaffId?: string; // Assigned office staff ID
  assignedStaffName?: string; // Assigned office staff name
  assignedDealerId?: string; // Assigned dealer ID
  assignedDealerName?: string; // Assigned dealer name
  remarks?: string; // Operational remarks / notes

  // Compatibility fields
  busName?: string;
  contactNumber?: string;
  contactPerson?: string;
  email?: string;
  panNumber?: string;
  city?: string;
  fleetSize?: number;
  services?: string[];
  dealerId?: string;
  dealerName?: string;
  notes?: string;
  contractStart?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ServiceType = 'wifi' | 'gps' | 'cctv' | 'combo_all';
export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type SubscriptionStatus = 'active' | 'expired' | 'pending_renewal' | 'suspended';
export type NetworkType = 'NTC' | 'Ncell' | 'Dual Network';
export type SubscriptionPaymentStatus = 'paid' | 'unpaid' | 'partial';
export type SubscriptionPaymentMethod = 'eSewa' | 'Khalti' | 'ConnectIPS' | 'Bank Transfer' | 'Cash';

export interface SubscriptionPackage {
  id: string;
  packageName: string;
  networkType: NetworkType;
  durationMonths: number; // 1, 3, 6, 12
  durationLabel: string; // e.g. "Monthly (1 Mo)", "Quarterly (3 Mo)", "Annual (12 Mo)"
  sellingPriceNpr: number;
  dataAllowance: string; // e.g. "Unlimited (FUP 500GB)", "150GB High Speed"
  speed: string; // e.g. "25 Mbps", "50 Mbps Dual-Band"
  supportedDevices: number; // e.g. 40 devices
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  subscriptionId?: string; // Formatted ID e.g. SUB-2026-001
  customerId: string;
  customerName: string;
  customerPhone?: string;
  busRegistrationNumber: string; // e.g. Ba 3 Kha 4521
  vehicleNumber: string; // backwards compatibility alias
  busRoute?: string;
  route?: string; // backwards compatibility alias
  serviceType: ServiceType;
  planName: string;
  billingCycle: BillingCycle;
  
  // Package details
  packageId?: string;
  packageName?: string;
  networkType?: NetworkType;
  durationMonths?: number;
  
  // Financials
  feeNpr: number; // backwards compatibility
  subscriptionAmount: number;
  discount: number;
  totalAmount: number;
  paymentStatus: SubscriptionPaymentStatus;
  paymentMethod?: SubscriptionPaymentMethod;
  paymentReference?: string; // Required for verified payment
  paymentVerified: boolean;
  
  // Hardware & SIM
  simNumber?: string;
  simImsi?: string;
  simOperator?: 'NTC' | 'Ncell' | 'Dual SIM';
  routerSerialNumber?: string;
  routerSerial?: string; // backwards compatibility
  gpsImei?: string;
  
  // Timestamps
  activationDate: string;
  startDate: string; // backwards compatibility
  expiryDate: string;
  autoRenew: boolean;
  status: SubscriptionStatus;
  lastPaymentDate?: string;
  lastRenewalDate?: string;
  renewalCount?: number;
  previousPackageName?: string;
  notes?: string;
  
  // Link to Finance invoice
  invoiceId?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type InventoryCategory =
  | '4G WiFi Router'
  | 'WiFi 6 PCB'
  | 'Router Antenna'
  | 'External Antenna'
  | 'SIM Card'
  | 'CCTV Camera'
  | 'Memory Card'
  | 'DC Converter'
  | 'LM2596'
  | 'Fuse'
  | 'DC Jack'
  | 'Switch'
  | 'RCA Jack'
  | 'LED'
  | 'Resistor'
  | 'Router Enclosure'
  | 'Cables'
  | 'GPS Device'
  | 'Other Spare Parts'
  | 'wifi_router'
  | 'gps_tracker'
  | 'cctv_mdvr'
  | 'dashcam'
  | 'm2m_sim'
  | 'antenna_cable'
  | 'spare_part';

export type InventoryStatus =
  | 'in_stock'
  | 'assigned_vehicle'
  | 'allocated_technician'
  | 'allocated_dealer'
  | 'under_repair'
  | 'faulty'
  | 'damaged'
  | 'decommissioned';

export interface InventoryItem {
  id: string;
  productId?: string; // Unique Product ID e.g. PRD-RTR-101
  itemName: string;
  sku: string;
  category: InventoryCategory;
  brand: string;
  model: string;
  brandModel: string; // backwards compatibility
  serialNumber?: string;
  serialNumbers?: string[]; // Tracked serial numbers for routers & CCTV
  imeiOrImsi?: string;
  simNumbers?: string[]; // Phone numbers for SIM Cards (restricted access)
  imsiNumbers?: string[]; // IMSI telecom identifiers (restricted access)
  simOperator?: 'NTC' | 'Ncell' | 'Dual SIM' | 'Smart Cell';
  costNpr: number; // Purchase price
  purchasePriceNpr?: number;
  sellingNpr: number; // Selling price
  sellingPriceNpr?: number;
  currentStock: number;
  minimumStockLevel: number;
  supplierId?: string;
  supplierName?: string;
  location: string; // Warehouse location e.g. Kathmandu Central Warehouse
  warehouseLocation?: string;
  status: InventoryStatus;
  
  // Allocations & Assignments
  allocatedToId?: string;
  allocatedToName?: string;
  allocatedToRole?: 'FIELD_TECHNICIAN' | 'DEALER';
  allocatedQuantity?: number;
  allocatedDate?: string;
  assignedCustomerId?: string;
  assignedCustomer?: string;
  assignedVehicle?: string;
  installedBy?: string;
  warrantyExpiry?: string;
  
  // Damaged goods tracking
  damageCount?: number;
  damageNotes?: string;
  
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type StockMovementType =
  | 'purchase_entry'
  | 'stock_received'
  | 'stock_issued'
  | 'stock_adjustment'
  | 'stock_transfer'
  | 'dealer_allocation'
  | 'technician_allocation'
  | 'damaged_returned';

export interface StockMovement {
  id: string;
  movementNumber: string; // e.g. MOV-2026-0081
  movementType: StockMovementType;
  itemId: string;
  itemName: string;
  sku: string;
  category: InventoryCategory | string;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCostNpr: number;
  totalCostNpr: number;
  fromLocation: string;
  toLocation: string;
  allocatedToId?: string;
  allocatedToName?: string;
  allocatedToType?: 'dealer' | 'technician' | 'bus_fleet' | 'warehouse';
  serialNumbers?: string[];
  simNumbers?: string[];
  reason: string;
  authorizedBy: string;
  isNegativeStockOverride?: boolean;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
}

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  suppliedCategories: string[];
  taxPanNumber: string;
  paymentTerms: string;
  rating: number; // 1 to 5
  status: 'active' | 'inactive';
  balanceNpr?: number;
  notes?: string;
  createdAt: string;
}

export type FieldJobType =
  | 'New WiFi installation'
  | 'CCTV installation'
  | 'GPS installation'
  | 'Router replacement'
  | 'CCTV maintenance'
  | 'Network troubleshooting'
  | 'SIM replacement'
  | 'memory card installation'
  | 'due payment collection'
  | 'General service';

export type FieldJobPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type FieldJobStatus =
  | 'Pending'
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

// Backwards compatibility aliases
export type WorkOrderType = FieldJobType | 'installation' | 'repair' | 'inspection' | 'device_upgrade';
export type WorkOrderPriority = FieldJobPriority | 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderStatus = FieldJobStatus | 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface MaterialUsedItem {
  id?: string;
  itemId: string;
  itemName: string;
  sku?: string;
  category?: string;
  quantity: number;
  unitCostNpr: number;
  totalCostNpr: number;
  serialNumber?: string;
}

export interface CustomerJobFeedback {
  rating: number; // 1 to 5 stars
  comment?: string;
  signeeName?: string;
  recordedAt?: string;
}

export interface CustomerConfirmation {
  confirmed: boolean;
  signeeName: string;
  signeePhone?: string;
  signatureData?: string; // base64 or drawn signature data
  timestamp: string;
  confirmationMethod: 'digital_signature' | 'sms_otp_verified' | 'driver_conductor_signoff';
}

export interface WorkOrder {
  id: string;
  jobId: string; // e.g. "JOB-2026-081"
  ticketNumber?: string; // Backwards compatible alias for jobId
  title?: string;
  customerId?: string;
  customerName: string;
  busName?: string;
  busNumber: string; // Bus registration number e.g. "Ba 3 Kha 4521"
  vehicleNumber?: string; // Alias for busNumber
  busDepartureTime?: string; // e.g. "14:30" or "03:00 PM" (Critical for bus park timing)
  contactPerson: string;
  contactNumber: string;
  contactPhone?: string; // Alias for contactNumber
  location: string; // e.g. "Gongabu New Bus Park Bay 4" or "Kalanki"
  
  // Job Details
  jobType: FieldJobType;
  serviceType?: 'wifi' | 'gps' | 'cctv' | 'combo_all' | 'sim_replacement' | string;
  type?: WorkOrderType;
  jobDescription: string;
  description?: string; // Alias for jobDescription

  // Technician & Schedule
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedDate?: string;
  scheduledDate: string;
  scheduledTime?: string;
  startedAt?: string;
  completedAt?: string;
  completedDate?: string;
  completionTimeMinutes?: number; // Calculated duration in minutes

  // Priority & Status
  priority: FieldJobPriority | WorkOrderPriority;
  status: FieldJobStatus | WorkOrderStatus;

  // Field Service Execution Records
  beforePhotos?: string[]; // Photographic evidence before service
  afterPhotos?: string[]; // Photographic evidence after service
  deviceSerialNumbers?: string[]; // Captured router, CCTV, GPS, or SIM serial numbers
  materialsUsed?: MaterialUsedItem[]; // Deducted from inventory
  replacedItems?: string[];
  serviceNotes?: string; // Technician diagnostic notes
  resolutionNotes?: string;
  customerFeedback?: CustomerJobFeedback;
  customerConfirmation?: CustomerConfirmation;
  serviceReportSubmitted?: boolean;

  // Complaint escalation linkage
  isComplaintEscalation?: boolean;
  complaintId?: string;
  reportedFault?: string;

  createdAt: string;
  updatedAt?: string;
}

export interface CommissionAgreement {
  agreementNumber?: string;
  hardwareRatePercent: number; // e.g. 10%
  renewalRatePercent: number; // e.g. 15%
  signedDate?: string;
  validUntil?: string;
  terms?: string;
}

export interface DealerBankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
}

export interface Dealer {
  id: string;
  dealerId?: string; // Formatted ID e.g. "DLR-PKR-001"
  dealerName: string; // Proprietor name
  businessName?: string; // Registered business name
  contactPerson: string;
  contactNumber?: string;
  phone: string;
  email: string;
  address: string;
  district?: string;
  province?: string;
  territory: string; // Pokhara, Chitwan, Butwal, Biratnagar, Nepalgunj
  commissionRatePercent: number; // Base rate e.g. 10%
  hardwareCommissionRate?: number;
  renewalCommissionRate?: number;
  commissionAgreement?: CommissionAgreement;
  bankAccountDetails?: DealerBankAccount;
  panNumber?: string;
  totalSalesNpr: number;
  walletBalanceNpr: number;
  totalCommissionsPaidNpr?: number;
  outstandingBalanceNpr?: number;
  activeBusCount: number;
  status: 'active' | 'probation' | 'suspended' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DealerStockRequest {
  id: string; // e.g. "DSR-2026-001"
  dealerId: string;
  dealerName: string;
  businessName?: string;
  territory?: string;
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  requestedQuantity: number;
  urgency: 'Normal' | 'Urgent' | 'Critical';
  reason: string;
  shippingAddress: string;
  status: 'pending' | 'approved' | 'rejected' | 'dispatched' | 'received';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
  stockMovementId?: string;
}

export interface DealerRenewalRequest {
  id: string; // e.g. "DRN-2026-001"
  dealerId: string;
  dealerName: string;
  customerId: string;
  customerName: string;
  busNumber: string;
  subscriptionId: string;
  packageId?: string;
  packageName: string;
  durationMonths: number;
  packagePriceNpr: number;
  discountNpr: number;
  finalAmountNpr: number;
  commissionEarnedNpr: number;
  paymentMethod: string;
  paymentReference?: string;
  receiptNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface DealerCommissionRecord {
  id: string; // e.g. "COMM-2026-001"
  dealerId: string;
  dealerName: string;
  type: 'hardware_sale' | 'new_subscription' | 'subscription_renewal' | 'payout_disbursement';
  referenceId: string;
  customerName?: string;
  busNumber?: string;
  saleAmountNpr: number;
  commissionRatePercent: number;
  commissionAmountNpr: number;
  status: 'accrued' | 'paid' | 'pending';
  date: string;
  notes?: string;
}

export type InvoiceStatus = 'unpaid' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

export type IncomeCategory =
  | 'new_subscriptions'
  | 'subscription_renewals'
  | 'wifi_equipment_sales'
  | 'cctv_sales'
  | 'gps_sales'
  | 'installation_charges'
  | 'other_income';

export type ExpenseCategory =
  | 'internet_sim'
  | 'device_purchases'
  | 'employee_salaries'
  | 'technician_installation'
  | 'transportation'
  | 'office_rent'
  | 'electricity_internet'
  | 'marketing'
  | 'repairs_maintenance'
  | 'other_expenses'
  // Backwards compatibility aliases
  | 'sim_data_packs'
  | 'hardware_import'
  | 'technician_travel'
  | 'office_utilities';

export type FinancePaymentMethod =
  | 'Cash'
  | 'Bank Transfer'
  | 'eSewa'
  | 'Khalti'
  | 'ConnectIPS'
  | 'Cheque'
  | 'Other';

export interface PaymentRecord {
  id: string; // e.g. "PMT-2083-001"
  paymentNumber?: string;
  invoiceId?: string;
  amountNpr: number;
  paymentMethod: FinancePaymentMethod | string;
  paymentReference?: string;
  date: string;
  receivedBy: string;
  notes?: string;
  isReversal?: boolean;
  reversalReason?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. NC-2083-0091
  customerId: string;
  customerName: string;
  customerPan?: string;
  busNumber?: string;
  subscriptionId?: string;
  amountNpr: number; // Subtotal
  vatAmountNpr: number; // 13% Nepal VAT
  totalNpr: number; // Subtotal + VAT
  amountPaidNpr?: number; // Collected amount to date
  balanceDueNpr?: number; // Outstanding remaining balance
  dueDate: string;
  issuedDate: string;
  status: InvoiceStatus;
  paymentMethod?: FinancePaymentMethod | string;
  paymentReference?: string;
  paidDate?: string;
  paymentHistory?: PaymentRecord[];
  lineItems: {
    description: string;
    quantity: number;
    unitPriceNpr: number;
    totalNpr: number;
  }[];
  isReversal?: boolean;
  reversalReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IncomeTransaction {
  id: string; // e.g. "INC-2083-001"
  transactionNumber: string;
  category: IncomeCategory;
  categoryLabel?: string;
  amountNpr: number;
  paymentMethod: FinancePaymentMethod | string;
  paymentReference?: string;
  date: string;
  customerId?: string;
  customerName?: string;
  busNumber?: string;
  subscriptionId?: string;
  invoiceId?: string;
  recordedBy: string;
  notes?: string;
  isReversal?: boolean;
  reversedTransactionId?: string;
  reversalReason?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string; // e.g. "EXP-2083-001"
  title: string;
  category: ExpenseCategory;
  categoryLabel?: string;
  amountNpr: number;
  paidTo: string; // e.g. Nepal Telecom, Ncell Axiata, Vendor
  supplierId?: string;
  supplierName?: string;
  paymentMethod: FinancePaymentMethod | string;
  paymentDate: string;
  approvedBy: string;
  receiptNumber?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'paid';
  isReversal?: boolean;
  reversedExpenseId?: string;
  reversalReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierPayableSummary {
  supplierId: string;
  supplierName: string;
  contactPerson: string;
  phone: string;
  taxPanNumber?: string;
  totalPurchasedNpr: number;
  totalPaidNpr: number;
  outstandingBalanceNpr: number;
  lastPaymentDate?: string;
  status: 'good' | 'overdue' | 'settled';
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  recordId?: string;
  module: 'Customer' | 'Subscription' | 'Inventory' | 'WorkOrder' | 'Dealer' | 'Finance' | 'Auth' | 'System';
  details: string;
  changeDetails?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}

export interface SystemConfig {
  id?: string;
  companyName: string;
  tradeName: string;
  tagline?: string;
  logoUrl?: string;
  panNumber: string;
  vatRatePercent: number;
  taxOfficeLocation?: string;
  headOfficeAddress: string;
  contactEmail: string;
  contactPhone: string;
  supportHotline: string;
  website: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  invoicePrefix: string; // e.g. "NC-2083-"
  nextInvoiceSequence: number; // e.g. 106
  invoiceFormat: string; // "NC-YYYY-####"
  smsGatewayActive: boolean;
  smsSenderId?: string;
  notificationSettings?: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    whatsappAlerts: boolean;
    expiryNoticeDays: number[]; // e.g. [30, 15, 7, 3, 1]
    lowStockNotice: boolean;
  };
  permissionMatrix?: Record<string, Record<string, boolean>>;
  backupSettings?: {
    lastBackupAt?: string;
    lastBackupSize?: string;
    lastBackupChecksum?: string;
    backupSchedule: 'daily' | 'weekly' | 'manual';
    autoCloudSync: boolean;
  };
  gpsApiServer: string;
  simProviderPartners: string[];
  updatedAt?: string;
  updatedBy?: string;
}
