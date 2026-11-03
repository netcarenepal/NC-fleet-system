import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Building2,
  Phone,
  Mail,
  MapPin,
  Bus,
  Edit2,
  Trash2,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Upload,
  AlertTriangle,
  Eye,
  ShieldCheck,
  X,
  RefreshCw,
  MessageSquare,
  Wrench,
  CreditCard,
  Layers,
  ExternalLink,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Compass,
  Radio,
  FileUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Customer,
  CustomerStatus,
  Subscription,
  InventoryItem,
  WorkOrder,
  Invoice,
  Dealer,
  UserProfile,
  isCEO,
  isStaffOrHigher,
} from '../../types/erp';
import { formatDate, formatNPR, getStatusBadge } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { createDocument, updateDocument, deleteDocument } from '../../services/dbService';
import { exportToExcel, exportTableToPDF } from '../../utils/exportUtils';

interface CustomerManagementProps {
  customers: Customer[];
  subscriptions?: Subscription[];
  inventory?: InventoryItem[];
  workOrders?: WorkOrder[];
  invoices?: Invoice[];
  dealers?: Dealer[];
  users?: UserProfile[];
}

const NEPAL_PROVINCES = [
  'Bagmati Province',
  'Gandaki Province',
  'Lumbini Province',
  'Koshi Province',
  'Madhesh Province',
  'Karnali Province',
  'Sudurpashchim Province',
];

const COMMON_DISTRICTS = [
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Kaski',
  'Chitwan',
  'Rupandehi',
  'Baglung',
  'Tanahun',
  'Makwanpur',
  'Parsa',
  'Morang',
  'Jhapa',
  'Banke',
  'Dang',
  'Kavrepalanchok',
  'Dhading',
];

const COMMON_BUS_PARKS = [
  'Gongabu New Bus Park, Kathmandu',
  'Kalanki Highway Transit Stop, Kathmandu',
  'Lagankhel Bus Station, Lalitpur',
  'Old Bus Park, Kathmandu',
  'Tourist Bus Park, Rashtrabank Chowk, Pokhara',
  'Prithvi Chowk Central Terminal, Pokhara',
  'Narayangarh Bus Terminal, Chitwan',
  'Traffic Chowk Central Bus Park, Butwal',
  'Belahiya Transit Point, Bhairahawa',
  'Gandaki Bus Stand, Baglung',
  'Birgunj Central Bus Terminal, Birgunj',
];

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  subscriptions = [],
  inventory = [],
  workOrders = [],
  invoices = [],
  dealers = [],
  users = [],
}) => {
  const { activeRole, userProfile } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [dealerFilter, setDealerFilter] = useState<string>('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // 360° Profile Modal state
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<Customer | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<
    'overview' | 'buses' | 'devices' | 'subscriptions' | 'invoices' | 'service'
  >('overview');

  // Excel Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate Warning Modal state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isOpen: boolean;
    reason: string;
    existingCustomer?: Customer;
  }>({ isOpen: false, reason: '' });

  // Add / Edit Form State
  const [formData, setFormData] = useState<{
    customerId: string;
    fullName: string;
    companyName: string;
    phone: string;
    whatsappNumber: string;
    busRegistrationNumber: string;
    fleetVehicles: string;
    busRoute: string;
    busPark: string;
    district: string;
    province: string;
    address: string;
    status: CustomerStatus;
    registrationDate: string;
    assignedStaffId: string;
    assignedStaffName: string;
    assignedDealerId: string;
    assignedDealerName: string;
    remarks: string;
  }>({
    customerId: '',
    fullName: '',
    companyName: '',
    phone: '+977-',
    whatsappNumber: '+977-',
    busRegistrationNumber: '',
    fleetVehicles: '',
    busRoute: '',
    busPark: 'Gongabu New Bus Park, Kathmandu',
    district: 'Kathmandu',
    province: 'Bagmati Province',
    address: '',
    status: 'active',
    registrationDate: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date()),
    assignedStaffId: '',
    assignedStaffName: '',
    assignedDealerId: '',
    assignedDealerName: '',
    remarks: '',
  });

  // Unique list of routes and districts for dropdown filters
  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.district) set.add(c.district);
      else if (c.city) set.add(c.city);
    });
    return Array.from(set).sort();
  }, [customers]);

  const uniqueRoutes = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.busRoute) set.add(c.busRoute);
    });
    return Array.from(set).sort();
  }, [customers]);

  const uniqueDealerNames = useMemo(() => {
    const set = new Set<string>();
    dealers.forEach((d) => set.add(d.dealerName));
    customers.forEach((c) => {
      if (c.assignedDealerName) set.add(c.assignedDealerName);
      if (c.dealerName) set.add(c.dealerName);
    });
    return Array.from(set).sort();
  }, [dealers, customers]);

  // Office staff list
  const staffUsers = useMemo(() => {
    return users.filter(
      (u) => u.role === 'OFFICE_STAFF' || u.role === 'OPERATIONS_MANAGER' || u.role === 'CEO'
    );
  }, [users]);

  // Search and Filter logic
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const q = searchTerm.toLowerCase().trim();
      const name = (cust.fullName || cust.contactPerson || '').toLowerCase();
      const company = (cust.companyName || '').toLowerCase();
      const phone = (cust.phone || '').toLowerCase();
      const whatsapp = (cust.whatsappNumber || '').toLowerCase();
      const busReg = (cust.busRegistrationNumber || '').toLowerCase();
      const route = (cust.busRoute || '').toLowerCase();
      const custId = (cust.customerId || cust.id || '').toLowerCase();
      const district = (cust.district || cust.city || '').toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        company.includes(q) ||
        phone.includes(q) ||
        whatsapp.includes(q) ||
        busReg.includes(q) ||
        route.includes(q) ||
        custId.includes(q) ||
        district.includes(q);

      const matchesStatus = statusFilter === 'all' || cust.status === statusFilter;
      const matchesDistrict =
        districtFilter === 'all' ||
        cust.district === districtFilter ||
        cust.city === districtFilter;
      const matchesRoute = routeFilter === 'all' || cust.busRoute === routeFilter;
      const matchesDealer =
        dealerFilter === 'all' ||
        cust.assignedDealerName === dealerFilter ||
        cust.dealerName === dealerFilter;

      return matchesSearch && matchesStatus && matchesDistrict && matchesRoute && matchesDealer;
    });
  }, [customers, searchTerm, statusFilter, districtFilter, routeFilter, dealerFilter]);

  // Helper to normalize phone / bus registration for duplicate detection
  const normalizePhone = (p?: string) => (p || '').replace(/[^0-9]/g, '');
  const normalizeBusReg = (r?: string) => (r || '').replace(/\s+/g, '').toUpperCase();

  // Helper to generate Next Customer ID
  const generateNextCustomerId = () => {
    const existingNumbers = customers
      .map((c) => {
        const match = (c.customerId || '').match(/NC-CUST-(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null);

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000;
    return `NC-CUST-${maxNum + 1}`;
  };

  // Open Create Customer Modal
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      customerId: generateNextCustomerId(),
      fullName: '',
      companyName: '',
      phone: '+977-',
      whatsappNumber: '+977-',
      busRegistrationNumber: '',
      fleetVehicles: '',
      busRoute: '',
      busPark: 'Gongabu New Bus Park, Kathmandu',
      district: 'Kathmandu',
      province: 'Bagmati Province',
      address: '',
      status: 'active',
      registrationDate: new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date()),
      assignedStaffId: staffUsers[0]?.userId || '',
      assignedStaffName: staffUsers[0]?.fullName || 'Sunita Tamang',
      assignedDealerId: dealers[0]?.id || 'dlr-001',
      assignedDealerName: dealers[0]?.dealerName || 'Netcare Kathmandu Direct',
      remarks: '',
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      customerId: cust.customerId || cust.id,
      fullName: cust.fullName || cust.contactPerson || '',
      companyName: cust.companyName || '',
      phone: cust.phone || '+977-',
      whatsappNumber: cust.whatsappNumber || cust.phone || '+977-',
      busRegistrationNumber: cust.busRegistrationNumber || '',
      fleetVehicles: (cust.fleetVehicles || []).join(', '),
      busRoute: cust.busRoute || '',
      busPark: cust.busPark || cust.address || 'Gongabu New Bus Park, Kathmandu',
      district: cust.district || cust.city || 'Kathmandu',
      province: cust.province || 'Bagmati Province',
      address: cust.address || '',
      status: cust.status || 'active',
      registrationDate: cust.registrationDate || formatDate(cust.createdAt),
      assignedStaffId: cust.assignedStaffId || '',
      assignedStaffName: cust.assignedStaffName || '',
      assignedDealerId: cust.assignedDealerId || cust.dealerId || '',
      assignedDealerName: cust.assignedDealerName || cust.dealerName || '',
      remarks: cust.remarks || cust.notes || '',
    });
    setIsFormModalOpen(true);
  };

  // Open 360° Profile Modal
  const handleOpenProfileModal = (
    cust: Customer,
    tab: 'overview' | 'buses' | 'devices' | 'subscriptions' | 'invoices' | 'service' = 'overview'
  ) => {
    setSelectedProfileCustomer(cust);
    setProfileActiveTab(tab);
  };

  // Form Submission with Duplicate Prevention Check (Feature 12)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.companyName.trim() ||
      !formData.fullName.trim() ||
      !formData.phone.trim() ||
      !formData.busRegistrationNumber.trim()
    ) {
      alert('Please fill all mandatory fields: Company Name, Full Name, Phone, and Bus Registration.');
      return;
    }

    const normPhone = normalizePhone(formData.phone);
    const normBusReg = normalizeBusReg(formData.busRegistrationNumber);

    // Duplicate Prevention Check
    const duplicatePhoneCustomer = customers.find(
      (c) =>
        c.id !== editingCustomer?.id &&
        c.customerId !== formData.customerId &&
        normalizePhone(c.phone) === normPhone &&
        normPhone.length >= 8
    );

    if (duplicatePhoneCustomer) {
      setDuplicateWarning({
        isOpen: true,
        reason: `A bus operator with contact phone "${formData.phone}" already exists in the system under company "${duplicatePhoneCustomer.companyName}" (${duplicatePhoneCustomer.customerId || duplicatePhoneCustomer.id}).`,
        existingCustomer: duplicatePhoneCustomer,
      });
      return;
    }

    const duplicateBusCustomer = customers.find(
      (c) =>
        c.id !== editingCustomer?.id &&
        c.customerId !== formData.customerId &&
        normalizeBusReg(c.busRegistrationNumber) === normBusReg &&
        normBusReg.length > 3
    );

    if (duplicateBusCustomer) {
      setDuplicateWarning({
        isOpen: true,
        reason: `A bus with registration number "${formData.busRegistrationNumber}" is already registered under "${duplicateBusCustomer.companyName}" (${duplicateBusCustomer.customerId || duplicateBusCustomer.id}). To prevent duplicate fleet tracking entries, please review this record.`,
        existingCustomer: duplicateBusCustomer,
      });
      return;
    }

    // Split fleet vehicles
    const fleetVehiclesList = formData.fleetVehicles
      ? formData.fleetVehicles
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [formData.busRegistrationNumber.trim()];

    try {
      const payload: Partial<Customer> = {
        customerId: formData.customerId,
        fullName: formData.fullName,
        contactPerson: formData.fullName,
        companyName: formData.companyName,
        phone: formData.phone,
        whatsappNumber: formData.whatsappNumber,
        busRegistrationNumber: formData.busRegistrationNumber,
        fleetVehicles: fleetVehiclesList,
        busRoute: formData.busRoute,
        busPark: formData.busPark,
        district: formData.district,
        province: formData.province,
        city: formData.district,
        address: formData.address,
        status: formData.status,
        registrationDate: formData.registrationDate,
        assignedStaffId: formData.assignedStaffId,
        assignedStaffName: formData.assignedStaffName,
        assignedDealerId: formData.assignedDealerId,
        assignedDealerName: formData.assignedDealerName,
        dealerId: formData.assignedDealerId,
        dealerName: formData.assignedDealerName,
        remarks: formData.remarks,
        notes: formData.remarks,
        fleetSize: fleetVehiclesList.length || 1,
      };

      if (editingCustomer) {
        await updateDocument<Customer>(
          'customers',
          editingCustomer.id,
          {
            ...payload,
            updatedAt: new Date().toISOString(),
          },
          'Customer',
          `Updated customer record for ${formData.companyName}`,
          { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
        );
      } else {
        const docId = `cust-${Date.now().toString().slice(-6)}`;
        await createDocument<Customer>(
          'customers',
          {
            id: docId,
            ...payload,
            createdAt: new Date().toISOString(),
          } as Customer,
          'Customer',
          `Created new bus operator record: ${formData.companyName} (${formData.customerId})`,
          { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
        );
      }

      setIsFormModalOpen(false);
    } catch (err) {
      console.error('Customer save error:', err);
      alert('Error updating customer record. Please check permissions.');
    }
  };

  // Delete Customer (CEO Only)
  const handleDelete = async (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to permanently delete "${name}" from Netcare Nepal ERP? This action is audited.`
      )
    ) {
      try {
        await deleteDocument(
          'customers',
          id,
          'Customer',
          `Deleted customer record: ${name} (ID: ${id})`,
          { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
        );
      } catch (err) {
        console.error('Delete customer error:', err);
        alert('Failed to delete customer record.');
      }
    }
  };

  // Export to Excel (Feature 11)
  const handleExportExcel = () => {
    const data = filteredCustomers.map((c) => ({
      'Customer ID': c.customerId || c.id,
      'Bus Operator / Company': c.companyName,
      'Contact Person': c.fullName || c.contactPerson,
      'Phone Number': c.phone,
      'WhatsApp Number': c.whatsappNumber || c.phone,
      'Bus Registration Number': c.busRegistrationNumber || 'N/A',
      'Bus Route': c.busRoute || 'N/A',
      'Bus Park': c.busPark || 'N/A',
      District: c.district || c.city || 'N/A',
      Province: c.province || 'Bagmati Province',
      Address: c.address || 'N/A',
      Status: (c.status || 'ACTIVE').toUpperCase(),
      'Registration Date': c.registrationDate || formatDate(c.createdAt),
      'Assigned Staff': c.assignedStaffName || 'Unassigned',
      'Assigned Dealer': c.assignedDealerName || c.dealerName || 'Direct',
      Remarks: c.remarks || c.notes || '',
    }));
    exportToExcel(data, 'Netcare_Nepal_Customers_Directory', 'Bus Operators');
  };

  // Export to PDF (Feature 11)
  const handleExportPDF = () => {
    const headers = [
      'Customer ID',
      'Operator / Company',
      'Contact & WhatsApp',
      'Bus Reg & Route',
      'Bus Park / District',
      'Dealer',
      'Status',
    ];
    const rows = filteredCustomers.map((c) => [
      c.customerId || c.id,
      c.companyName,
      `${c.fullName || c.contactPerson}\n${c.phone}`,
      `${c.busRegistrationNumber || 'N/A'}\n${c.busRoute || 'N/A'}`,
      `${c.busPark || 'N/A'}\n${c.district || c.city || 'Kathmandu'}`,
      c.assignedDealerName || c.dealerName || 'Direct',
      (c.status || 'ACTIVE').toUpperCase(),
    ]);

    exportTableToPDF(
      'Netcare Nepal - Bus Operators & Fleet Directory',
      headers,
      rows,
      'Netcare_Customers_Directory',
      `Total Displayed Records: ${filteredCustomers.length} Bus Operators | Netcare Nepal Enterprise ERP`
    );
  };

  // Download Sample Excel Template for Import
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'Customer ID': 'NC-CUST-2001',
        'Customer Full Name': 'Ram Chandra Adhikari',
        'Bus Company Name': 'Pokhara Deluxe Yatayat Pvt. Ltd.',
        'Contact Number': '+977-9856012345',
        'WhatsApp Number': '+977-9856012345',
        'Bus Registration Number': 'Ga 2 Kha 4100',
        'Bus Route': 'Pokhara - Kathmandu Tourist AC Coach',
        'Bus Park': 'Tourist Bus Park, Rashtrabank Chowk, Pokhara',
        District: 'Kaski',
        Province: 'Gandaki Province',
        'Customer Address': 'Lakeside, Ward 6, Pokhara',
        Status: 'active',
        'Registration Date': '25/02/2026',
        'Assigned Office Staff': 'Sunita Tamang',
        'Assigned Dealer': 'Gandaki Telematics & Tech (Pokhara)',
        Remarks: 'Dual SIM 4G router installed for passenger WiFi and real-time GPS tracking.',
      },
      {
        'Customer ID': 'NC-CUST-2002',
        'Customer Full Name': 'Hari Prasad Neupane',
        'Bus Company Name': 'Miteri Yatayat Cooperative Ltd.',
        'Contact Number': '+977-9857056789',
        'WhatsApp Number': '+977-9857056789',
        'Bus Registration Number': 'Lu 1 Kha 8920',
        'Bus Route': 'Butwal - Narayangarh - Kathmandu Express',
        'Bus Park': 'Traffic Chowk Central Bus Park, Butwal',
        District: 'Rupandehi',
        Province: 'Lumbini Province',
        'Customer Address': 'Traffic Chowk, Butwal',
        Status: 'active',
        'Registration Date': '10/01/2026',
        'Assigned Office Staff': 'Sunita Tamang',
        'Assigned Dealer': 'Lumbini Fleet Solutions (Butwal)',
        Remarks: '4 HD in-cabin CCTV cameras with mobile DVR installed.',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Netcare_Nepal_Customer_Import_Template.xlsx');
  };

  // Parse Excel File on Selection (Feature 10)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const rawJson: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wsName]);

        if (rawJson.length === 0) {
          alert('The uploaded Excel sheet contains no rows.');
          return;
        }

        // Validate each row
        const parsed = rawJson.map((row, index) => {
          const fullName =
            row['Customer Full Name'] ||
            row['Full Name'] ||
            row['Customer Name'] ||
            row['Contact Person'] ||
            '';
          const companyName =
            row['Bus Company Name'] ||
            row['Company Name'] ||
            row['Operator Name'] ||
            row['Transport Name'] ||
            '';
          const phone = String(row['Contact Number'] || row['Phone Number'] || row['Phone'] || '');
          const whatsapp = String(row['WhatsApp Number'] || row['WhatsApp'] || phone);
          const busReg = String(
            row['Bus Registration Number'] || row['Bus Registration'] || row['Bus Reg'] || ''
          );
          const busRoute = String(row['Bus Route'] || row['Route'] || '');
          const busPark = String(
            row['Bus Park'] || row['Terminal'] || 'Gongabu New Bus Park, Kathmandu'
          );
          const district = String(row['District'] || row['City'] || 'Kathmandu');
          const province = String(row['Province'] || 'Bagmati Province');
          const address = String(row['Customer Address'] || row['Address'] || '');
          const status = (
            row['Status'] || 'active'
          ).toLowerCase() as CustomerStatus;
          const regDate = String(
            row['Registration Date'] ||
              new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).format(new Date())
          );
          const remarks = String(row['Remarks'] || row['Notes'] || '');
          const assignedStaff = String(row['Assigned Office Staff'] || row['Assigned Staff'] || '');
          const assignedDealer = String(row['Assigned Dealer'] || row['Dealer'] || '');

          // Check validation errors
          const errors: string[] = [];
          if (!companyName.trim()) errors.push('Missing Bus Company Name');
          if (!fullName.trim()) errors.push('Missing Customer Full Name');
          if (!phone.trim()) errors.push('Missing Phone Number');
          if (!busReg.trim()) errors.push('Missing Bus Registration');

          // Duplicate checks against database
          const normP = normalizePhone(phone);
          const normB = normalizeBusReg(busReg);

          const existingDbPhone = customers.find(
            (c) => normalizePhone(c.phone) === normP && normP.length >= 8
          );
          if (existingDbPhone) {
            errors.push(
              `Phone duplicate with DB: ${existingDbPhone.companyName} (${existingDbPhone.customerId || existingDbPhone.id})`
            );
          }

          const existingDbBus = customers.find(
            (c) => normalizeBusReg(c.busRegistrationNumber) === normB && normB.length >= 4
          );
          if (existingDbBus) {
            errors.push(
              `Bus Reg duplicate with DB: ${existingDbBus.companyName} (${existingDbBus.customerId || existingDbBus.id})`
            );
          }

          return {
            rowIndex: index + 1,
            customerId: row['Customer ID'] || `NC-CUST-${2000 + index + 1}`,
            fullName,
            companyName,
            phone,
            whatsappNumber: whatsapp,
            busRegistrationNumber: busReg,
            busRoute,
            busPark,
            district,
            province,
            address,
            status: ['active', 'suspended', 'prospective', 'inactive'].includes(status)
              ? status
              : 'active',
            registrationDate: regDate,
            assignedStaffName: assignedStaff,
            assignedDealerName: assignedDealer,
            remarks,
            errors,
            isValid: errors.length === 0,
          };
        });

        // Also check duplicates within the uploaded file itself
        const seenPhones = new Set<string>();
        const seenBuses = new Set<string>();

        parsed.forEach((row) => {
          const normP = normalizePhone(row.phone);
          const normB = normalizeBusReg(row.busRegistrationNumber);

          if (normP && seenPhones.has(normP)) {
            row.errors.push(`Duplicate phone within this spreadsheet: ${row.phone}`);
            row.isValid = false;
          } else if (normP) {
            seenPhones.add(normP);
          }

          if (normB && seenBuses.has(normB)) {
            row.errors.push(`Duplicate bus registration within this spreadsheet: ${row.busRegistrationNumber}`);
            row.isValid = false;
          } else if (normB) {
            seenBuses.add(normB);
          }
        });

        setImportRows(parsed);
      } catch (error) {
        console.error('Failed to parse Excel file:', error);
        alert('Failed to read Excel file. Please ensure it is a valid .xlsx or .xls document.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Execute Batch Import to Firestore (Feature 10)
  const handleExecuteImport = async () => {
    const validRows = importRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('There are no valid rows to import. Please resolve the highlighted errors.');
      return;
    }

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const row of validRows) {
        const docId = `cust-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
        const newCustomer: Customer = {
          id: docId,
          customerId: row.customerId,
          fullName: row.fullName,
          contactPerson: row.fullName,
          companyName: row.companyName,
          phone: row.phone,
          whatsappNumber: row.whatsappNumber,
          busRegistrationNumber: row.busRegistrationNumber,
          fleetVehicles: [row.busRegistrationNumber],
          busRoute: row.busRoute,
          busPark: row.busPark,
          district: row.district,
          province: row.province,
          city: row.district,
          address: row.address,
          status: row.status,
          registrationDate: row.registrationDate,
          assignedStaffName: row.assignedStaffName,
          assignedDealerName: row.assignedDealerName,
          remarks: row.remarks,
          fleetSize: 1,
          createdAt: new Date().toISOString(),
        };

        await createDocument<Customer>(
          'customers',
          newCustomer,
          'Customer',
          `Imported customer ${row.companyName} (${row.customerId}) via Excel`,
          { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
        );
        successCount++;
      }

      alert(`Successfully imported ${successCount} bus operator records into Cloud Firestore.`);
      setIsImportModalOpen(false);
      setImportRows([]);
      setImportFileName('');
    } catch (err) {
      console.error('Batch import error:', err);
      alert(`Import error after ${successCount} records. Please check database permissions.`);
    } finally {
      setIsImporting(false);
    }
  };

  // Sub-data for currently viewed 360° Profile
  const profileSubscriptions = useMemo(() => {
    if (!selectedProfileCustomer) return [];
    return subscriptions.filter(
      (s) =>
        s.customerId === selectedProfileCustomer.id ||
        s.customerId === selectedProfileCustomer.customerId ||
        s.customerName === selectedProfileCustomer.companyName
    );
  }, [subscriptions, selectedProfileCustomer]);

  const profileDevices = useMemo(() => {
    if (!selectedProfileCustomer) return [];
    return inventory.filter(
      (item) =>
        item.assignedCustomerId === selectedProfileCustomer.id ||
        item.assignedCustomerId === selectedProfileCustomer.customerId ||
        item.assignedCustomer === selectedProfileCustomer.companyName
    );
  }, [inventory, selectedProfileCustomer]);

  const profileWorkOrders = useMemo(() => {
    if (!selectedProfileCustomer) return [];
    return workOrders.filter(
      (wo) =>
        wo.customerId === selectedProfileCustomer.id ||
        wo.customerId === selectedProfileCustomer.customerId ||
        wo.customerName === selectedProfileCustomer.companyName
    );
  }, [workOrders, selectedProfileCustomer]);

  const profileInvoices = useMemo(() => {
    if (!selectedProfileCustomer) return [];
    return invoices.filter(
      (inv) =>
        inv.customerId === selectedProfileCustomer.id ||
        inv.customerId === selectedProfileCustomer.customerId ||
        inv.customerName === selectedProfileCustomer.companyName
    );
  }, [invoices, selectedProfileCustomer]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Customer & Bus Fleet Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centrally managing bus operators, tourist coaches, transit cooperatives, and vehicle
            telematics accounts across Nepal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import Excel */}
          {isStaffOrHigher(activeRole) && (
            <button
              onClick={() => {
                setImportRows([]);
                setImportFileName('');
                setIsImportModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Import Customers from Excel spreadsheet"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Excel</span>
            </button>
          )}

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Download Customer list as Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Download branded PDF report"
          >
            <FileText className="w-3.5 h-3.5 text-red-600" />
            <span>PDF</span>
          </button>

          {/* Add Customer Button */}
          {isStaffOrHigher(activeRole) && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bus Operator</span>
            </button>
          )}
        </div>
      </div>

      {/* Operational Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {customers.length}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Transport Clients
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {customers.filter((c) => c.status === 'active').length}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Bus Operators
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {uniqueDistricts.length}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Districts Covered
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {customers.filter((c) => c.status === 'prospective').length}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Prospective / Leads
            </div>
          </div>
        </div>
      </div>

      {/* Search and Multi-Filter Bar (Features 4 & 5) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input (Customer Name, Phone, WhatsApp, Bus Number) */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, phone, WhatsApp, bus registration (e.g. Ba 3 Kha), or route..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500/20 cursor-pointer"
            >
              <option value="all">All Statuses ({customers.length})</option>
              <option value="active">Active</option>
              <option value="prospective">Prospective</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              District:
            </span>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500/20 cursor-pointer"
            >
              <option value="all">All Districts ({uniqueDistricts.length})</option>
              {uniqueDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Route Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Route:
            </span>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500/20 cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">All Routes</option>
              {uniqueRoutes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Dealer Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Dealer:
            </span>
            <select
              value={dealerFilter}
              onChange={(e) => setDealerFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500/20 cursor-pointer max-w-[170px] truncate"
            >
              <option value="all">All Dealers</option>
              {uniqueDealerNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(searchTerm ||
            statusFilter !== 'all' ||
            districtFilter !== 'all' ||
            routeFilter !== 'all' ||
            dealerFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDistrictFilter('all');
                setRouteFilter('all');
                setDealerFilter('all');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Display active filter count */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredCustomers.length}</strong> of{' '}
            <strong className="text-slate-800">{customers.length}</strong> registered bus operators
          </span>
          {duplicateWarning.isOpen && (
            <span className="text-amber-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Duplicate detection active
            </span>
          )}
        </div>
      </div>

      {/* Main Customers Table (Features 3, 4, 6, 7, 8, 9) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Bus Operator / Client</th>
                <th className="py-3.5 px-4">Contact & WhatsApp</th>
                <th className="py-3.5 px-4">Bus Reg & Route</th>
                <th className="py-3.5 px-4">Terminal & District</th>
                <th className="py-3.5 px-4">Assigned Personnel</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Bus className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-700">No Bus Operators Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No records match the current search keywords or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const badge = getStatusBadge(cust.status);
                  const custSubs = subscriptions.filter(
                    (s) =>
                      s.customerId === cust.id ||
                      s.customerId === cust.customerId ||
                      s.customerName === cust.companyName
                  );
                  const custDevices = inventory.filter(
                    (i) =>
                      i.assignedCustomerId === cust.id ||
                      i.assignedCustomerId === cust.customerId ||
                      i.assignedCustomer === cust.companyName
                  );
                  const custOrders = workOrders.filter(
                    (w) =>
                      w.customerId === cust.id ||
                      w.customerId === cust.customerId ||
                      w.customerName === cust.companyName
                  );

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => handleOpenProfileModal(cust, 'overview')}
                    >
                      {/* Operator & Customer ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-red-600 transition-colors">
                          {cust.companyName}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {cust.customerId || cust.id}
                          </span>
                          <span>• Reg: {cust.registrationDate || formatDate(cust.createdAt)}</span>
                        </div>
                      </td>

                      {/* Contact & WhatsApp */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="font-semibold text-slate-800">
                          {cust.fullName || cust.contactPerson || 'N/A'}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1 text-[11px]">
                          <a
                            href={`tel:${cust.phone}`}
                            className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
                            title="Call Phone"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cust.phone}</span>
                          </a>
                          {cust.whatsappNumber && (
                            <a
                              href={`https://wa.me/${cust.whatsappNumber.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span>{cust.whatsappNumber}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Bus Reg & Route */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-mono bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                            {cust.busRegistrationNumber || 'N/A'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 max-w-[200px] truncate">
                          {cust.busRoute || 'Route unassigned'}
                        </div>
                      </td>

                      {/* Terminal & District */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          <span>{cust.district || cust.city || 'Kathmandu'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 max-w-[180px] truncate">
                          {cust.busPark || cust.address || 'Gongabu Bus Park'}
                        </div>
                      </td>

                      {/* Assigned Staff & Dealer */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium text-[11px] flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          <span>Staff: {cust.assignedStaffName || 'Unassigned'}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Dealer: {cust.assignedDealerName || cust.dealerName || 'Direct Netcare'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Quick Action Shortcuts (Features 2, 3, 6, 7, 8, 9) */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 360° Profile Button */}
                          <button
                            onClick={() => handleOpenProfileModal(cust, 'overview')}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                            title="View Complete 360° Customer Profile"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span className="hidden sm:inline">Profile</span>
                          </button>

                          {/* Quick Edit */}
                          {isStaffOrHigher(activeRole) && (
                            <button
                              onClick={() => handleOpenEditModal(cust)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                              title="Edit Customer Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete (CEO only) */}
                          {isCEO(activeRole) && (
                            <button
                              onClick={() => handleDelete(cust.id, cust.companyName)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete Bus Operator"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* =========================================================================
          360° CUSTOMER PROFILE MODAL (Feature 3, 6, 7, 8, 9)
         ========================================================================= */}
      {selectedProfileCustomer && (
        <Modal
          isOpen={!!selectedProfileCustomer}
          onClose={() => setSelectedProfileCustomer(null)}
          title={`360° Customer Profile • ${selectedProfileCustomer.companyName}`}
          subtitle={`Customer ID: ${selectedProfileCustomer.customerId || selectedProfileCustomer.id} | Bus Telematics & Connectivity Overview`}
          maxWidth="6xl"
        >
          <div className="space-y-5 text-xs">
            {/* Header Profile Badge Card */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500 flex items-center justify-center shrink-0">
                  <Bus className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black tracking-tight text-white">
                      {selectedProfileCustomer.companyName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                      {selectedProfileCustomer.customerId || selectedProfileCustomer.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        getStatusBadge(selectedProfileCustomer.status).bg
                      } ${getStatusBadge(selectedProfileCustomer.status).text}`}
                    >
                      {getStatusBadge(selectedProfileCustomer.status).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-xs mt-1.5 flex-wrap">
                    <span>
                      Contact Person:{' '}
                      <strong className="text-slate-200">
                        {selectedProfileCustomer.fullName || selectedProfileCustomer.contactPerson}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Primary Bus:{' '}
                      <strong className="text-red-400 font-mono">
                        {selectedProfileCustomer.busRegistrationNumber || 'N/A'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      District:{' '}
                      <strong className="text-slate-200">
                        {selectedProfileCustomer.district || selectedProfileCustomer.city}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Communication Buttons */}
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${selectedProfileCustomer.phone}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Call {selectedProfileCustomer.phone}</span>
                </a>
                {selectedProfileCustomer.whatsappNumber && (
                  <a
                    href={`https://wa.me/${selectedProfileCustomer.whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1">
              <button
                onClick={() => setProfileActiveTab('overview')}
                className={`px-4 py-2.5 rounded-xl font-bold transition-colors shrink-0 ${
                  profileActiveTab === 'overview'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                1. Overview & Information
              </button>
              <button
                onClick={() => setProfileActiveTab('buses')}
                className={`px-4 py-2.5 rounded-xl font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                  profileActiveTab === 'buses'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bus className="w-3.5 h-3.5" />
                <span>
                  2. Buses & Fleet (
                  {(selectedProfileCustomer.fleetVehicles?.length || 1)}
                  )
                </span>
              </button>
              <button
                onClick={() => setProfileActiveTab('devices')}
                className={`px-4 py-2.5 rounded-xl font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                  profileActiveTab === 'devices'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>3. Installed Devices ({profileDevices.length})</span>
              </button>
              <button
                onClick={() => setProfileActiveTab('subscriptions')}
                className={`px-4 py-2.5 rounded-xl font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                  profileActiveTab === 'subscriptions'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>4. Subscriptions ({profileSubscriptions.length})</span>
              </button>
              <button
                onClick={() => setProfileActiveTab('invoices')}
                className={`px-4 py-2.5 rounded-xl font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                  profileActiveTab === 'invoices'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>5. Payments & Invoices ({profileInvoices.length})</span>
              </button>
              <button
                onClick={() => setProfileActiveTab('service')}
                className={`px-4 py-2.5 rounded-xl font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                  profileActiveTab === 'service'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>6. Service & Complaints ({profileWorkOrders.length})</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW & INFORMATION */}
            {profileActiveTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Operator Details Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-red-600" />
                    <span>Company & Registration Credentials</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Unique Customer ID:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedProfileCustomer.customerId || selectedProfileCustomer.id}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Bus Operator Name:</span>
                      <span className="font-bold text-slate-900">
                        {selectedProfileCustomer.companyName}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Contact Person:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedProfileCustomer.fullName || selectedProfileCustomer.contactPerson}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Registration Date:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedProfileCustomer.registrationDate ||
                          formatDate(selectedProfileCustomer.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">PAN / VAT Number:</span>
                      <span className="font-mono text-slate-800">
                        {selectedProfileCustomer.panNumber || 'Not Registered / Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 font-medium">Account Status:</span>
                      <span className="font-bold uppercase text-red-600">
                        {selectedProfileCustomer.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Route & Geographic Presence Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span>Route, Terminal & Geographic Presence</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Primary Bus Route:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedProfileCustomer.busRoute || 'Unspecified'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Designated Bus Park:</span>
                      <span className="font-semibold text-slate-900 text-right">
                        {selectedProfileCustomer.busPark || 'Gongabu New Bus Park'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">District & Province:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedProfileCustomer.district || selectedProfileCustomer.city} •{' '}
                        {selectedProfileCustomer.province || 'Bagmati Province'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Physical Depot Address:</span>
                      <span className="font-medium text-slate-800 text-right">
                        {selectedProfileCustomer.address || 'Address on record'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 font-medium">Assigned Office Staff:</span>
                      <span className="font-bold text-slate-900">
                        {selectedProfileCustomer.assignedStaffName || 'Sunita Tamang'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remarks & Operational Notes */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 md:col-span-2 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Operational Remarks & Notes</span>
                  </h4>
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed font-normal">
                    {selectedProfileCustomer.remarks ||
                      selectedProfileCustomer.notes ||
                      'No specific operational remarks recorded for this client.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: REGISTERED BUSES & FLEET */}
            {profileActiveTab === 'buses' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-sm mb-2">Registered Buses</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    All passenger buses associated with {selectedProfileCustomer.companyName}{' '}
                    registered for Netcare WiFi, GPS telematics, or CCTV MDVR services.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Primary Bus */}
                    <div className="bg-white p-4 rounded-xl border-2 border-red-500/40 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-bold text-[10px]">
                          Primary Bus
                        </span>
                        <Bus className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="text-base font-black text-slate-900 font-mono">
                        {selectedProfileCustomer.busRegistrationNumber || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Route: {selectedProfileCustomer.busRoute || 'Standard Highway'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Park: {selectedProfileCustomer.busPark || 'Central Terminal'}
                      </div>
                    </div>

                    {/* Secondary Fleet Vehicles */}
                    {(selectedProfileCustomer.fleetVehicles || [])
                      .filter((v) => v !== selectedProfileCustomer.busRegistrationNumber)
                      .map((vehicle, i) => (
                        <div
                          key={i}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">
                              Fleet Vehicle #{i + 2}
                            </span>
                            <Bus className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="text-base font-black text-slate-900 font-mono">
                            {vehicle}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Route: {selectedProfileCustomer.busRoute || 'Regional Transit'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Park: {selectedProfileCustomer.busPark || 'Central Terminal'}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INSTALLED DEVICES (Feature 7) */}
            {profileActiveTab === 'devices' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Installed Hardware & Connectivity Inventory
                  </h4>
                  <span className="text-xs text-slate-500">
                    Total Assigned Hardware: <strong>{profileDevices.length} items</strong>
                  </span>
                </div>

                {profileDevices.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
                    <Radio className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No Hardware Assigned</p>
                    <p className="text-xs text-slate-500 mt-1">
                      No WiFi routers, GPS units, or CCTV MDVRs are currently mapped to this
                      customer ID.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Hardware Item</th>
                          <th className="py-3 px-4">Brand / Model</th>
                          <th className="py-3 px-4">Serial / IMEI / SIM</th>
                          <th className="py-3 px-4">Assigned Vehicle</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profileDevices.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-bold text-slate-900">{item.itemName}</td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {item.brandModel}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                              SN: {item.serialNumber}
                              {item.imeiOrImsi && (
                                <div className="text-slate-400">IMEI: {item.imeiOrImsi}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">
                              {item.assignedVehicle ||
                                selectedProfileCustomer.busRegistrationNumber ||
                                'N/A'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{item.location}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {item.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SUBSCRIPTION HISTORY (Feature 8) */}
            {profileActiveTab === 'subscriptions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Active & Past Service Subscriptions
                  </h4>
                  <span className="text-xs text-slate-500">
                    Recurring Plans: <strong>{profileSubscriptions.length}</strong>
                  </span>
                </div>

                {profileSubscriptions.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
                    <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No Subscriptions Found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      No active telematics or connectivity subscription contracts found.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Plan Name</th>
                          <th className="py-3 px-4">Vehicle Number</th>
                          <th className="py-3 px-4">Service Type</th>
                          <th className="py-3 px-4">Recurring Fee (NPR)</th>
                          <th className="py-3 px-4">Billing Cycle</th>
                          <th className="py-3 px-4">Expiry Date</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profileSubscriptions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-bold text-slate-900">{sub.planName}</td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">
                              {sub.vehicleNumber}
                            </td>
                            <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-600">
                              {sub.serviceType}
                            </td>
                            <td className="py-3 px-4 font-black text-slate-900">
                              {formatNPR(sub.feeNpr)}
                            </td>
                            <td className="py-3 px-4 capitalize text-slate-700">
                              {sub.billingCycle}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium">
                              {formatDate(sub.expiryDate)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  sub.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {sub.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: PAYMENTS & INVOICES (Feature 9) */}
            {profileActiveTab === 'invoices' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Invoices & Payment Records (NPR रू)
                  </h4>
                  <span className="text-xs text-slate-500">
                    Total Invoices: <strong>{profileInvoices.length}</strong>
                  </span>
                </div>

                {profileInvoices.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
                    <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No Billing Records Found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      No invoices have been issued to this customer account yet.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Invoice #</th>
                          <th className="py-3 px-4">Issue Date</th>
                          <th className="py-3 px-4">Subtotal</th>
                          <th className="py-3 px-4">13% VAT</th>
                          <th className="py-3 px-4">Total (NPR)</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profileInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-mono font-bold text-red-600">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{formatDate(inv.issuedDate)}</td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {formatNPR(inv.amountNpr)}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono">
                              {formatNPR(inv.vatAmountNpr)}
                            </td>
                            <td className="py-3 px-4 font-black text-slate-900">
                              {formatNPR(inv.totalNpr)}
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {inv.paymentMethod || 'Bank Transfer'}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  inv.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {inv.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: SERVICE HISTORY & COMPLAINTS (Feature 6) */}
            {profileActiveTab === 'service' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Field Service Tickets, Maintenance & Complaints
                  </h4>
                  <span className="text-xs text-slate-500">
                    Total Service Records: <strong>{profileWorkOrders.length}</strong>
                  </span>
                </div>

                {profileWorkOrders.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
                    <Wrench className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No Service Tickets Recorded</p>
                    <p className="text-xs text-slate-500 mt-1">
                      No repair or maintenance tickets have been opened for this fleet client.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profileWorkOrders.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                              {ticket.ticketNumber}
                            </span>
                            <h5 className="font-bold text-slate-900 text-xs">{ticket.title}</h5>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                              {ticket.vehicleNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                ticket.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {ticket.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600">{ticket.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                          <div>
                            Technician:{' '}
                            <strong className="text-slate-800">
                              {ticket.assignedTechnicianName || 'Unassigned'}
                            </strong>
                          </div>
                          <div>
                            Scheduled:{' '}
                            <strong className="text-slate-800">
                              {formatDate(ticket.scheduledDate)}
                            </strong>
                          </div>
                          <div>
                            Location:{' '}
                            <strong className="text-slate-800">{ticket.location}</strong>
                          </div>
                        </div>

                        {ticket.resolutionNotes && (
                          <div className="p-2 bg-emerald-50/60 rounded-lg text-emerald-900 text-[11px]">
                            <strong>Resolution:</strong> {ticket.resolutionNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedProfileCustomer(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          ADD / EDIT CUSTOMER MODAL (Features 1 & 2)
         ========================================================================= */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCustomer ? 'Edit Bus Operator Details' : 'Register New Bus Operator / Client'}
        subtitle="Configure official transport company profile, primary bus registration, routes, and assigned team members"
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer ID */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Unique Customer ID (Auto-Generated) *
              </label>
              <input
                type="text"
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="e.g. NC-CUST-1007"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Bus Operator / Company Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bus Company / Operator Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Baba Adventure Deluxe Transport Pvt. Ltd."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Customer Full Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Customer Full Name (Proprietor / Representative) *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Rajan Shrestha"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Contact Phone Number (Nepal) *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+977-9851023456"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
              />
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">WhatsApp Number *</label>
              <input
                type="text"
                required
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="+977-9851023456"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
              />
            </div>

            {/* Bus Registration Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Primary Bus Registration Number *
              </label>
              <input
                type="text"
                required
                value={formData.busRegistrationNumber}
                onChange={(e) =>
                  setFormData({ ...formData, busRegistrationNumber: e.target.value })
                }
                placeholder="e.g. Ba 3 Kha 4521"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono font-bold"
              />
            </div>

            {/* Additional Fleet Vehicles */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Fleet Vehicles (Comma-separated bus registrations for multi-vehicle operators)
              </label>
              <input
                type="text"
                value={formData.fleetVehicles}
                onChange={(e) => setFormData({ ...formData, fleetVehicles: e.target.value })}
                placeholder="e.g. Ba 3 Kha 4521, Ba 3 Kha 4522, Ba 3 Kha 8901"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
              />
            </div>

            {/* Bus Route */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bus Route *</label>
              <input
                type="text"
                required
                value={formData.busRoute}
                onChange={(e) => setFormData({ ...formData, busRoute: e.target.value })}
                placeholder="e.g. Kathmandu - Pokhara Luxury Coach"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Bus Park */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Designated Bus Park *</label>
              <input
                type="text"
                required
                value={formData.busPark}
                onChange={(e) => setFormData({ ...formData, busPark: e.target.value })}
                placeholder="e.g. Gongabu New Bus Park Bay 4"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Province */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Province *</label>
              <select
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
              >
                {NEPAL_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">District *</label>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="e.g. Kathmandu, Kaski, Chitwan"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Customer Address */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Customer Address *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Gongabu New Bus Park, Kathmandu, Nepal"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Customer Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as CustomerStatus })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer font-bold"
              >
                <option value="active">Active</option>
                <option value="prospective">Prospective / Lead</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            {/* Registration Date */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Registration Date (DD/MM/YYYY)
              </label>
              <input
                type="text"
                value={formData.registrationDate}
                onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Assigned Office Staff */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Office Staff</label>
              <select
                value={formData.assignedStaffName}
                onChange={(e) => {
                  const staff = staffUsers.find((u) => u.fullName === e.target.value);
                  setFormData({
                    ...formData,
                    assignedStaffName: e.target.value,
                    assignedStaffId: staff?.userId || '',
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {staffUsers.map((u) => (
                  <option key={u.userId} value={u.fullName}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Dealer */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Dealer</label>
              <select
                value={formData.assignedDealerName}
                onChange={(e) => {
                  const dealer = dealers.find((d) => d.dealerName === e.target.value);
                  setFormData({
                    ...formData,
                    assignedDealerName: e.target.value,
                    assignedDealerId: dealer?.id || '',
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
              >
                <option value="Netcare Kathmandu Direct">Netcare Kathmandu Direct</option>
                {dealers.map((d) => (
                  <option key={d.id} value={d.dealerName}>
                    {d.dealerName} ({d.territory})
                  </option>
                ))}
              </select>
            </div>

            {/* Remarks */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Remarks / Operational Notes
              </label>
              <textarea
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Add special notes regarding hardware preferences, bus model, or route specifics..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
            >
              {editingCustomer ? 'Update Bus Operator' : 'Register Operator'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          EXCEL IMPORT MODAL (Feature 10)
         ========================================================================= */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Bus Operators from Excel Spreadsheet"
        subtitle="Batch register clients from .xlsx or .csv files with automated duplicate validation"
        maxWidth="5xl"
      >
        <div className="space-y-4 text-xs">
          {/* File Upload Zone */}
          <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 hover:border-red-400 transition-colors text-center">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2">
              <FileUp className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              {importFileName || 'Select or Drag & Drop Excel File'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Supports .xlsx and .csv files. Ensure columns include Customer Full Name, Bus Company
              Name, Contact Number, and Bus Registration.
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
              >
                Browse Excel File
              </button>
              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download Sample Template</span>
              </button>
            </div>
          </div>

          {/* Parsed Rows Preview */}
          {importRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Spreadsheet Preview ({importRows.length} total rows):
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600 font-bold">
                    ✓ {importRows.filter((r) => r.isValid).length} Ready to Import
                  </span>
                  <span className="text-rose-600 font-bold">
                    ✗ {importRows.filter((r) => !r.isValid).length} Issues / Duplicates Flagged
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Operator Name</th>
                      <th className="py-2 px-3">Contact Person</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Bus Registration</th>
                      <th className="py-2 px-3">Route</th>
                      <th className="py-2 px-3">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}
                      >
                        <td className="py-2 px-3 font-mono text-slate-400">#{row.rowIndex}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{row.companyName}</td>
                        <td className="py-2 px-3 text-slate-700">{row.fullName}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{row.phone}</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">
                          {row.busRegistrationNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{row.busRoute}</td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Valid
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {row.errors.map((err: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="text-[10px] text-rose-600 font-semibold flex items-center gap-1"
                                >
                                  <span>•</span>
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportRows([]);
                setImportFileName('');
              }}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isImporting || importRows.filter((r) => r.isValid).length === 0}
              onClick={handleExecuteImport}
              className={`px-5 py-2 rounded-xl font-bold text-white transition-colors cursor-pointer flex items-center gap-2 ${
                isImporting || importRows.filter((r) => r.isValid).length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing into Firestore...</span>
                </>
              ) : (
                <span>
                  Confirm & Import ({importRows.filter((r) => r.isValid).length}) Records
                </span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          DUPLICATE WARNING MODAL (Feature 12)
         ========================================================================= */}
      {duplicateWarning.isOpen && (
        <Modal
          isOpen={duplicateWarning.isOpen}
          onClose={() => setDuplicateWarning({ isOpen: false, reason: '' })}
          title="Duplicate Customer Record Prevented"
          subtitle="Netcare Nepal ERP prevents duplicate customer phone numbers or bus registration entries"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-slate-800 space-y-2">
              <p className="font-bold text-amber-900">Validation Conflict Detected:</p>
              <p className="text-xs leading-relaxed">{duplicateWarning.reason}</p>
            </div>

            {duplicateWarning.existingCustomer && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900">
                  Existing Operator:{' '}
                  <span className="text-red-600">
                    {duplicateWarning.existingCustomer.companyName}
                  </span>
                </div>
                <div className="text-slate-500 flex items-center gap-2">
                  <span>
                    ID:{' '}
                    {duplicateWarning.existingCustomer.customerId ||
                      duplicateWarning.existingCustomer.id}
                  </span>
                  <span>•</span>
                  <span>Phone: {duplicateWarning.existingCustomer.phone}</span>
                </div>
                <div className="text-slate-500">
                  Bus Registration:{' '}
                  <span className="font-mono font-bold text-slate-800">
                    {duplicateWarning.existingCustomer.busRegistrationNumber}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicateWarning({ isOpen: false, reason: '' })}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                I Understand, Let Me Review
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
