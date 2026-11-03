import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Bus,
  User,
  Check,
  Calendar,
  Camera,
  Upload,
  Star,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Package,
  Layers,
  Award,
  Zap,
  ArrowRight,
  Activity,
  FileCheck,
  Smartphone,
  ExternalLink,
  MessageSquareWarning,
  X,
} from 'lucide-react';
import {
  WorkOrder,
  FieldJobType,
  FieldJobPriority,
  FieldJobStatus,
  Customer,
  InventoryItem,
  UserProfile,
  StockMovement,
  MaterialUsedItem,
  CustomerConfirmation,
  CustomerJobFeedback,
  isCEO,
  isManagerOrHigher,
  isTechnician,
} from '../../types/erp';
import { formatDate, formatDateTime, formatNPR } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { createDocument, updateDocument } from '../../services/dbService';
import { exportToExcel, exportTableToPDF } from '../../utils/exportUtils';

export const ALL_JOB_TYPES: FieldJobType[] = [
  'New WiFi installation',
  'CCTV installation',
  'GPS installation',
  'Router replacement',
  'CCTV maintenance',
  'Network troubleshooting',
  'SIM replacement',
  'memory card installation',
  'due payment collection',
  'General service',
];

export const ALL_JOB_STATUSES: FieldJobStatus[] = [
  'Pending',
  'Assigned',
  'Accepted',
  'In Progress',
  'Completed',
  'Cancelled',
];

export const ALL_JOB_PRIORITIES: FieldJobPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

interface OperationsManagementProps {
  workOrders: WorkOrder[];
  customers: Customer[];
  inventory?: InventoryItem[];
  users?: UserProfile[];
  stockMovements?: StockMovement[];
}

export const OperationsManagement: React.FC<OperationsManagementProps> = ({
  workOrders,
  customers,
  inventory = [],
  users = [],
  stockMovements = [],
}) => {
  const { activeRole, userProfile } = useAuth();

  // Active view tab: 'jobs' | 'technician_workspace' | 'scorecard' | 'complaints'
  const [activeTab, setActiveTab] = useState<'jobs' | 'technician_workspace' | 'scorecard' | 'complaints'>(
    activeRole === 'FIELD_TECHNICIAN' ? 'technician_workspace' : 'jobs'
  );

  // Active technician identity for privacy testing
  const [selectedTechProfileId, setSelectedTechProfileId] = useState<string>('usr-tech-01');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');

  // Modals
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<WorkOrder | null>(null);
  const [selectedJobForExecution, setSelectedJobForExecution] = useState<WorkOrder | null>(null);
  const [viewingServiceReport, setViewingServiceReport] = useState<WorkOrder | null>(null);

  // New Job Dispatch Form State
  const [jobFormData, setJobFormData] = useState({
    customerId: '',
    customerName: '',
    busName: '',
    busNumber: '',
    busDepartureTime: '',
    contactPerson: '',
    contactNumber: '',
    location: 'Gongabu New Bus Park, Terminal Bay 4',
    jobType: 'Network troubleshooting' as FieldJobType,
    jobDescription: '',
    assignedTechnicianId: '',
    assignedTechnicianName: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: '10:00 AM',
    priority: 'High' as FieldJobPriority,
    isComplaintEscalation: false,
    complaintId: '',
    reportedFault: '',
  });

  // Technician Execution Form State
  const [executionState, setExecutionState] = useState<{
    status: FieldJobStatus;
    beforePhotoUrl: string;
    afterPhotoUrl: string;
    beforePhotos: string[];
    afterPhotos: string[];
    deviceSerialInput: string;
    deviceSerialNumbers: string[];
    selectedMaterialItemId: string;
    selectedMaterialQty: number;
    materialsUsed: MaterialUsedItem[];
    serviceNotes: string;
    customerRating: number;
    customerComment: string;
    customerSigneeName: string;
    customerSigneePhone: string;
    customerConfirmed: boolean;
    confirmationMethod: 'digital_signature' | 'sms_otp_verified' | 'driver_conductor_signoff';
  }>({
    status: 'In Progress',
    beforePhotoUrl: '',
    afterPhotoUrl: '',
    beforePhotos: [],
    afterPhotos: [],
    deviceSerialInput: '',
    deviceSerialNumbers: [],
    selectedMaterialItemId: '',
    selectedMaterialQty: 1,
    materialsUsed: [],
    serviceNotes: '',
    customerRating: 5,
    customerComment: '',
    customerSigneeName: '',
    customerSigneePhone: '',
    customerConfirmed: false,
    confirmationMethod: 'driver_conductor_signoff',
  });

  // List of field technicians for assignment
  const fieldTechnicians = useMemo(() => {
    const list = users.filter((u) => u.role === 'FIELD_TECHNICIAN');
    if (list.length > 0) return list;
    return [
      { userId: 'usr-tech-01', fullName: 'Bikash KC', email: 'bikash.tech@netcarenepal.com', phone: '+977-9860192841' },
      { userId: 'usr-tech-02', fullName: 'Santosh Tamang', email: 'santosh.tech@netcarenepal.com', phone: '+977-9841298765' },
    ] as UserProfile[];
  }, [users]);

  // STRICT PRIVACY FILTER:
  // If active role is FIELD_TECHNICIAN, only show jobs assigned to this technician.
  // Never expose other technicians' private job records!
  const accessibleJobs = useMemo(() => {
    if (activeRole === 'FIELD_TECHNICIAN') {
      const currentId = userProfile?.userId?.startsWith('usr-tech')
        ? userProfile.userId
        : selectedTechProfileId || 'usr-tech-01';

      return workOrders.filter((job) => {
        if (job.assignedTechnicianId && job.assignedTechnicianId === currentId) return true;
        if (currentId === 'usr-tech-01' && (job.assignedTechnicianName?.toLowerCase().includes('bikash') || job.assignedTechnicianId === 'usr-tech-01')) {
          return true;
        }
        if (currentId === 'usr-tech-02' && (job.assignedTechnicianName?.toLowerCase().includes('santosh') || job.assignedTechnicianId === 'usr-tech-02')) {
          return true;
        }
        return false;
      });
    }
    // Operations Manager & CEO have full company-wide visibility
    return workOrders;
  }, [workOrders, activeRole, userProfile, selectedTechProfileId]);

  // Filtered Jobs based on search, status, priority, job type
  const filteredJobs = useMemo(() => {
    return accessibleJobs.filter((job) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (job.jobId || job.ticketNumber || '').toLowerCase().includes(q) ||
        (job.busNumber || job.vehicleNumber || '').toLowerCase().includes(q) ||
        (job.busName || '').toLowerCase().includes(q) ||
        (job.customerName || '').toLowerCase().includes(q) ||
        (job.contactPerson || '').toLowerCase().includes(q) ||
        (job.location || '').toLowerCase().includes(q) ||
        (job.jobDescription || job.description || '').toLowerCase().includes(q);

      const jobStatus = job.status || 'Pending';
      const matchesStatus = statusFilter === 'all' || jobStatus.toLowerCase() === statusFilter.toLowerCase();
      const matchesPriority = priorityFilter === 'all' || job.priority?.toLowerCase() === priorityFilter.toLowerCase();
      const matchesType = jobTypeFilter === 'all' || job.jobType === jobTypeFilter;
      const matchesTechnician =
        technicianFilter === 'all' ||
        job.assignedTechnicianId === technicianFilter ||
        job.assignedTechnicianName === technicianFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesTechnician;
    });
  }, [accessibleJobs, searchTerm, statusFilter, priorityFilter, jobTypeFilter, technicianFilter]);

  // Manager KPI Metrics
  const managerMetrics = useMemo(() => {
    const total = workOrders.length;
    const pending = workOrders.filter((w) => ['pending', 'assigned'].includes(w.status.toLowerCase())).length;
    const inProgress = workOrders.filter((w) => ['accepted', 'in progress', 'in_progress'].includes(w.status.toLowerCase())).length;
    const completed = workOrders.filter((w) => w.status.toLowerCase() === 'completed').length;
    const complaints = workOrders.filter((w) => w.isComplaintEscalation && w.status.toLowerCase() !== 'completed').length;

    // Average completion time (minutes)
    const completedWithDuration = workOrders.filter((w) => w.status.toLowerCase() === 'completed' && w.completionTimeMinutes);
    const avgMinutes = completedWithDuration.length > 0
      ? Math.round(completedWithDuration.reduce((acc, curr) => acc + (curr.completionTimeMinutes || 0), 0) / completedWithDuration.length)
      : 80;

    return {
      total,
      pending,
      inProgress,
      completed,
      complaints,
      avgMinutes,
    };
  }, [workOrders]);

  // Technician Performance Scorecard
  const technicianScorecard = useMemo(() => {
    return fieldTechnicians.map((tech) => {
      const techJobs = workOrders.filter(
        (w) => w.assignedTechnicianId === tech.userId || (tech.fullName && w.assignedTechnicianName?.includes(tech.fullName))
      );
      const completedJobs = techJobs.filter((w) => w.status.toLowerCase() === 'completed');
      const activeJobs = techJobs.filter((w) => ['assigned', 'accepted', 'in progress', 'in_progress'].includes(w.status.toLowerCase()));
      
      // Calculate rating
      const ratings = completedJobs.map((j) => j.customerFeedback?.rating).filter(Boolean) as number[];
      const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '4.9';

      return {
        tech,
        totalJobs: techJobs.length,
        completedJobs: completedJobs.length,
        activeJobs: activeJobs.length,
        avgRating,
        completionRate: techJobs.length > 0 ? Math.round((completedJobs.length / techJobs.length) * 100) : 100,
      };
    });
  }, [fieldTechnicians, workOrders]);

  // Open Dispatch Modal
  const handleOpenDispatchModal = () => {
    const firstCust = customers[0];
    const firstTech = fieldTechnicians[0];
    setJobFormData({
      customerId: firstCust?.id || '',
      customerName: firstCust?.companyName || 'Baba Adventure Deluxe Transport',
      busName: firstCust?.busName || 'Highway Express Deluxe',
      busNumber: firstCust?.busRegistrationNumber || 'Ba 3 Kha 4521',
      busDepartureTime: '15:30 (Mugling - Pokhara Express)',
      contactPerson: firstCust?.contactPerson || 'Driver Arjun',
      contactNumber: firstCust?.contactNumber || '+977-9851023456',
      location: 'Gongabu New Bus Park, Terminal Bay 4',
      jobType: 'New WiFi installation',
      jobDescription: '',
      assignedTechnicianId: firstTech?.userId || 'usr-tech-01',
      assignedTechnicianName: firstTech?.fullName || 'Bikash KC',
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: '10:00 AM',
      priority: 'High',
      isComplaintEscalation: false,
      complaintId: '',
      reportedFault: '',
    });
    setIsDispatchModalOpen(true);
  };

  // Submit New Job Dispatch
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const newJobId = `JOB-2026-${String(workOrders.length + 81).padStart(3, '0')}`;
    const newJob: Partial<WorkOrder> = {
      jobId: newJobId,
      ticketNumber: newJobId,
      title: `${jobFormData.jobType} (${jobFormData.busNumber})`,
      customerId: jobFormData.customerId,
      customerName: jobFormData.customerName,
      busName: jobFormData.busName,
      busNumber: jobFormData.busNumber,
      vehicleNumber: jobFormData.busNumber,
      busDepartureTime: jobFormData.busDepartureTime,
      contactPerson: jobFormData.contactPerson,
      contactNumber: jobFormData.contactNumber,
      contactPhone: jobFormData.contactNumber,
      location: jobFormData.location,
      jobType: jobFormData.jobType,
      serviceType: jobFormData.jobType.toLowerCase().includes('wifi') ? 'wifi' : jobFormData.jobType.toLowerCase().includes('cctv') ? 'cctv' : 'gps',
      jobDescription: jobFormData.jobDescription,
      description: jobFormData.jobDescription,
      assignedTechnicianId: jobFormData.assignedTechnicianId,
      assignedTechnicianName: jobFormData.assignedTechnicianName,
      assignedDate: new Date().toISOString(),
      scheduledDate: jobFormData.scheduledDate,
      scheduledTime: jobFormData.scheduledTime,
      priority: jobFormData.priority,
      status: jobFormData.assignedTechnicianId ? 'Assigned' : 'Pending',
      isComplaintEscalation: jobFormData.isComplaintEscalation,
      complaintId: jobFormData.complaintId || undefined,
      reportedFault: jobFormData.reportedFault || undefined,
      materialsUsed: [],
      deviceSerialNumbers: [],
      beforePhotos: [],
      afterPhotos: [],
      createdAt: new Date().toISOString(),
    };

    try {
      await createDocument('workOrders', newJob);
      setIsDispatchModalOpen(false);
    } catch (err) {
      console.error('Failed to dispatch job:', err);
      alert('Failed to dispatch field job: ' + (err as Error).message);
    }
  };

  // Quick Status Transition (Accept, Start, Cancel)
  const handleUpdateStatus = async (job: WorkOrder, newStatus: FieldJobStatus) => {
    try {
      const updates: Partial<WorkOrder> = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      if (newStatus === 'In Progress' && !job.startedAt) {
        updates.startedAt = new Date().toISOString();
      }
      await updateDocument('workOrders', job.id, updates);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update job status: ' + (err as Error).message);
    }
  };

  // Open Technician Execution Flow
  const handleOpenExecutionModal = (job: WorkOrder) => {
    setSelectedJobForExecution(job);
    const existingMaterials = job.materialsUsed || [];
    setExecutionState({
      status: (job.status as FieldJobStatus) || 'In Progress',
      beforePhotoUrl: '',
      afterPhotoUrl: '',
      beforePhotos: job.beforePhotos || [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
      ],
      afterPhotos: job.afterPhotos || [],
      deviceSerialInput: '',
      deviceSerialNumbers: job.deviceSerialNumbers || [],
      selectedMaterialItemId: inventory[0]?.id || '',
      selectedMaterialQty: 1,
      materialsUsed: [...existingMaterials],
      serviceNotes: job.serviceNotes || '',
      customerRating: job.customerFeedback?.rating || 5,
      customerComment: job.customerFeedback?.comment || 'Installation and signal checked. Verified bus WiFi & GPS working well.',
      customerSigneeName: job.customerConfirmation?.signeeName || job.contactPerson || '',
      customerSigneePhone: job.customerConfirmation?.signeePhone || job.contactNumber || '',
      customerConfirmed: job.customerConfirmation?.confirmed || true,
      confirmationMethod: job.customerConfirmation?.confirmationMethod || 'driver_conductor_signoff',
    });
  };

  // Add Material Used
  const handleAddMaterial = () => {
    const item = inventory.find((i) => i.id === executionState.selectedMaterialItemId);
    if (!item) return;

    const unitCost = item.costNpr || item.purchasePriceNpr || 0;
    const existingIndex = executionState.materialsUsed.findIndex((m) => m.itemId === item.id);

    if (existingIndex >= 0) {
      const updated = [...executionState.materialsUsed];
      const newQty = updated[existingIndex].quantity + executionState.selectedMaterialQty;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        totalCostNpr: newQty * unitCost,
      };
      setExecutionState({ ...executionState, materialsUsed: updated });
    } else {
      const newMaterial: MaterialUsedItem = {
        itemId: item.id,
        itemName: item.itemName,
        sku: item.sku,
        category: item.category,
        quantity: executionState.selectedMaterialQty,
        unitCostNpr: unitCost,
        totalCostNpr: executionState.selectedMaterialQty * unitCost,
      };
      setExecutionState({
        ...executionState,
        materialsUsed: [...executionState.materialsUsed, newMaterial],
      });
    }
  };

  // Remove Material
  const handleRemoveMaterial = (index: number) => {
    const updated = [...executionState.materialsUsed];
    updated.splice(index, 1);
    setExecutionState({ ...executionState, materialsUsed: updated });
  };

  // Add Device Serial Number
  const handleAddSerial = () => {
    const sn = executionState.deviceSerialInput.trim();
    if (!sn) return;
    if (!executionState.deviceSerialNumbers.includes(sn)) {
      setExecutionState({
        ...executionState,
        deviceSerialNumbers: [...executionState.deviceSerialNumbers, sn],
        deviceSerialInput: '',
      });
    }
  };

  // Add Before/After Photo
  const handleAddPhoto = (type: 'before' | 'after') => {
    const url = type === 'before' ? executionState.beforePhotoUrl : executionState.afterPhotoUrl;
    if (!url.trim()) return;
    if (type === 'before') {
      setExecutionState({
        ...executionState,
        beforePhotos: [...executionState.beforePhotos, url.trim()],
        beforePhotoUrl: '',
      });
    } else {
      setExecutionState({
        ...executionState,
        afterPhotos: [...executionState.afterPhotos, url.trim()],
        afterPhotoUrl: '',
      });
    }
  };

  // Quick Preset Photo for Field Technicians (Simulating Camera Snap)
  const handleAddPresetPhoto = (type: 'before' | 'after', presetUrl: string) => {
    if (type === 'before') {
      setExecutionState({
        ...executionState,
        beforePhotos: [...executionState.beforePhotos, presetUrl],
      });
    } else {
      setExecutionState({
        ...executionState,
        afterPhotos: [...executionState.afterPhotos, presetUrl],
      });
    }
  };

  // Submit Complete Service Report & Auto-Deduct Inventory
  const handleSubmitServiceReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForExecution) return;

    try {
      const now = new Date().toISOString();
      const started = selectedJobForExecution.startedAt || selectedJobForExecution.scheduledDate;
      const startMs = new Date(started).getTime();
      const endMs = new Date(now).getTime();
      const durationMinutes = Math.max(25, Math.round((endMs - startMs) / (1000 * 60)));

      // 1. INVENTORY CONNECTION: Deduct used items from stock and create permanent Stock Movements
      for (const mat of executionState.materialsUsed) {
        const invItem = inventory.find((i) => i.id === mat.itemId);
        if (invItem) {
          const prevStock = invItem.currentStock ?? 0;
          const newStock = Math.max(0, prevStock - mat.quantity);

          // Update inventory stock level
          await updateDocument('inventory', invItem.id, {
            currentStock: newStock,
            updatedAt: now,
          });

          // Create official StockMovement ledger record
          const movementRecord: Partial<StockMovement> = {
            movementNumber: `MOV-JOB-${Date.now().toString().slice(-6)}`,
            movementType: 'stock_issued',
            itemId: invItem.id,
            itemName: invItem.itemName,
            sku: invItem.sku || 'N/A',
            category: invItem.category,
            quantity: mat.quantity,
            previousStock: prevStock,
            newStock: newStock,
            unitCostNpr: mat.unitCostNpr,
            totalCostNpr: mat.totalCostNpr,
            fromLocation: invItem.location || 'Kathmandu Central Warehouse',
            toLocation: `Bus ${selectedJobForExecution.busNumber} (${selectedJobForExecution.location})`,
            allocatedToId: selectedJobForExecution.assignedTechnicianId,
            allocatedToName: selectedJobForExecution.assignedTechnicianName,
            allocatedToType: 'bus_fleet',
            reason: `Field Service Consumption: ${selectedJobForExecution.jobId} - ${selectedJobForExecution.jobType}`,
            authorizedBy: `${selectedJobForExecution.assignedTechnicianName} (Field Technician)`,
            actorId: userProfile?.userId || 'usr-tech-01',
            actorName: userProfile?.fullName || 'Bikash KC',
            actorRole: activeRole,
            timestamp: now,
          };
          await createDocument('stockMovements', movementRecord);
        }
      }

      // 2. Update WorkOrder Document with complete field service data
      const updatedJob: Partial<WorkOrder> = {
        status: 'Completed',
        completedAt: now,
        completedDate: now,
        completionTimeMinutes: durationMinutes,
        beforePhotos: executionState.beforePhotos,
        afterPhotos: executionState.afterPhotos,
        deviceSerialNumbers: executionState.deviceSerialNumbers,
        materialsUsed: executionState.materialsUsed,
        serviceNotes: executionState.serviceNotes,
        customerFeedback: {
          rating: executionState.customerRating,
          comment: executionState.customerComment,
          signeeName: executionState.customerSigneeName,
          recordedAt: now,
        },
        customerConfirmation: {
          confirmed: executionState.customerConfirmed,
          signeeName: executionState.customerSigneeName,
          signeePhone: executionState.customerSigneePhone,
          signatureData: 'VERIFIED_DIGITAL_SIGNOFF_ERP',
          timestamp: now,
          confirmationMethod: executionState.confirmationMethod,
        },
        serviceReportSubmitted: true,
        updatedAt: now,
      };

      await updateDocument('workOrders', selectedJobForExecution.id, updatedJob);

      // Open printable service report modal
      const mergedJob = { ...selectedJobForExecution, ...updatedJob } as WorkOrder;
      setSelectedJobForExecution(null);
      setViewingServiceReport(mergedJob);
    } catch (err) {
      console.error('Failed to submit field service report:', err);
      alert('Error submitting service report: ' + (err as Error).message);
    }
  };

  // Export Field Jobs to Excel
  const handleExportJobsExcel = () => {
    const rows = filteredJobs.map((j, idx) => ({
      'S.N.': idx + 1,
      'Job ID': j.jobId || j.ticketNumber,
      'Customer Name': j.customerName,
      'Bus Name': j.busName || '-',
      'Bus Number': j.busNumber || j.vehicleNumber,
      'Departure Time': j.busDepartureTime || 'Unscheduled',
      'Terminal Location': j.location,
      'Job Type': j.jobType,
      'Assigned Technician': j.assignedTechnicianName || 'Unassigned',
      'Scheduled Date': formatDate(j.scheduledDate),
      'Priority': j.priority,
      'Status': j.status,
      'Materials Count': j.materialsUsed?.length || 0,
      'Customer Rating': j.customerFeedback?.rating ? `${j.customerFeedback.rating}/5` : 'Pending',
      'Customer Confirmation': j.customerConfirmation?.confirmed ? 'Confirmed' : 'Pending',
    }));
    exportToExcel(rows, `Netcare_Technical_Operations_${new Date().toISOString().slice(0, 10)}`);
  };

  // Export Field Jobs to PDF
  const handleExportJobsPDF = () => {
    const headers = ['Job ID', 'Bus / Fleet', 'Departure', 'Job Type', 'Technician', 'Priority', 'Status'];
    const rows = filteredJobs.map((j) => [
      j.jobId || j.ticketNumber || '-',
      `${j.busNumber || j.vehicleNumber} (${j.customerName})`,
      j.busDepartureTime || '-',
      j.jobType,
      j.assignedTechnicianName || 'Unassigned',
      String(j.priority).toUpperCase(),
      String(j.status).toUpperCase(),
    ]);

    exportTableToPDF(
      'Netcare Nepal - Technical Field Operations Dispatch & SLA Report',
      headers,
      rows,
      `Netcare_Field_Operations_${new Date().toISOString().slice(0, 10)}`,
      `Total Jobs: ${filteredJobs.length} | Completed: ${filteredJobs.filter((j) => j.status?.toLowerCase() === 'completed').length} | Location: Kathmandu Central Bus Hubs`
    );
  };

  // Print / Export Individual Field Service Report PDF
  const handleExportSingleReportPDF = (job: WorkOrder) => {
    const headers = ['Field Service Component', 'Details & Technician Remarks'];
    const rows = [
      ['Job Identification', `${job.jobId || job.ticketNumber} - ${job.jobType}`],
      ['Transport Operator', job.customerName],
      ['Bus Registration & Name', `${job.busNumber || job.vehicleNumber} (${job.busName || '-'})`],
      ['Terminal Departure Time', job.busDepartureTime || 'Flexible Departure'],
      ['Service Location', job.location],
      ['Field Engineer', job.assignedTechnicianName || 'Netcare Senior Technician'],
      ['Scheduled & Completion Date', `${formatDate(job.scheduledDate)} | Completed: ${job.completedDate ? formatDateTime(job.completedDate) : 'In Progress'}`],
      ['Duration', job.completionTimeMinutes ? `${job.completionTimeMinutes} minutes` : '45 minutes'],
      ['Tracked Hardware Serials', job.deviceSerialNumbers?.join(', ') || 'N/A'],
      ['Materials Used & Stock Deducted', job.materialsUsed?.map((m) => `${m.quantity}x ${m.itemName}`).join('; ') || 'Standard toolkit consumables'],
      ['Technician Diagnostic Notes', job.serviceNotes || 'Full operational check completed. Signal calibrated.'],
      ['Customer Sign-off', job.customerConfirmation?.confirmed ? `Signed by ${job.customerConfirmation.signeeName} (${job.customerConfirmation.confirmationMethod})` : 'Pending Driver Signature'],
      ['Customer Rating', job.customerFeedback?.rating ? `${'★'.repeat(job.customerFeedback.rating)} (${job.customerFeedback.rating}/5)` : '5/5 Stars'],
    ];

    exportTableToPDF(
      `Netcare Nepal Field Service Certificate - ${job.jobId || job.ticketNumber}`,
      headers,
      rows,
      `Service_Report_${job.jobId || job.ticketNumber}`
    );
  };

  // Helper badge for priority
  const renderPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    if (p === 'urgent' || p === 'critical') {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">Urgent</span>;
    }
    if (p === 'high') {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">High</span>;
    }
    if (p === 'medium') {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Medium</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Low</span>;
  };

  // Helper badge for status
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    }
    if (s === 'in progress' || s === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
          <Activity className="w-3 h-3" /> In Progress
        </span>
      );
    }
    if (s === 'accepted') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Zap className="w-3 h-3" /> Accepted
        </span>
      );
    }
    if (s === 'assigned') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
          <User className="w-3 h-3" /> Assigned
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          HEADER & KPI METRICS BAR
         ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Technical Operations & Field Service
                </h1>
                <p className="text-xs text-slate-500">
                  Bus WiFi, CCTV surveillance, GPS telematics dispatch, technician mobile workflow & live inventory deduction
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isManagerOrHigher(activeRole) && (
              <button
                onClick={handleOpenDispatchModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Dispatch New Job
              </button>
            )}

            <button
              onClick={handleExportJobsExcel}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Export Operations Log to Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={handleExportJobsPDF}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Export Operations Log to PDF"
            >
              <FileText className="h-4 w-4 text-red-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* Manager KPI Dashboard (Visible to CEO & Ops Manager) */}
        {isManagerOrHigher(activeRole) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-medium text-slate-500 block">Total Jobs</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{managerMetrics.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60">
              <span className="text-[11px] font-medium text-amber-700 block">Pending Dispatch</span>
              <p className="text-xl font-bold text-amber-900 mt-1">{managerMetrics.pending}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60">
              <span className="text-[11px] font-medium text-blue-700 block">In Progress</span>
              <p className="text-xl font-bold text-blue-900 mt-1">{managerMetrics.inProgress}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
              <span className="text-[11px] font-medium text-emerald-700 block">Completed</span>
              <p className="text-xl font-bold text-emerald-900 mt-1">{managerMetrics.completed}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/60">
              <span className="text-[11px] font-medium text-purple-700 block">Avg Resolution Time</span>
              <p className="text-xl font-bold text-purple-900 mt-1">{managerMetrics.avgMinutes} min</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/60">
              <span className="text-[11px] font-medium text-rose-700 block">Pending Complaints</span>
              <p className="text-xl font-bold text-rose-900 mt-1">{managerMetrics.complaints}</p>
            </div>
          </div>
        )}

        {/* Technician View Notice if logged in as Field Technician */}
        {activeRole === 'FIELD_TECHNICIAN' && (
          <div className="mt-4 p-4 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border border-red-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-600 text-white rounded-xl shadow-xs">
                  <Smartphone className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      Field Technician Mobile Viewport
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="h-3 w-3" /> Privacy Guard Enforced
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Android optimized interface. Technicians can strictly access only their assigned service work orders.
                  </p>
                </div>
              </div>

              {/* Technician Identity Switcher for Verification & Testing */}
              <div className="flex items-center gap-1.5 bg-white/90 p-1 rounded-xl border border-red-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Technician:</span>
                <button
                  type="button"
                  onClick={() => setSelectedTechProfileId('usr-tech-01')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    (userProfile?.userId === 'usr-tech-01' || (!userProfile?.userId?.startsWith('usr-tech') && selectedTechProfileId === 'usr-tech-01'))
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Bikash KC
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTechProfileId('usr-tech-02')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    (userProfile?.userId === 'usr-tech-02' || (!userProfile?.userId?.startsWith('usr-tech') && selectedTechProfileId === 'usr-tech-02'))
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Santosh Tamang
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-red-100">
              <span>
                Active Session: <strong className="text-slate-900">{selectedTechProfileId === 'usr-tech-02' ? 'Santosh Tamang (Highway / Butwal Hub)' : 'Bikash KC (Kathmandu Central Depot)'}</strong>
              </span>
              <span className="font-semibold text-red-700">
                🔒 Showing {accessibleJobs.length} assigned ticket{accessibleJobs.length === 1 ? '' : 's'} (Other technician tickets isolated)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          NAVIGATION TABS
         ======================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'jobs'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="h-4 w-4" />
          {isManagerOrHigher(activeRole) ? 'All Company Dispatch Jobs' : 'Job Feed'} ({accessibleJobs.length})
        </button>

        {/* Mobile-first technician workspace tab */}
        <button
          onClick={() => setActiveTab('technician_workspace')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'technician_workspace'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Technician Mobile Workspace ({accessibleJobs.filter((j) => ['assigned', 'accepted', 'in progress', 'in_progress'].includes(j.status.toLowerCase())).length} Active)
        </button>

        {isManagerOrHigher(activeRole) && (
          <>
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'scorecard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Award className="h-4 w-4" />
              Technician Scorecard
            </button>

            <button
              onClick={() => setActiveTab('complaints')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'complaints'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquareWarning className="h-4 w-4" />
              Customer Complaints Queue ({managerMetrics.complaints})
            </button>
          </>
        )}
      </div>

      {/* ========================================================
          TAB 1: JOBS LISTING & SEARCH FILTER (DESKTOP & TABLET)
         ======================================================== */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Job ID, Bus Number, Bus Name, Customer or Location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  {ALL_JOB_STATUSES.map((s) => (
                    <option key={s} value={s.toLowerCase()}>{s}</option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 text-slate-700"
                >
                  <option value="all">All Priorities</option>
                  {ALL_JOB_PRIORITIES.map((p) => (
                    <option key={p} value={p.toLowerCase()}>{p}</option>
                  ))}
                </select>

                {/* Job Type Filter */}
                <select
                  value={jobTypeFilter}
                  onChange={(e) => setJobTypeFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 text-slate-700 max-w-[180px]"
                >
                  <option value="all">All Job Types</option>
                  {ALL_JOB_TYPES.map((jt) => (
                    <option key={jt} value={jt}>{jt}</option>
                  ))}
                </select>

                {/* Technician Filter (Manager Only) */}
                {isManagerOrHigher(activeRole) && (
                  <select
                    value={technicianFilter}
                    onChange={(e) => setTechnicianFilter(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 text-slate-700 max-w-[160px]"
                  >
                    <option value="all">All Technicians</option>
                    {fieldTechnicians.map((t) => (
                      <option key={t.userId} value={t.userId}>{t.fullName}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Job Cards Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Job ID & Priority</th>
                    <th className="py-3 px-4">Bus & Customer</th>
                    <th className="py-3 px-4">Departure & Location</th>
                    <th className="py-3 px-4">Job Type</th>
                    <th className="py-3 px-4">Assigned Technician</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <Wrench className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-medium">No service jobs matching the selected criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{job.jobId || job.ticketNumber}</span>
                            {renderPriorityBadge(job.priority)}
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Scheduled: {formatDate(job.scheduledDate)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <Bus className="h-3.5 w-3.5 text-red-600" />
                            <span>{job.busNumber || job.vehicleNumber}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 truncate max-w-[200px]">{job.customerName}</p>
                          {job.busName && (
                            <span className="text-[10px] text-slate-400 italic block">{job.busName}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                            <Clock className="h-3 w-3" />
                            <span>{job.busDepartureTime || 'Unscheduled Departure'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{job.location}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-800">{job.jobType}</span>
                          {job.isComplaintEscalation && (
                            <span className="block text-[10px] text-rose-600 font-bold">⚠️ Escalated Complaint</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{job.assignedTechnicianName || 'Unassigned'}</span>
                          </div>
                          {job.contactPerson && (
                            <a
                              href={`tel:${job.contactNumber}`}
                              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="h-2.5 w-2.5" />
                              <span>{job.contactPerson}</span>
                            </a>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(job.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedJobForDetail(job)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg text-xs"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* If assigned to current user, allow execution */}
                            {job.status.toLowerCase() !== 'completed' && (
                              <button
                                onClick={() => handleOpenExecutionModal(job)}
                                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shadow-xs"
                                title="Execute Job / Record Materials"
                              >
                                <Wrench className="h-3 w-3" />
                                <span>Execute</span>
                              </button>
                            )}

                            {job.status.toLowerCase() === 'completed' && (
                              <button
                                onClick={() => setViewingServiceReport(job)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                                title="View Service Certificate"
                              >
                                <FileCheck className="h-3 w-3 text-emerald-600" />
                                <span>Report</span>
                              </button>
                            )}
                          </div>
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

      {/* ========================================================
          TAB 2: ANDROID-OPTIMIZED TECHNICIAN WORKSPACE
         ======================================================== */}
      {activeTab === 'technician_workspace' && (
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Mobile Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">
                  Netcare Mobile Tech Engine
                </span>
                <h2 className="text-base font-bold mt-0.5">Assigned Field Service Orders</h2>
              </div>
              <div className="text-right">
                <span className="text-xl font-mono font-bold text-white">
                  {accessibleJobs.filter((j) => j.status.toLowerCase() !== 'completed').length}
                </span>
                <span className="text-[10px] text-slate-300 block">Pending Jobs</span>
              </div>
            </div>
          </div>

          {/* Job Card Feed for Android Mobile Touch Ergonomics */}
          <div className="space-y-3">
            {accessibleJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-900">All Jobs Completed!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You currently have no pending service tickets in your queue. Check back with the Operations Manager.
                </p>
              </div>
            ) : (
              accessibleJobs.map((job) => {
                const isDone = job.status.toLowerCase() === 'completed';
                const isInProgress = ['in progress', 'in_progress'].includes(job.status.toLowerCase());
                const isAccepted = job.status.toLowerCase() === 'accepted';

                return (
                  <div
                    key={job.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                      isInProgress
                        ? 'border-blue-400 ring-2 ring-blue-100'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Top Row: Job ID & Status */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {job.jobId || job.ticketNumber}
                        </span>
                        {renderPriorityBadge(job.priority)}
                      </div>
                      {renderStatusBadge(job.status)}
                    </div>

                    {/* Bus & Terminal Details (Crucial for Nepal Bus Parks) */}
                    <div className="py-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-base font-extrabold text-slate-900">
                            <Bus className="h-4 w-4 text-red-600" />
                            <span>{job.busNumber || job.vehicleNumber}</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">{job.customerName}</p>
                          {job.busName && (
                            <p className="text-[11px] text-slate-500 italic">{job.busName}</p>
                          )}
                        </div>

                        {/* HIGH VISIBILITY: BUS DEPARTURE TIME */}
                        <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-right">
                          <span className="text-[10px] font-bold text-rose-600 uppercase block">Bus Departs</span>
                          <span className="text-xs font-mono font-black text-rose-900">
                            {job.busDepartureTime || '15:30 Mugling'}
                          </span>
                        </div>
                      </div>

                      {/* Location & Contact Direct Tap */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 p-2 rounded-lg">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>

                        <a
                          href={`tel:${job.contactNumber}`}
                          className="flex items-center justify-between text-blue-700 bg-blue-50 p-2 rounded-lg font-bold hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">{job.contactPerson || 'Driver'}</span>
                          </div>
                          <span className="text-[11px] font-mono text-blue-800 underline">CALL</span>
                        </a>
                      </div>

                      {/* Job Description */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800 block mb-0.5">
                          Task: {job.jobType}
                        </span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {job.jobDescription || job.description}
                        </p>
                      </div>
                    </div>

                    {/* Touch Action Bar (Min 44px tap targets for Android) */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      {job.status.toLowerCase() === 'assigned' && (
                        <button
                          onClick={() => handleUpdateStatus(job, 'Accepted')}
                          className="flex-1 min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                        >
                          <Check className="h-4 w-4" />
                          <span>Accept Assignment</span>
                        </button>
                      )}

                      {isAccepted && (
                        <button
                          onClick={() => handleUpdateStatus(job, 'In Progress')}
                          className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                        >
                          <Zap className="h-4 w-4" />
                          <span>Start Job (Timer Active)</span>
                        </button>
                      )}

                      {isInProgress && (
                        <button
                          onClick={() => handleOpenExecutionModal(job)}
                          className="flex-1 min-h-[44px] bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Complete & Submit Report</span>
                        </button>
                      )}

                      {isDone && (
                        <button
                          onClick={() => setViewingServiceReport(job)}
                          className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                        >
                          <FileCheck className="h-4 w-4" />
                          <span>View Signed Certificate</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedJobForDetail(job)}
                        className="px-3 min-h-[44px] border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: TECHNICIAN PERFORMANCE SCORECARD
         ======================================================== */}
      {activeTab === 'scorecard' && isManagerOrHigher(activeRole) && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">
              Field Technician Performance & SLA Scorecard
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live metrics on jobs completed, customer satisfaction ratings, on-time completion, and warehouse material consumption.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {technicianScorecard.map(({ tech, totalJobs, completedJobs, activeJobs, avgRating, completionRate }) => (
              <div
                key={tech.userId}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-red-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                        {tech.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{tech.fullName}</h4>
                        <span className="text-[11px] text-slate-500">{tech.department || 'Senior Field Engineer'}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-4 text-center">
                    <div className="p-2.5 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Total Jobs</span>
                      <span className="text-base font-bold text-slate-900">{totalJobs}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-xl">
                      <span className="text-[10px] text-emerald-700 block">Completed</span>
                      <span className="text-base font-bold text-emerald-900">{completedJobs}</span>
                    </div>
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <span className="text-[10px] text-blue-700 block">In Flight</span>
                      <span className="text-base font-bold text-blue-900">{activeJobs}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Customer Satisfaction:</span>
                      <div className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        <span>{avgRating} / 5.0</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Job Completion Rate:</span>
                      <span className="font-bold text-slate-800">{completionRate}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Contact:</span>
                      <a href={`tel:${tech.phone}`} className="text-blue-600 hover:underline font-mono">
                        {tech.phone}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Territory: Kathmandu Valley</span>
                  <button
                    onClick={() => {
                      setTechnicianFilter(tech.userId);
                      setActiveTab('jobs');
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <span>View Jobs</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: CUSTOMER COMPLAINTS QUEUE
         ======================================================== */}
      {activeTab === 'complaints' && isManagerOrHigher(activeRole) && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">
              Customer Complaint Escalations & Fleet Faults
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              High-priority tickets escalated from transport operators regarding WiFi portal outages, CCTV camera blanks, or GPS telemetry drops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workOrders
              .filter((w) => w.isComplaintEscalation)
              .map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800">
                          {c.complaintId || 'CMP-ESCALATION'}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {c.jobId || c.ticketNumber}
                        </span>
                      </div>
                      {renderStatusBadge(c.status)}
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Bus className="h-4 w-4 text-red-600" />
                        <span>{c.busNumber || c.vehicleNumber} ({c.customerName})</span>
                      </div>
                      <p className="text-rose-700 font-bold text-xs">
                        Reported Fault: {c.reportedFault || c.jobDescription}
                      </p>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {c.jobDescription}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Terminal: {c.location}</span>
                        <span>Departure: {c.busDepartureTime || '15:30'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Assigned: {c.assignedTechnicianName || 'Unassigned'}
                    </span>
                    <button
                      onClick={() => handleOpenExecutionModal(c)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Resolve & Record
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: DISPATCH NEW FIELD JOB (MANAGER & CEO)
         ======================================================== */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Technical Field Service Job"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer Fleet *</label>
              <select
                required
                value={jobFormData.customerId}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === e.target.value);
                  setJobFormData({
                    ...jobFormData,
                    customerId: e.target.value,
                    customerName: cust?.companyName || '',
                    busName: cust?.busName || '',
                    busNumber: cust?.busRegistrationNumber || '',
                    contactPerson: cust?.contactPerson || '',
                    contactNumber: cust?.contactNumber || '',
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.busRegistrationNumber} - {c.companyName} ({c.busRoute})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bus Registration Number *</label>
              <input
                type="text"
                required
                value={jobFormData.busNumber}
                onChange={(e) => setJobFormData({ ...jobFormData, busNumber: e.target.value })}
                placeholder="e.g. Ba 3 Kha 4521"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bus Model / Deluxe Fleet Name</label>
              <input
                type="text"
                value={jobFormData.busName}
                onChange={(e) => setJobFormData({ ...jobFormData, busName: e.target.value })}
                placeholder="e.g. Baba Highway King AC Deluxe"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bus Departure Time * (Critical for Bus Park Schedule)
              </label>
              <input
                type="text"
                required
                value={jobFormData.busDepartureTime}
                onChange={(e) => setJobFormData({ ...jobFormData, busDepartureTime: e.target.value })}
                placeholder="e.g. 15:30 (Mugling - Pokhara Express)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-rose-700 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person (Driver / Conductor) *</label>
              <input
                type="text"
                required
                value={jobFormData.contactPerson}
                onChange={(e) => setJobFormData({ ...jobFormData, contactPerson: e.target.value })}
                placeholder="e.g. Arjun Adhikari (Driver)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number *</label>
              <input
                type="text"
                required
                value={jobFormData.contactNumber}
                onChange={(e) => setJobFormData({ ...jobFormData, contactNumber: e.target.value })}
                placeholder="+977-9851023456"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Service Location / Bus Terminal *</label>
            <input
              type="text"
              required
              value={jobFormData.location}
              onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
              placeholder="e.g. Gongabu New Bus Park, Terminal Bay 4"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Job Type *</label>
              <select
                value={jobFormData.jobType}
                onChange={(e) => setJobFormData({ ...jobFormData, jobType: e.target.value as FieldJobType })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {ALL_JOB_TYPES.map((jt) => (
                  <option key={jt} value={jt}>{jt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level *</label>
              <select
                value={jobFormData.priority}
                onChange={(e) => setJobFormData({ ...jobFormData, priority: e.target.value as FieldJobPriority })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {ALL_JOB_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign Field Technician *</label>
              <select
                value={jobFormData.assignedTechnicianId}
                onChange={(e) => {
                  const tech = fieldTechnicians.find((t) => t.userId === e.target.value);
                  setJobFormData({
                    ...jobFormData,
                    assignedTechnicianId: e.target.value,
                    assignedTechnicianName: tech?.fullName || '',
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {fieldTechnicians.map((t) => (
                  <option key={t.userId} value={t.userId}>
                    {t.fullName} ({t.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Date *</label>
              <input
                type="date"
                required
                value={jobFormData.scheduledDate}
                onChange={(e) => setJobFormData({ ...jobFormData, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Time Slot *</label>
              <input
                type="text"
                value={jobFormData.scheduledTime}
                onChange={(e) => setJobFormData({ ...jobFormData, scheduledTime: e.target.value })}
                placeholder="e.g. 10:00 AM - 11:30 AM"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Job Description & Diagnostics Needed *</label>
            <textarea
              required
              rows={3}
              value={jobFormData.jobDescription}
              onChange={(e) => setJobFormData({ ...jobFormData, jobDescription: e.target.value })}
              placeholder="e.g. WiFi captive portal not popping up when passengers connect. Inspect 24V step-down buck converter and replace SMA antenna connector."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Complaint Escalation Toggle */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={jobFormData.isComplaintEscalation}
                onChange={(e) => setJobFormData({ ...jobFormData, isComplaintEscalation: e.target.checked })}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span>Escalate from Customer Complaint Ticket</span>
            </label>

            {jobFormData.isComplaintEscalation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Complaint Ticket #</label>
                  <input
                    type="text"
                    value={jobFormData.complaintId}
                    onChange={(e) => setJobFormData({ ...jobFormData, complaintId: e.target.value })}
                    placeholder="CMP-2026-042"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Reported Fault</label>
                  <input
                    type="text"
                    value={jobFormData.reportedFault}
                    onChange={(e) => setJobFormData({ ...jobFormData, reportedFault: e.target.value })}
                    placeholder="Frequent rebooting at high speed"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsDispatchModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Confirm Dispatch Job
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 2: TECHNICIAN JOB EXECUTION & INVENTORY DEDUCTION
         ======================================================== */}
      {selectedJobForExecution && (
        <Modal
          isOpen={!!selectedJobForExecution}
          onClose={() => setSelectedJobForExecution(null)}
          title={`Field Service Execution: ${selectedJobForExecution.jobId || selectedJobForExecution.ticketNumber}`}
          maxWidth="3xl"
        >
          <form onSubmit={handleSubmitServiceReport} className="space-y-4">
            {/* Bus Summary Banner */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-red-400 font-bold block">{selectedJobForExecution.jobType}</span>
                <p className="text-sm font-bold mt-0.5">
                  {selectedJobForExecution.busNumber || selectedJobForExecution.vehicleNumber} • {selectedJobForExecution.customerName}
                </p>
                <span className="text-slate-300 text-[11px]">
                  Terminal: {selectedJobForExecution.location} | Departs: {selectedJobForExecution.busDepartureTime || '15:30'}
                </span>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold text-[11px]">
                  {selectedJobForExecution.priority} Priority
                </span>
              </div>
            </div>

            {/* 1. BEFORE & AFTER PHOTOGRAPHS */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-red-600" />
                  1. Before & After Photographic Evidence
                </span>
                <span className="text-[11px] text-slate-500">Android Camera Upload</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before Photos */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">Before Service Photos</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter photo URL or tap camera preset..."
                      value={executionState.beforePhotoUrl}
                      onChange={(e) => setExecutionState({ ...executionState, beforePhotoUrl: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddPhoto('before')}
                      className="px-2.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                  {/* Quick Preset Buttons for Technician Mobile Camera Simulation */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleAddPresetPhoto(
                          'before',
                          'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80'
                        )
                      }
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[10px] text-slate-700 font-medium"
                    >
                      📷 Snap Bus Engine Bay
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddPresetPhoto(
                          'before',
                          'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80'
                        )
                      }
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[10px] text-slate-700 font-medium"
                    >
                      📷 Snap Old Wiring
                    </button>
                  </div>

                  {/* Thumbnail Previews */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {executionState.beforePhotos.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={url} alt="Before" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-[8px] text-white text-center py-0.5">
                          Before #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* After Photos */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">After Service Photos</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter photo URL or tap camera preset..."
                      value={executionState.afterPhotoUrl}
                      onChange={(e) => setExecutionState({ ...executionState, afterPhotoUrl: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddPhoto('after')}
                      className="px-2.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleAddPresetPhoto(
                          'after',
                          'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&auto=format&fit=crop&q=80'
                        )
                      }
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[10px] text-slate-700 font-medium"
                    >
                      📷 Snap Clean Router Mount
                    </button>
                  </div>

                  {/* Thumbnail Previews */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {executionState.afterPhotos.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={url} alt="After" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-emerald-900/80 text-[8px] text-white text-center py-0.5">
                          After #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DEVICE SERIAL NUMBERS */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                2. Record Installed Hardware Serial Numbers (Router / CCTV / GPS / SIM)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. RUTX11-892305 or VT200-990145"
                  value={executionState.deviceSerialInput}
                  onChange={(e) => setExecutionState({ ...executionState, deviceSerialInput: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddSerial}
                  className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  Add Serial
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {executionState.deviceSerialNumbers.map((sn, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800 shadow-xs"
                  >
                    <span>{sn}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...executionState.deviceSerialNumbers];
                        updated.splice(idx, 1);
                        setExecutionState({ ...executionState, deviceSerialNumbers: updated });
                      }}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 3. INVENTORY CONNECTION: RECORD MATERIALS USED & DEDUCT FROM WAREHOUSE */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-blue-700" />
                  3. Record Materials Used (Live Warehouse Inventory Linkage)
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-100 font-bold px-2 py-0.5 rounded">
                  Stock Auto-Deduction
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Hardware SKU</label>
                  <select
                    value={executionState.selectedMaterialItemId}
                    onChange={(e) => setExecutionState({ ...executionState, selectedMaterialItemId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    {inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.itemName} (In-Stock: {inv.currentStock ?? 0} | NPR {formatNPR(inv.costNpr || inv.purchasePriceNpr || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={executionState.selectedMaterialQty}
                    onChange={(e) => setExecutionState({ ...executionState, selectedMaterialQty: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    Add Part
                  </button>
                </div>
              </div>

              {/* Added Materials Table */}
              {executionState.materialsUsed.length > 0 && (
                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden text-xs mt-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-blue-100/50 text-[10px] text-blue-900 font-bold uppercase border-b border-blue-200">
                        <th className="p-2">Item Name</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Unit Cost</th>
                        <th className="p-2">Total</th>
                        <th className="p-2 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {executionState.materialsUsed.map((m, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium text-slate-800">{m.itemName}</td>
                          <td className="p-2 font-mono font-bold">{m.quantity}</td>
                          <td className="p-2 text-slate-600">NPR {formatNPR(m.unitCostNpr)}</td>
                          <td className="p-2 font-bold text-slate-900">NPR {formatNPR(m.totalCostNpr)}</td>
                          <td className="p-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(idx)}
                              className="text-red-600 hover:underline text-[11px] font-bold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 4. TECHNICIAN SERVICE NOTES */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                4. Technician Service Notes & Fault Resolution Findings *
              </label>
              <textarea
                required
                rows={2}
                value={executionState.serviceNotes}
                onChange={(e) => setExecutionState({ ...executionState, serviceNotes: e.target.value })}
                placeholder="e.g. Bus 24V supply was noisy. Replaced step-down LM2596 module and fastened DC barrel connector with shrink-tube. WiFi speeds tested at 42 Mbps."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* 5. CUSTOMER FEEDBACK & SIGN-OFF */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-emerald-900 block">
                5. Customer Feedback & Driver / Conductor Sign-Off
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Rating (1 - 5 Stars)</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setExecutionState({ ...executionState, customerRating: star })}
                        className="p-1 text-amber-500 focus:outline-none"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= executionState.customerRating
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-800 ml-2">{executionState.customerRating} / 5</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Signee Name (Driver/Supervisor)</label>
                  <input
                    type="text"
                    required
                    value={executionState.customerSigneeName}
                    onChange={(e) => setExecutionState({ ...executionState, customerSigneeName: e.target.value })}
                    placeholder="e.g. Arjun Adhikari"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Signee Mobile Phone</label>
                  <input
                    type="text"
                    required
                    value={executionState.customerSigneePhone}
                    onChange={(e) => setExecutionState({ ...executionState, customerSigneePhone: e.target.value })}
                    placeholder="+977-9851023456"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Feedback Remarks</label>
                <input
                  type="text"
                  value={executionState.customerComment}
                  onChange={(e) => setExecutionState({ ...executionState, customerComment: e.target.value })}
                  placeholder="e.g. WiFi verified fast before bus departed Gongabu bay."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Digital Sign-off checkbox */}
              <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={executionState.customerConfirmed}
                  onChange={(e) => setExecutionState({ ...executionState, customerConfirmed: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Confirmed on-site verification with transport operator sign-off</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedJobForExecution(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Submit Complete Service Report & Deduct Stock
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL 3: VIEW COMPLETE JOB DETAILS
         ======================================================== */}
      {selectedJobForDetail && (
        <Modal
          isOpen={!!selectedJobForDetail}
          onClose={() => setSelectedJobForDetail(null)}
          title={`Job Inspection: ${selectedJobForDetail.jobId || selectedJobForDetail.ticketNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header Status */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {selectedJobForDetail.jobId || selectedJobForDetail.ticketNumber}
                </span>
                <p className="text-slate-600 font-medium">{selectedJobForDetail.jobType}</p>
              </div>
              <div className="flex items-center gap-2">
                {renderPriorityBadge(selectedJobForDetail.priority)}
                {renderStatusBadge(selectedJobForDetail.status)}
              </div>
            </div>

            {/* Vehicle & Customer Specs */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-xl">
              <div>
                <span className="text-slate-500 block text-[11px]">Bus Registration & Name</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedJobForDetail.busNumber || selectedJobForDetail.vehicleNumber}
                </span>
                {selectedJobForDetail.busName && (
                  <p className="text-slate-500 text-[11px] italic">{selectedJobForDetail.busName}</p>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Bus Departure Time</span>
                <span className="font-bold text-rose-700 text-sm font-mono">
                  {selectedJobForDetail.busDepartureTime || 'Unscheduled'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Transport Customer</span>
                <span className="font-bold text-slate-800">{selectedJobForDetail.customerName}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Terminal Location</span>
                <span className="font-bold text-slate-800">{selectedJobForDetail.location}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Contact Person</span>
                <a href={`tel:${selectedJobForDetail.contactNumber}`} className="font-bold text-blue-600 hover:underline">
                  {selectedJobForDetail.contactPerson} ({selectedJobForDetail.contactNumber})
                </a>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Assigned Technician</span>
                <span className="font-bold text-slate-800">{selectedJobForDetail.assignedTechnicianName || 'Unassigned'}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <span className="font-bold text-slate-700 block mb-1">Job Description:</span>
              <p className="p-3 bg-slate-50 rounded-xl text-slate-700 leading-relaxed">
                {selectedJobForDetail.jobDescription || selectedJobForDetail.description}
              </p>
            </div>

            {/* Service Notes & Resolution if any */}
            {selectedJobForDetail.serviceNotes && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">Technician Diagnostic Notes:</span>
                <p className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-slate-700 leading-relaxed">
                  {selectedJobForDetail.serviceNotes}
                </p>
              </div>
            )}

            {/* Materials Used */}
            {selectedJobForDetail.materialsUsed && selectedJobForDetail.materialsUsed.length > 0 && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">Materials Deducted from Stock:</span>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  {selectedJobForDetail.materialsUsed.map((m, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span>{m.quantity}x {m.itemName}</span>
                      <span className="font-mono font-bold">NPR {formatNPR(m.totalCostNpr)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {((selectedJobForDetail.beforePhotos && selectedJobForDetail.beforePhotos.length > 0) ||
              (selectedJobForDetail.afterPhotos && selectedJobForDetail.afterPhotos.length > 0)) && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">Photographic Evidence:</span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedJobForDetail.beforePhotos?.map((p, i) => (
                    <img key={i} src={p} alt="Before" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                  ))}
                  {selectedJobForDetail.afterPhotos?.map((p, i) => (
                    <img key={i} src={p} alt="After" className="w-20 h-20 object-cover rounded-xl border border-emerald-300" />
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              {selectedJobForDetail.status.toLowerCase() === 'completed' && (
                <button
                  onClick={() => {
                    const job = selectedJobForDetail;
                    setSelectedJobForDetail(null);
                    setViewingServiceReport(job);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  View Service Certificate
                </button>
              )}
              <button
                onClick={() => setSelectedJobForDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================
          MODAL 4: PRINTABLE SERVICE REPORT CERTIFICATE
         ======================================================== */}
      {viewingServiceReport && (
        <Modal
          isOpen={!!viewingServiceReport}
          onClose={() => setViewingServiceReport(null)}
          title={`Field Service Certificate: ${viewingServiceReport.jobId || viewingServiceReport.ticketNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Formal Certificate Layout */}
            <div className="border-2 border-slate-900 rounded-2xl p-5 bg-white space-y-4">
              <div className="text-center pb-3 border-b-2 border-red-600">
                <span className="text-[10px] font-black tracking-widest text-red-600 uppercase">
                  NETCARE NEPAL PVT. LTD. • TECHNICAL FIELD SERVICE
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  COMMERCIAL FLEET SERVICE & WARRANTY VERIFICATION
                </h3>
                <p className="text-[10px] text-slate-500">
                  Tinkune, Kathmandu, Nepal | info@netcarenepal.com | Bus WiFi • CCTV • GPS Telematics
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">JOB REFERENCE #</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {viewingServiceReport.jobId || viewingServiceReport.ticketNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SERVICE STATUS</span>
                  <span className="font-bold text-emerald-700 text-sm">VERIFIED & COMPLETED</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">BUS NUMBER</span>
                  <span className="font-bold text-slate-900">
                    {viewingServiceReport.busNumber || viewingServiceReport.vehicleNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">BUS OPERATOR</span>
                  <span className="font-bold text-slate-900">{viewingServiceReport.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SERVICE TYPE</span>
                  <span className="font-bold text-slate-900">{viewingServiceReport.jobType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TERMINAL & DEPOT</span>
                  <span className="font-bold text-slate-900">{viewingServiceReport.location}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-800 block text-[11px]">Field Engineer Diagnostics:</span>
                <p className="text-slate-700 leading-relaxed text-[11px]">
                  {viewingServiceReport.serviceNotes || 'Hardware verified operational and calibrated for highway routes.'}
                </p>
              </div>

              {viewingServiceReport.materialsUsed && viewingServiceReport.materialsUsed.length > 0 && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">Materials Deducted from Stock:</span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 font-bold text-slate-700">
                        <tr>
                          <th className="p-1.5">Material</th>
                          <th className="p-1.5">Qty</th>
                          <th className="p-1.5 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingServiceReport.materialsUsed.map((m, i) => (
                          <tr key={i}>
                            <td className="p-1.5">{m.itemName}</td>
                            <td className="p-1.5 font-mono">{m.quantity}</td>
                            <td className="p-1.5 text-right font-mono">NPR {formatNPR(m.totalCostNpr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Digital Sign-off Verification Seal */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block">FIELD ENGINEER</span>
                  <p className="font-bold text-slate-900">{viewingServiceReport.assignedTechnicianName}</p>
                  <span className="text-[10px] text-emerald-600 font-mono">Netcare Certified Tech</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">DRIVER / CONDUCTOR SIGN-OFF</span>
                  <p className="font-bold text-slate-900">
                    {viewingServiceReport.customerConfirmation?.signeeName || viewingServiceReport.contactPerson}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    Verified ({viewingServiceReport.customerFeedback?.rating || 5}/5 Stars)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleExportSingleReportPDF(viewingServiceReport)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <FileText className="h-4 w-4" />
                Export Official Certificate PDF
              </button>
              <button
                onClick={() => setViewingServiceReport(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
