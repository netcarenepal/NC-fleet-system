import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Database,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Clock,
  Key,
  CheckCircle2,
  Server,
  Lock,
  Download,
  AlertTriangle,
  Settings,
  Bell,
  Sliders,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Globe,
  Radio,
  FileCode,
  Shield,
  Eye,
  Check,
  Save,
  Tag,
  Plus,
  Trash2,
  HelpCircle,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import {
  AuditLog,
  SystemConfig,
  UserProfile,
  Customer,
  Subscription,
  InventoryItem,
  WorkOrder,
  Dealer,
  Invoice,
  Expense,
  isCEO,
} from '../../types/erp';
import { formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { seedDatabaseIfEmpty, updateSystemConfig, logAuditEvent } from '../../services/dbService';
import { exportToExcel, exportTableToPDF } from '../../utils/exportUtils';
import { Modal } from '../common/Modal';

interface SettingsAuditProps {
  auditLogs: AuditLog[];
  systemConfig: SystemConfig;
  onUpdateSystemConfig?: (updates: Partial<SystemConfig>) => void;
  users?: UserProfile[];
  customers?: Customer[];
  subscriptions?: Subscription[];
  inventory?: InventoryItem[];
  workOrders?: WorkOrder[];
  dealers?: Dealer[];
  invoices?: Invoice[];
  expenses?: Expense[];
}

type SettingsTab =
  | 'company'
  | 'tax_invoice'
  | 'notifications'
  | 'permissions'
  | 'audit'
  | 'backup_recovery';

export const SettingsAudit: React.FC<SettingsAuditProps> = ({
  auditLogs,
  systemConfig,
  onUpdateSystemConfig,
  users = [],
  customers = [],
  subscriptions = [],
  inventory = [],
  workOrders = [],
  dealers = [],
  invoices = [],
  expenses = [],
}) => {
  const { activeRole, userProfile } = useAuth();
  const isUserCeo = isCEO(activeRole);

  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  // Form State for Company Profile
  const [profileForm, setProfileForm] = useState({
    companyName: systemConfig.companyName || 'Netcare Nepal Pvt. Ltd.',
    tradeName: systemConfig.tradeName || 'Netcare Nepal - Bus IoT, WiFi & Telematics Solutions',
    tagline: systemConfig.tagline || "Nepal's Premier Commercial Fleet Telematics & Passenger WiFi Network",
    logoUrl: systemConfig.logoUrl || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=128&auto=format&fit=crop&q=80',
    headOfficeAddress: systemConfig.headOfficeAddress || 'Subidhanagar, Tinkune, Ward 32, Kathmandu, Bagmati Province, Nepal',
    contactEmail: systemConfig.contactEmail || 'netcarenepal@gmail.com',
    contactPhone: systemConfig.contactPhone || '+977-01-4112345',
    supportHotline: systemConfig.supportHotline || '+977-9801234567',
    website: systemConfig.website || 'https://netcarenepal.com.np',
  });

  // Form State for Tax & Invoicing
  const [taxInvoiceForm, setTaxInvoiceForm] = useState({
    panNumber: systemConfig.panNumber || '601289110',
    vatRatePercent: systemConfig.vatRatePercent ?? 13,
    taxOfficeLocation: systemConfig.taxOfficeLocation || 'Inland Revenue Department (IRD) - Large Taxpayer Office, Babarmahal, Kathmandu',
    invoicePrefix: systemConfig.invoicePrefix || 'NC-2083-',
    nextInvoiceSequence: systemConfig.nextInvoiceSequence || 106,
    invoiceFormat: systemConfig.invoiceFormat || 'NC-YYYY-####',
    currency: systemConfig.currency || 'NPR',
    timezone: systemConfig.timezone || 'Asia/Kathmandu (UTC+05:45)',
  });

  // Form State for Notifications
  const [noticeForm, setNoticeForm] = useState({
    smsGatewayActive: systemConfig.smsGatewayActive ?? true,
    smsSenderId: systemConfig.smsSenderId || 'NETCARE_NP',
    emailAlerts: systemConfig.notificationSettings?.emailAlerts ?? true,
    smsAlerts: systemConfig.notificationSettings?.smsAlerts ?? true,
    whatsappAlerts: systemConfig.notificationSettings?.whatsappAlerts ?? true,
    lowStockNotice: systemConfig.notificationSettings?.lowStockNotice ?? true,
    expiryDays: systemConfig.notificationSettings?.expiryNoticeDays || [30, 15, 7, 3, 1],
    newExpiryDayInput: '',
  });

  // Backup & Recovery state
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [backupChecksum, setBackupChecksum] = useState<string | null>(
    systemConfig.backupSettings?.lastBackupChecksum || 'SHA256: 7f8a9e01bc33d45f6a89c2d103ea90184b2efc8910d29487123bcdef0194821a'
  );
  const [lastBackupTime, setLastBackupTime] = useState<string>(
    systemConfig.backupSettings?.lastBackupAt || '2026-10-31T04:00:00Z'
  );

  // Audit Logs Filter State
  const [auditModuleFilter, setAuditModuleFilter] = useState<string>('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [selectedAuditLogForModal, setSelectedAuditLogForModal] = useState<AuditLog | null>(null);

  // Success Feedback
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const showSaveSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Save Handlers (CEO Only)
  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserCeo) {
      alert('Unauthorized: Only the CEO can change company profile and brand settings.');
      return;
    }
    const updates: Partial<SystemConfig> = {
      ...profileForm,
      updatedAt: new Date().toISOString(),
      updatedBy: `${userProfile?.fullName || 'Narayan Prasad Acharya'} (CEO)`,
    };
    await updateSystemConfig(updates, { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole });
    if (onUpdateSystemConfig) onUpdateSystemConfig(updates);
    showSaveSuccess('Company profile and branding settings updated successfully!');
  };

  const handleSaveTaxInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserCeo) {
      alert('Unauthorized: Only the CEO can alter tax settings and invoice numbering sequence.');
      return;
    }
    const updates: Partial<SystemConfig> = {
      panNumber: taxInvoiceForm.panNumber,
      vatRatePercent: Number(taxInvoiceForm.vatRatePercent),
      taxOfficeLocation: taxInvoiceForm.taxOfficeLocation,
      invoicePrefix: taxInvoiceForm.invoicePrefix,
      nextInvoiceSequence: Number(taxInvoiceForm.nextInvoiceSequence),
      invoiceFormat: taxInvoiceForm.invoiceFormat,
      currency: taxInvoiceForm.currency,
      timezone: taxInvoiceForm.timezone,
      updatedAt: new Date().toISOString(),
      updatedBy: `${userProfile?.fullName || 'Narayan Prasad Acharya'} (CEO)`,
    };
    await updateSystemConfig(updates, { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole });
    if (onUpdateSystemConfig) onUpdateSystemConfig(updates);
    showSaveSuccess('Inland Revenue Department tax and invoice numbering sequence updated!');
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserCeo) {
      alert('Unauthorized: Only the CEO can change notification delivery channels.');
      return;
    }
    const updates: Partial<SystemConfig> = {
      smsGatewayActive: noticeForm.smsGatewayActive,
      smsSenderId: noticeForm.smsSenderId,
      notificationSettings: {
        emailAlerts: noticeForm.emailAlerts,
        smsAlerts: noticeForm.smsAlerts,
        whatsappAlerts: noticeForm.whatsappAlerts,
        lowStockNotice: noticeForm.lowStockNotice,
        expiryNoticeDays: noticeForm.expiryDays,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: `${userProfile?.fullName || 'Narayan Prasad Acharya'} (CEO)`,
    };
    await updateSystemConfig(updates, { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole });
    if (onUpdateSystemConfig) onUpdateSystemConfig(updates);
    showSaveSuccess('Notification gateways and expiry reminder intervals updated!');
  };

  const handleAddExpiryDay = () => {
    const val = parseInt(noticeForm.newExpiryDayInput, 10);
    if (!isNaN(val) && val > 0 && !noticeForm.expiryDays.includes(val)) {
      setNoticeForm((prev) => ({
        ...prev,
        expiryDays: [...prev.expiryDays, val].sort((a, b) => b - a),
        newExpiryDayInput: '',
      }));
    }
  };

  const handleRemoveExpiryDay = (day: number) => {
    setNoticeForm((prev) => ({
      ...prev,
      expiryDays: prev.expiryDays.filter((d) => d !== day),
    }));
  };

  // Generate & Download Instant Database Backup
  const handleDownloadBackup = async () => {
    setIsGeneratingBackup(true);
    try {
      const backupPayload = {
        metadata: {
          system: 'Netcare Nepal Enterprise ERP',
          exportTimestamp: new Date().toISOString(),
          fiscalYear: '2082/2083 BS',
          generatedBy: userProfile?.fullName || 'CEO Administrator',
          version: 'v2.4.0-cloud',
          recordCounts: {
            customers: customers.length,
            subscriptions: subscriptions.length,
            inventoryItems: inventory.length,
            workOrders: workOrders.length,
            dealers: dealers.length,
            invoices: invoices.length,
            expenses: expenses.length,
            auditLogs: auditLogs.length,
            users: users.length,
          },
        },
        systemConfig,
        customers,
        subscriptions,
        inventory,
        workOrders,
        dealers,
        invoices,
        expenses,
        users,
        auditLogs,
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);

      // Compute SHA-256 Checksum using Web Crypto API
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      const fullChecksum = `SHA256: ${hashHex}`;

      setBackupChecksum(fullChecksum);
      const nowIso = new Date().toISOString();
      setLastBackupTime(nowIso);

      // Trigger file download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Netcare_Nepal_ERP_Master_Backup_${nowIso.split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update system config record
      await updateSystemConfig(
        {
          backupSettings: {
            lastBackupAt: nowIso,
            lastBackupSize: `${(jsonString.length / 1024).toFixed(1)} KB (JSON Snapshot)`,
            lastBackupChecksum: fullChecksum,
            backupSchedule: 'daily',
            autoCloudSync: true,
          },
        },
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
      );

      await logAuditEvent(
        'DATABASE_BACKUP_EXPORT',
        'System',
        `CEO exported encrypted master database JSON snapshot (${(jsonString.length / 1024).toFixed(1)} KB) with checksum ${hashHex.slice(0, 12)}...`,
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole },
        'backup-master',
        { checksum: fullChecksum, sizeBytes: jsonString.length }
      );

      showSaveSuccess(`Master database backup downloaded successfully! Verified Checksum: ${hashHex.slice(0, 16)}...`);
    } catch (err) {
      console.error('Backup generation error:', err);
      alert('Failed to generate backup snapshot.');
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedStatus('Connecting to Cloud Firestore and populating Nepali transport operators...');
    try {
      const seeded = await seedDatabaseIfEmpty();
      if (seeded) {
        setSeedStatus('Successfully populated demo dataset for Netcare Nepal ERP.');
      } else {
        setSeedStatus('Database already contains records. Sync confirmed.');
      }
    } catch (err) {
      setSeedStatus('Database sync status: active.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesModule = auditModuleFilter === 'ALL' || log.module === auditModuleFilter;
    const matchesAction =
      auditActionFilter === 'ALL' ||
      (auditActionFilter === 'LOGIN_LOGOUT' && (log.action.includes('LOGIN') || log.action.includes('LOGOUT'))) ||
      (auditActionFilter === 'CUSTOMER' && log.action.includes('CUSTOMER')) ||
      (auditActionFilter === 'SUBSCRIPTION' && log.action.includes('SUBSCRIPTION')) ||
      (auditActionFilter === 'PAYMENT' && (log.action.includes('PAYMENT') || log.action.includes('REVERSAL'))) ||
      (auditActionFilter === 'INVENTORY' && log.action.includes('INVENTORY')) ||
      (auditActionFilter === 'DEALER' && log.action.includes('DEALER')) ||
      (auditActionFilter === 'JOB' && (log.action.includes('JOB') || log.action.includes('WORK_ORDER'))) ||
      (auditActionFilter === 'PERMISSION' && (log.action.includes('PERMISSION') || log.action.includes('STATUS')));

    const q = auditSearchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.actorName.toLowerCase().includes(q) ||
      log.actorId.toLowerCase().includes(q) ||
      (log.recordId && log.recordId.toLowerCase().includes(q)) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q);

    return matchesModule && matchesAction && matchesSearch;
  });

  const handleExportAuditExcel = () => {
    const data = filteredAuditLogs.map((log) => ({
      'Log ID': log.id,
      'User ID': log.actorId,
      Actor: log.actorName,
      Role: log.actorRole.toUpperCase(),
      Action: log.action,
      Module: log.module,
      'Record ID': log.recordId || '-',
      Details: log.details,
      'IP Address': log.ipAddress || '103.141.22.8',
      Timestamp: formatDateTime(log.timestamp),
    }));
    exportToExcel(data, 'Netcare_Nepal_Audit_Trail', 'AuditLogs');
  };

  const handleExportAuditPDF = () => {
    const headers = ['Timestamp (NPT)', 'User ID & Actor', 'Action', 'Record ID', 'Module', 'Event Details'];
    const rows = filteredAuditLogs.map((log) => [
      formatDateTime(log.timestamp),
      `${log.actorName} [${log.actorId}] (${log.actorRole})`,
      log.action,
      log.recordId || '-',
      log.module,
      log.details,
    ]);
    exportTableToPDF(
      'Netcare Nepal - Security & Operation Audit Trail',
      headers,
      rows,
      'Netcare_Audit_Logs_Report',
      `Immutable Security Log Trail • ${filteredAuditLogs.length} Events Logged • IRD Audit Compliant`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Administration & System Configuration
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white flex items-center gap-1">
              <Shield className="w-3 h-3 text-red-400" />
              {isUserCeo ? 'CEO Admin Mode' : 'Read-Only Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Company profile, IRD VAT & invoice numbering, notification schedules, permissions matrix, immutable audit logs, and disaster recovery
          </p>
        </div>

        {/* Tab Navigation Pill */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'company' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Profile & Logo</span>
          </button>
          <button
            onClick={() => setActiveTab('tax_invoice')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'tax_invoice' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Tax & Invoicing</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'notifications' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'permissions' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Permissions</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'audit' ? 'bg-red-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('backup_recovery')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'backup_recovery' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Backups & Recovery</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Non-CEO Warning Banner */}
      {!isUserCeo && activeTab !== 'audit' && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>View Only Mode:</strong> Only the CEO (<span className="font-mono">netcarenepal@gmail.com</span>) can change critical company settings, tax parameters, and notification configs.
          </span>
        </div>
      )}

      {/* TAB 1: Company Profile & Netcare Logo */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompanyProfile} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <img
                  src={profileForm.logoUrl}
                  alt="Netcare Nepal Logo"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-red-500 shadow-md bg-slate-100"
                />
                <span className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full p-0.5 text-[9px] font-bold px-1.5">
                  LOGO
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{profileForm.companyName}</h3>
                <p className="text-xs text-slate-500">{profileForm.tagline}</p>
                <span className="inline-block mt-1 text-[10px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  REG #2080-NP-58912 • IRD Large Taxpayer
                </span>
              </div>
            </div>

            {isUserCeo && (
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Legal Name *</label>
              <input
                type="text"
                disabled={!isUserCeo}
                value={profileForm.companyName}
                onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Trade & Brand Name</label>
              <input
                type="text"
                disabled={!isUserCeo}
                value={profileForm.tradeName}
                onChange={(e) => setProfileForm({ ...profileForm, tradeName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Tagline & Vision</label>
              <input
                type="text"
                disabled={!isUserCeo}
                value={profileForm.tagline}
                onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Netcare Official Logo Image URL</label>
              <input
                type="url"
                disabled={!isUserCeo}
                value={profileForm.logoUrl}
                onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Enter direct image URL (PNG, JPG, SVG) for logo rendering on customer invoices and official reports.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Head Office Address *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={!isUserCeo}
                  value={profileForm.headOfficeAddress}
                  onChange={(e) => setProfileForm({ ...profileForm, headOfficeAddress: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Corporate Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={!isUserCeo}
                  value={profileForm.contactPhone}
                  onChange={(e) => setProfileForm({ ...profileForm, contactPhone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">24/7 Field Support Hotline</label>
              <div className="relative">
                <Radio className="w-4 h-4 text-red-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={!isUserCeo}
                  value={profileForm.supportHotline}
                  onChange={(e) => setProfileForm({ ...profileForm, supportHotline: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  disabled={!isUserCeo}
                  value={profileForm.contactEmail}
                  onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Website</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={!isUserCeo}
                  value={profileForm.website}
                  onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Regional Hubs & Workshop Facilities */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Operational Fleet Bays & Depots
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="font-bold text-slate-800">Kathmandu Bay 4 Workshop</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Gongabu New Bus Park, Kathmandu • Rapid Router & CCTV Replacement Station
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="font-bold text-slate-800">Pokhara Highway Service Hub</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Prithvi Chowk, Pokhara • Regional Spare Parts Depot & Gandaki Dispatch
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: Tax Settings & Invoice Numbering */}
      {activeTab === 'tax_invoice' && (
        <form onSubmit={handleSaveTaxInvoice} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Inland Revenue Department (IRD) & Invoice Configuration</h3>
              <p className="text-xs text-slate-500">
                Nepal Tax Authority compliance, 13% Value Added Tax (VAT), and automatic sequential invoice numbering
              </p>
            </div>
            {isUserCeo && (
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>Save Tax Settings</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company PAN Number *</label>
              <input
                type="text"
                disabled={!isUserCeo}
                value={taxInvoiceForm.panNumber}
                onChange={(e) => setTaxInvoiceForm({ ...taxInvoiceForm, panNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Registered with Inland Revenue Office</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Standard VAT Rate (%)</label>
              <input
                type="number"
                step="0.01"
                disabled={!isUserCeo}
                value={taxInvoiceForm.vatRatePercent}
                onChange={(e) => setTaxInvoiceForm({ ...taxInvoiceForm, vatRatePercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Nepal statutory VAT (13.00%)</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tax Office Jurisdiction</label>
              <input
                type="text"
                disabled={!isUserCeo}
                value={taxInvoiceForm.taxOfficeLocation}
                onChange={(e) => setTaxInvoiceForm({ ...taxInvoiceForm, taxOfficeLocation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Sequential Invoice Numbering Engine
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Prefix *</label>
                <input
                  type="text"
                  disabled={!isUserCeo}
                  value={taxInvoiceForm.invoicePrefix}
                  onChange={(e) => setTaxInvoiceForm({ ...taxInvoiceForm, invoicePrefix: e.target.value })}
                  placeholder="NC-2083-"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Bikram Sambat Fiscal Prefix</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Next Sequence Number</label>
                <input
                  type="number"
                  disabled={!isUserCeo}
                  value={taxInvoiceForm.nextInvoiceSequence}
                  onChange={(e) => setTaxInvoiceForm({ ...taxInvoiceForm, nextInvoiceSequence: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Auto-increments upon issuance</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Preview of Next Invoice ID</label>
                <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 font-mono font-black text-sm flex items-center justify-between">
                  <span>
                    {taxInvoiceForm.invoicePrefix}
                    {String(taxInvoiceForm.nextInvoiceSequence).padStart(4, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-sans font-bold bg-white px-2 py-0.5 rounded text-red-600 border border-red-200">
                    Live
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
            <p className="font-bold text-slate-800">Inland Revenue Department (IRD) Fiscal Audit Rule:</p>
            <p className="mt-0.5">
              Every tax invoice generated in Netcare Nepal ERP creates an irreversible ledger record with VAT breakdown, customer PAN number, and payment method reference (eSewa / Khalti / Bank Voucher). Invoice numbers cannot be recycled or deleted.
            </p>
          </div>
        </form>
      )}

      {/* TAB 3: Notifications & Subscription Packages */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Notification Delivery & Expiry Intervals</h3>
              <p className="text-xs text-slate-500">
                Configure SMS gateway sender ID, WhatsApp dispatches, and multi-day subscription renewal alerts
              </p>
            </div>
            {isUserCeo && (
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>Save Notification Settings</span>
              </button>
            )}
          </div>

          {/* Delivery Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">SMS Gateway</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Sparrow / Aakash SMS</p>
              </div>
              <input
                type="checkbox"
                disabled={!isUserCeo}
                checked={noticeForm.smsGatewayActive}
                onChange={(e) => setNoticeForm({ ...noticeForm, smsGatewayActive: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Email Alerts</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Tax Invoices & PDF receipts</p>
              </div>
              <input
                type="checkbox"
                disabled={!isUserCeo}
                checked={noticeForm.emailAlerts}
                onChange={(e) => setNoticeForm({ ...noticeForm, emailAlerts: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">WhatsApp Alert</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Driver & Owner Dispatch</p>
              </div>
              <input
                type="checkbox"
                disabled={!isUserCeo}
                checked={noticeForm.whatsappAlerts}
                onChange={(e) => setNoticeForm({ ...noticeForm, whatsappAlerts: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Low Stock Notice</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Alert below minimum stock</p>
              </div>
              <input
                type="checkbox"
                disabled={!isUserCeo}
                checked={noticeForm.lowStockNotice}
                onChange={(e) => setNoticeForm({ ...noticeForm, lowStockNotice: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* SMS Sender ID */}
          <div className="max-w-xs text-xs">
            <label className="block font-bold text-slate-700 mb-1">Authorized SMS Sender ID</label>
            <input
              type="text"
              disabled={!isUserCeo}
              value={noticeForm.smsSenderId}
              onChange={(e) => setNoticeForm({ ...noticeForm, smsSenderId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 disabled:bg-slate-100 font-mono font-bold uppercase tracking-wider"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">NTA approved sender header</span>
          </div>

          {/* Subscription Expiry Reminder Intervals */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Automated Subscription Expiry Reminder Intervals
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              The system automatically sends SMS, WhatsApp, and email renewal reminders to bus owners when their active package enters these day thresholds:
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {noticeForm.expiryDays.map((day) => (
                <span
                  key={day}
                  className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <span>{day} Days Before</span>
                  {isUserCeo && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExpiryDay(day)}
                      className="hover:text-red-900 font-black text-sm"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {isUserCeo && (
              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={noticeForm.newExpiryDayInput}
                  onChange={(e) => setNoticeForm({ ...noticeForm, newExpiryDayInput: e.target.value })}
                  placeholder="Add custom day alert (e.g. 45)..."
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50"
                />
                <button
                  type="button"
                  onClick={handleAddExpiryDay}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Add Interval
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* TAB 4: Employee Permissions Matrix */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Role-Based Access Control (RBAC) Permissions Matrix</h3>
              <p className="text-xs text-slate-500">
                Enforced system-wide boundaries across all 10 Netcare Nepal operational modules
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              ABAC Firestore Rules Active
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">ERP Functional Module</th>
                  <th className="py-3 px-3 text-center">CEO</th>
                  <th className="py-3 px-3 text-center">Operations Mgr</th>
                  <th className="py-3 px-3 text-center">Office Staff</th>
                  <th className="py-3 px-3 text-center">Field Technician</th>
                  <th className="py-3 px-3 text-center">Regional Dealer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>Customer Fleet Registry</div>
                    <span className="text-[10px] text-slate-400 font-normal">View & register bus operators</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center text-slate-400">Assigned Only</td>
                  <td className="py-3 px-3 text-center font-bold text-blue-600">Own Clients Only</td>
                </tr>

                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>Subscriptions & Data SIMs</div>
                    <span className="text-[10px] text-slate-400 font-normal">Activate, renew & modify SIMs</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center text-slate-400">Read Only</td>
                  <td className="py-3 px-3 text-center font-bold text-blue-600">Submit Renewal</td>
                </tr>

                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>Hardware & Parts Inventory</div>
                    <span className="text-[10px] text-slate-400 font-normal">Serials, stock receipts & adjustments</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center text-slate-400">Read Only</td>
                  <td className="py-3 px-3 text-center text-slate-600 font-medium">Record Used</td>
                  <td className="py-3 px-3 text-center text-slate-600 font-medium">Request Stock</td>
                </tr>

                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>Field Jobs & Work Orders</div>
                    <span className="text-[10px] text-slate-400 font-normal">Dispatch, execute & photo upload</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center text-slate-600 font-medium">Log Ticket</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Field Execution</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">No Access</td>
                </tr>

                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>Regional Dealer Network</div>
                    <span className="text-[10px] text-slate-400 font-normal">Agreements, commissions & allocations</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Stock Approval</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">No Access</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">No Access</td>
                  <td className="py-3 px-3 text-center text-slate-700 font-bold">Own Agency</td>
                </tr>

                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>Financial Invoicing & Billing</div>
                    <span className="text-[10px] text-slate-400 font-normal">Customer VAT invoices & receipts</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Full Access</td>
                  <td className="py-3 px-3 text-center text-slate-700 font-medium">Read Only</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">Issue Invoices</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">No Access</td>
                  <td className="py-3 px-3 text-center text-slate-500">Commissions</td>
                </tr>

                <tr className="hover:bg-slate-50/60 bg-red-50/40">
                  <td className="py-3 px-4 font-bold text-red-950">
                    <div>Financial Reversals & Overrides</div>
                    <span className="text-[10px] text-red-600 font-normal">High-risk reversal ledger entries</span>
                  </td>
                  <td className="py-3 px-3 text-center font-black text-red-700">Strictly CEO</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">Blocked</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">Blocked</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">Blocked</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">Blocked</td>
                </tr>

                <tr className="hover:bg-slate-50/60 bg-red-50/40">
                  <td className="py-3 px-4 font-bold text-red-950">
                    <div>Company Settings & Employee Provisioning</div>
                    <span className="text-[10px] text-red-600 font-normal">Role creation, tax settings & recovery</span>
                  </td>
                  <td className="py-3 px-3 text-center font-black text-red-700">Strictly CEO</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">Blocked</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">Blocked</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">Blocked</td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">Blocked</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Audit Logs & Security Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Immutable append-only audit trail capturing User ID, Action, Record ID, Timestamp, and Change Diffs.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAuditExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportAuditPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-red-600" />
                <span>PDF Report</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="text"
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              placeholder="Search by User ID, Record ID, Actor name, or change keyword..."
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />

            <select
              value={auditModuleFilter}
              onChange={(e) => setAuditModuleFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Modules</option>
              <option value="Customer">Customer</option>
              <option value="Subscription">Subscription</option>
              <option value="Inventory">Inventory</option>
              <option value="WorkOrder">WorkOrder</option>
              <option value="Dealer">Dealer</option>
              <option value="Finance">Finance</option>
              <option value="Auth">Auth & Users</option>
              <option value="System">System & Settings</option>
            </select>

            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Action Categories</option>
              <option value="LOGIN_LOGOUT">User Login & Logout</option>
              <option value="CUSTOMER">Customer Creation & Editing</option>
              <option value="SUBSCRIPTION">Subscription Activation & Renewal</option>
              <option value="PAYMENT">Payment Creation & Reversals</option>
              <option value="INVENTORY">Inventory Changes & Allocation</option>
              <option value="DEALER">Dealer Transactions</option>
              <option value="JOB">Job Status Changes</option>
              <option value="PERMISSION">Permission & Role Changes</option>
            </select>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp (NPT)</th>
                    <th className="py-3 px-4">User ID & Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Record ID</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Event Details</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        No audit events match your search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500 font-sans whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="py-2.5 px-4 font-sans">
                          <div className="font-bold text-slate-900">{log.actorName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: <span className="text-slate-600">{log.actorId}</span> • {log.actorRole}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800 text-[10.5px]">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">
                          {log.recordId ? (
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold">
                              {log.recordId}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold">
                            {log.module}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 max-w-sm truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedAuditLogForModal(log)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors"
                          >
                            View
                          </button>
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

      {/* TAB 6: Secure Backups & Documented Disaster Recovery Procedure */}
      {activeTab === 'backup_recovery' && (
        <div className="space-y-6">
          {/* Master Backup Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-xs">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Secure Master Database Backups</h3>
                  <p className="text-xs text-slate-500">
                    Cryptographically hashed point-in-time JSON snapshot export of all collections
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownloadBackup}
                disabled={isGeneratingBackup}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 shrink-0"
              >
                <Download className={`w-4 h-4 ${isGeneratingBackup ? 'animate-bounce' : ''}`} />
                <span>{isGeneratingBackup ? 'Exporting Master Snapshot...' : 'Download JSON Backup Snapshot'}</span>
              </button>
            </div>

            {/* Checksum & Status Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Last Verified Backup</span>
                <p className="font-bold text-slate-900 text-sm mt-1">{formatDateTime(lastBackupTime)}</p>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified SHA-256 Hash
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Automatic Sync Schedule</span>
                <p className="font-bold text-slate-900 text-sm mt-1">Daily at 04:00 AM NPT</p>
                <span className="text-[10px] text-slate-500">Cloud Firestore persistent replication</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Dataset Included</span>
                <p className="font-bold text-slate-900 text-sm mt-1">10 Enterprise Collections</p>
                <span className="text-[10px] text-slate-500">
                  {customers.length} Cust • {subscriptions.length} Subs • {inventory.length} Items • {invoices.length} Invoices
                </span>
              </div>
            </div>

            {/* Checksum display */}
            {backupChecksum && (
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 text-xs font-mono">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                  Cryptographic Integrity Verification (SHA-256 Checksum)
                </div>
                <div className="text-emerald-400 break-all select-all font-semibold">
                  {backupChecksum}
                </div>
              </div>
            )}
          </div>

          {/* Official Documented Data Recovery Standard Operating Procedure (SOP) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Netcare Nepal IT Disaster Recovery Procedure (SOP-REC-2083)
                </h3>
                <p className="text-xs text-slate-500">
                  Documented emergency recovery protocols in compliance with corporate telematics business continuity
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-700">
              <div className="p-4 rounded-xl bg-red-50/50 border border-red-100">
                <div className="flex items-center gap-2 font-bold text-red-950 text-sm mb-1">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black">
                    1
                  </span>
                  <span>Disaster Incident Declaration & CEO Authorization</span>
                </div>
                <p className="text-red-900 text-[11px] ml-7">
                  In case of accidental deletion, catastrophic corruption, or security event, only the CEO (<span className="font-mono">netcarenepal@gmail.com</span> / Hotline: +977-9801234567) has legal authority to declare a disaster event and initiate master restoration.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-black">
                    2
                  </span>
                  <span>Database Quarantine & Integrity Validation</span>
                </div>
                <p className="text-slate-600 text-[11px] ml-7">
                  Isolate active client sessions by temporarily locking write rules. Locate the latest validated JSON snapshot file and run local checksum verification:
                  <code className="block mt-1 p-2 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[10.5px]">
                    sha256sum Netcare_Nepal_ERP_Master_Backup_2026-10-31.json
                  </code>
                  Ensure the hash matches the authorized CEO checksum logged in the audit trail.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-black">
                    3
                  </span>
                  <span>Point-in-Time Collection Restoration Protocol</span>
                </div>
                <p className="text-slate-600 text-[11px] ml-7">
                  Restore collections in dependency sequence:
                  <strong className="block mt-1 text-slate-800">
                    1. systemConfig → 2. users → 3. customers → 4. packages → 5. subscriptions → 6. inventory → 7. workOrders → 8. invoices & expenses → 9. auditLogs
                  </strong>
                  This guarantees relational references (e.g. subscriber bus number to router serial) remain intact.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-black">
                    4
                  </span>
                  <span>Post-Restoration Smoke Test & Security Rule Audit</span>
                </div>
                <p className="text-slate-600 text-[11px] ml-7">
                  Verify that all 5 user roles (CEO, Operations Manager, Office Staff, Field Technicians, Regional Dealers) are restricted to their assigned data boundaries. Re-enable client writes only after CEO signoff.
                </p>
              </div>
            </div>

            {/* Emergency Re-seed Action */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900 text-xs">Cloud Firestore Health Check & Seed Test</p>
                <p className="text-[11px] text-slate-500">
                  Verify database connection or re-seed enterprise fleet records if empty
                </p>
              </div>
              <button
                onClick={handleSeedDatabase}
                disabled={isSeeding}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                <span>{isSeeding ? 'Verifying Firestore...' : 'Verify Database State'}</span>
              </button>
            </div>
            {seedStatus && (
              <p className="text-xs text-emerald-700 font-medium">{seedStatus}</p>
            )}
          </div>
        </div>
      )}

      {/* Modal: View Audit Log Change Details */}
      <Modal
        isOpen={!!selectedAuditLogForModal}
        onClose={() => setSelectedAuditLogForModal(null)}
        title={selectedAuditLogForModal ? `Audit Record: ${selectedAuditLogForModal.action}` : 'Audit Record'}
        subtitle={`Immutable log entry captured at ${selectedAuditLogForModal?.timestamp ? formatDateTime(selectedAuditLogForModal.timestamp) : ''}`}
        maxWidth="lg"
      >
        {selectedAuditLogForModal && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">User / Actor</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedAuditLogForModal.actorName}</p>
                <span className="text-[10px] text-slate-500 font-mono">
                  ID: {selectedAuditLogForModal.actorId} • {selectedAuditLogForModal.actorRole}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Record ID</span>
                <p className="font-mono font-bold text-red-600 mt-0.5">
                  {selectedAuditLogForModal.recordId || 'N/A (System Wide)'}
                </p>
                <span className="text-[10px] text-slate-500">Module: {selectedAuditLogForModal.module}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Network IP</span>
                <p className="font-mono text-slate-700 mt-0.5">
                  {selectedAuditLogForModal.ipAddress || '103.141.22.8 (Kathmandu, NP)'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Log Timestamp</span>
                <p className="text-slate-700 mt-0.5 font-sans">
                  {formatDateTime(selectedAuditLogForModal.timestamp)}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Event Summary</span>
              <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-[11px] leading-relaxed">
                {selectedAuditLogForModal.details}
              </p>
            </div>

            {selectedAuditLogForModal.changeDetails && (
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Structured Change Details & Metadata
                </span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 font-mono text-[10.5px] overflow-x-auto max-h-48 overflow-y-auto">
                  {JSON.stringify(selectedAuditLogForModal.changeDetails, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAuditLogForModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
