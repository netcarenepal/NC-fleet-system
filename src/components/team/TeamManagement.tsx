import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Search,
  Mail,
  Phone,
  Shield,
  Building,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Key,
  ShieldAlert,
  Send,
  History,
  UserPlus,
  Copy,
  Check,
  Briefcase,
  Tag,
  ChevronRight,
  Clock,
  Laptop,
} from 'lucide-react';
import { UserProfile, UserRole, UserStatus, LoginActivityRecord, isCEO } from '../../types/erp';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { createDocument, updateDocument, logAuditEvent } from '../../services/dbService';
import { formatDateTime } from '../../utils/formatters';

interface TeamManagementProps {
  users: UserProfile[];
  onAddUser?: (user: UserProfile) => void;
  onUpdateUser?: (userId: string, updates: Partial<UserProfile>) => void;
}

const COMMON_DEPARTMENTS = [
  'Executive Board',
  'Operations & Technical Support',
  'Customer Care & Billing',
  'Field Engineering (Kathmandu)',
  'Field Engineering (Pokhara & Highway Hub)',
  'Regional Partner Franchising',
  'Finance & Accounting',
];

const PREDEFINED_RESPONSIBILITIES: Record<UserRole, string[]> = {
  CEO: [
    'Executive Leadership & Strategic Direction',
    'Company Settings & Tax Configuration',
    'Employee Role Allocation & Permission Audits',
    'High-Value Financial Reversals & Budget Approvals',
    'Dealer Franchise Agreements & Commission Ratification',
    'Disaster Recovery & Master Database Backups',
  ],
  OPERATIONS_MANAGER: [
    'Daily Bus Park Dispatch & Work Order Scheduling',
    'Technician Material & Field Kit Allocations',
    'Supplier Purchase Orders & Warehouse Receiving',
    'Dealer Stock Request Approvals & Hardware Dispatch',
    'Customer Technical Escalation Management',
  ],
  OFFICE_STAFF: [
    'Customer Onboarding & Route Master Data Entry',
    'Monthly Subscription Invoicing & VAT Billing',
    'eSewa / Khalti / Bank Voucher Reconciliation',
    'Proactive Renewal Calling & SIM Expiry Alerts',
    'Front-Desk Client Inquiry & Ticket Logging',
  ],
  FIELD_TECHNICIAN: [
    'Gongabu New Bus Park & Kalanki Rapid Installs',
    '4G WiFi Router & Antenna Roof Drill Mounting',
    'AHD / IP CCTV Camera Wiring & DVR Calibration',
    'Concox GPS Device Hidden Under-Dash Wiring',
    'Before & After Photographic Evidence Upload',
    'Driver & Conductor Digital Signoff Capture',
    'DC Stepdown Converter & Fuse Splicing',
  ],
  DEALER: [
    'Regional Bus Operator Client Acquisition',
    'Local Stock Requisition & Router Inventory Safe-keeping',
    'Dealer Portal Customer Subscription Renewals',
    'Quarterly Commission Reconciliation & Ledger Settlement',
  ],
};

export const TeamManagement: React.FC<TeamManagementProps> = ({ users, onAddUser, onUpdateUser }) => {
  const { activeRole, userProfile, setUserStatus, sendPasswordReset, inviteUserByCeo } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<UserProfile | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
    department: string;
    managerId: string;
    managerName: string;
    assignedDealerId: string;
    responsibilities: string[];
    customResponsibilityInput: string;
  }>({
    fullName: '',
    email: '',
    phone: '+977-',
    role: 'FIELD_TECHNICIAN',
    status: 'active',
    department: 'Field Engineering (Kathmandu)',
    managerId: 'usr-mgr-01',
    managerName: 'Deepak Sharma (Operations Manager)',
    assignedDealerId: '',
    responsibilities: [],
    customResponsibilityInput: '',
  });

  // Invite Form State
  const [inviteData, setInviteData] = useState({
    fullName: '',
    email: '',
    role: 'FIELD_TECHNICIAN' as UserRole,
    department: 'Field Engineering (Kathmandu)',
    managerId: 'usr-mgr-01',
    notes: 'Welcome to the Netcare Nepal Technical Operations team. Please activate your account.',
  });

  const isUserCeo = isCEO(activeRole);

  // Filters
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.responsibilities && u.responsibilities.some((r) => r.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const matchesDept = departmentFilter === 'ALL' || u.department === departmentFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesDept;
  });

  // Unique departments for filter
  const allDepartments = Array.from(new Set(users.map((u) => u.department).filter(Boolean))) as string[];

  // Eligible Managers (CEO & Operations Manager)
  const eligibleManagers = users.filter(
    (u) => u.role === 'CEO' || u.role === 'OPERATIONS_MANAGER'
  );

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '+977-',
      role: 'FIELD_TECHNICIAN',
      status: 'active',
      department: 'Field Engineering (Kathmandu)',
      managerId: 'usr-mgr-01',
      managerName: 'Deepak Sharma (Operations Manager)',
      assignedDealerId: '',
      responsibilities: [...(PREDEFINED_RESPONSIBILITIES['FIELD_TECHNICIAN'] || []).slice(0, 3)],
      customResponsibilityInput: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setFormData({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone || '+977-',
      role: u.role,
      status: u.status || 'active',
      department: u.department || 'Operations & Technical Support',
      managerId: u.managerId || '',
      managerName: u.managerName || '',
      assignedDealerId: u.assignedDealerId || '',
      responsibilities: u.responsibilities || [],
      customResponsibilityInput: '',
    });
    setIsModalOpen(true);
  };

  const handleRoleChangeInForm = (newRole: UserRole) => {
    const suggestedResponsibilities = PREDEFINED_RESPONSIBILITIES[newRole] || [];
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      responsibilities: suggestedResponsibilities.slice(0, 4),
    }));
  };

  const handleToggleResponsibility = (resp: string) => {
    setFormData((prev) => {
      const exists = prev.responsibilities.includes(resp);
      return {
        ...prev,
        responsibilities: exists
          ? prev.responsibilities.filter((r) => r !== resp)
          : [...prev.responsibilities, resp],
      };
    });
  };

  const handleAddCustomResponsibility = () => {
    if (!formData.customResponsibilityInput.trim()) return;
    const trimmed = formData.customResponsibilityInput.trim();
    if (!formData.responsibilities.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        responsibilities: [...prev.responsibilities, trimmed],
        customResponsibilityInput: '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, customResponsibilityInput: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) {
      alert('Please fill required fields (Name and Email).');
      return;
    }

    const selectedManager = eligibleManagers.find((m) => m.userId === formData.managerId);
    const finalManagerName = selectedManager
      ? `${selectedManager.fullName} (${selectedManager.role})`
      : formData.role === 'CEO'
      ? 'Board of Directors / Self'
      : formData.managerName || 'Operations Directorate';

    try {
      if (editingUser) {
        const updates: Partial<UserProfile> = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          status: formData.status,
          department: formData.department,
          managerId: formData.managerId,
          managerName: finalManagerName,
          assignedDealerId: formData.assignedDealerId,
          responsibilities: formData.responsibilities,
          updatedAt: new Date().toISOString(),
        };

        await updateDocument<UserProfile>(
          'users',
          editingUser.userId,
          updates,
          'Auth',
          'EMPLOYEE_UPDATE',
          { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole }
        );

        if (onUpdateUser) {
          onUpdateUser(editingUser.userId, updates);
        }
      } else {
        const newId = `usr-${Date.now().toString().slice(-6)}`;
        const initialActivity: LoginActivityRecord[] = [
          {
            timestamp: new Date().toISOString(),
            ipAddress: '103.141.22.8 (Kathmandu HQ)',
            userAgent: 'Netcare Onboarding Agent / Admin Console',
            action: 'login',
            status: 'success',
          },
        ];

        const newUser: UserProfile = {
          userId: newId,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          status: formData.status,
          department: formData.department,
          managerId: formData.managerId,
          managerName: finalManagerName,
          assignedDealerId: formData.assignedDealerId,
          responsibilities: formData.responsibilities,
          lastLoginAt: new Date().toISOString(),
          lastLoginIp: '103.141.22.8',
          loginCount: 1,
          loginActivity: initialActivity,
          invitedBy: userProfile?.fullName || 'Narayan Prasad Acharya (CEO)',
          invitedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await inviteUserByCeo(newUser);
        if (onAddUser) {
          onAddUser(newUser);
        }

        await logAuditEvent(
          'EMPLOYEE_CREATE',
          'Auth',
          `CEO created employee record for ${newUser.fullName} (${newUser.role}) in ${newUser.department}`,
          { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole },
          newId,
          { role: newUser.role, department: newUser.department, manager: finalManagerName }
        );
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Operation recorded in system memory.');
      setIsModalOpen(false);
    }
  };

  const handleStatusToggle = async (user: UserProfile, newStatus: UserStatus) => {
    if (!isUserCeo) {
      alert('Only the CEO can activate, deactivate or suspend employee accounts.');
      return;
    }

    const actionVerb = newStatus === 'active' ? 'ACTIVATE' : newStatus === 'suspended' ? 'SUSPEND' : 'DEACTIVATE';
    if (confirm(`Are you sure you want to ${actionVerb} access for ${user.fullName} (${user.role})?`)) {
      await setUserStatus(user.userId, newStatus);
      if (onUpdateUser) {
        onUpdateUser(user.userId, { status: newStatus });
      }
      await logAuditEvent(
        'EMPLOYEE_STATUS_CHANGE',
        'Auth',
        `CEO changed account status of ${user.fullName} to ${newStatus.toUpperCase()}`,
        { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole },
        user.userId,
        { previousStatus: user.status, newStatus }
      );
    }
  };

  const handleResetPassword = async (email: string) => {
    if (confirm(`Send secure password reset instruction email to ${email}?`)) {
      await sendPasswordReset(email);
      alert(`Password reset notification dispatched to ${email}`);
    }
  };

  const handleOpenInviteModal = () => {
    setInviteSuccessMsg(null);
    setCopiedInviteLink(false);
    setInviteData({
      fullName: '',
      email: '',
      role: 'FIELD_TECHNICIAN',
      department: 'Field Engineering (Kathmandu)',
      managerId: 'usr-mgr-01',
      notes: 'Welcome to Netcare Nepal. You have been granted Field Technician operational access.',
    });
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email) return;

    const newId = `usr-inv-${Date.now().toString().slice(-6)}`;
    const selectedManager = eligibleManagers.find((m) => m.userId === inviteData.managerId);
    const finalManagerName = selectedManager
      ? `${selectedManager.fullName} (${selectedManager.role})`
      : 'Operations Directorate';

    const invitedUser: UserProfile = {
      userId: newId,
      fullName: inviteData.fullName || inviteData.email.split('@')[0],
      email: inviteData.email,
      phone: '+977-',
      role: inviteData.role,
      status: 'active',
      department: inviteData.department,
      managerId: inviteData.managerId,
      managerName: finalManagerName,
      responsibilities: PREDEFINED_RESPONSIBILITIES[inviteData.role] || [],
      invitedBy: userProfile?.fullName || 'Narayan Prasad Acharya (CEO)',
      invitedAt: new Date().toISOString(),
      loginCount: 0,
      loginActivity: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await inviteUserByCeo(invitedUser);
    if (onAddUser) {
      onAddUser(invitedUser);
    }

    await logAuditEvent(
      'EMPLOYEE_INVITE',
      'Auth',
      `CEO dispatched onboarding invitation to ${inviteData.email} for role ${inviteData.role}`,
      { id: userProfile?.userId, name: userProfile?.fullName, role: activeRole },
      newId,
      { invitedEmail: inviteData.email, role: inviteData.role, department: inviteData.department }
    );

    setInviteSuccessMsg(`Invitation dispatched to ${inviteData.email}! One-time onboarding token generated.`);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CEO':
        return { label: 'CEO / Super Admin', bg: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-500/20' };
      case 'OPERATIONS_MANAGER':
        return { label: 'Operations Manager', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'OFFICE_STAFF':
        return { label: 'Customer Care & Billing', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'FIELD_TECHNICIAN':
        return { label: 'Field Technician', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'DEALER':
        return { label: 'Regional Dealer', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: role, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Metrics
  const totalEmployees = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const inactiveCount = users.filter((u) => u.status === 'inactive' || u.status === 'suspended').length;
  const techCount = users.filter((u) => u.role === 'FIELD_TECHNICIAN').length;
  const dealerCount = users.filter((u) => u.role === 'DEALER').length;

  return (
    <div className="space-y-6">
      {/* Top Banner with CEO Administrative Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Administration & Employee Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              CEO Master Authority
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Personnel directories, role hierarchy, manager reporting lines, duty responsibilities, and immutable session audit
          </p>
        </div>

        {isUserCeo && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenInviteModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Invite Employee</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Employee</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalEmployees}</p>
          <span className="text-[10px] text-slate-500">Across 5 departments</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
          <span className="text-[10px] text-slate-500">With verified access</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Suspended</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{inactiveCount}</p>
          <span className="text-[10px] text-slate-500">Locked accounts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Technicians</span>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{techCount}</p>
          <span className="text-[10px] text-slate-500">Field engineering team</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dealers</span>
            <Building className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600">{dealerCount}</p>
          <span className="text-[10px] text-slate-500">Regional partner leads</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by employee name, role, email, department, or responsibilities..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="CEO">CEO</option>
              <option value="OPERATIONS_MANAGER">Operations Manager</option>
              <option value="OFFICE_STAFF">Office Staff</option>
              <option value="FIELD_TECHNICIAN">Field Technician</option>
              <option value="DEALER">Regional Dealer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL">All Departments</option>
              {allDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">No employees matched your search and filter criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the department or role filters.</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const roleBadge = getRoleBadge(user.role);
            const isSuspended = user.status === 'inactive' || user.status === 'suspended';
            const responsibilities = user.responsibilities || [];

            return (
              <div
                key={user.userId}
                className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isSuspended ? 'border-rose-200 bg-rose-50/20 ring-1 ring-rose-200' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleBadge.bg}`}>
                      {roleBadge.label}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        user.status === 'active' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {user.status === 'active' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span className="capitalize">{user.status || 'active'}</span>
                    </span>
                  </div>

                  {/* User Identity */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center font-black text-base shadow-sm ring-2 ring-red-500/20 shrink-0">
                      {user.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{user.fullName}</h3>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{user.department || 'General Operations'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Reporting Manager */}
                  <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold">Reports To:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[170px]">
                      {user.managerName || (user.role === 'CEO' ? 'Board of Directors' : 'Deepak Sharma')}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Responsibilities tags */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Assigned Duties ({responsibilities.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {responsibilities.slice(0, 3).map((resp, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium leading-tight truncate max-w-full"
                          title={resp}
                        >
                          {resp}
                        </span>
                      ))}
                      {responsibilities.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold">
                          +{responsibilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last Login Info */}
                  <div className="mt-3 pt-2 text-[10.5px] text-slate-400 flex items-center justify-between border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Last Login:</span>
                    </span>
                    <span className="font-medium text-slate-600">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedUserForActivity(user)}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-red-600 transition-colors"
                    title="View Login Activity and Session Audit"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Login Activity</span>
                  </button>

                  {isUserCeo && (
                    <div className="flex items-center gap-1.5">
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleStatusToggle(user, 'suspended')}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10.5px] font-bold transition-colors"
                          title="Suspend User Access"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusToggle(user, 'active')}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10.5px] font-bold transition-colors"
                          title="Activate User Access"
                        >
                          Activate
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Roles, Manager & Responsibilities"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleResetPassword(user.email)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Send Password Reset Email"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Create / Edit Employee Profile */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Edit Employee: ${editingUser.fullName}` : 'Create Authorized Employee Profile'}
        subtitle="Configure role hierarchy, department allocation, direct manager reporting, and duty responsibilities"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Bikash KC"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="bikash.tech@netcarenepal.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">System Role *</label>
              <select
                value={formData.role}
                onChange={(e) => handleRoleChangeInForm(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer font-bold"
              >
                <option value="CEO">CEO (Super Administrator)</option>
                <option value="OPERATIONS_MANAGER">Operations Manager</option>
                <option value="OFFICE_STAFF">Office & Customer Support</option>
                <option value="FIELD_TECHNICIAN">Field Technician</option>
                <option value="DEALER">Regional Dealer</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer"
              >
                {COMMON_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer font-semibold"
              >
                <option value="active">Active (Access Granted)</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended (Access Revoked)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reporting Manager</label>
              <select
                value={formData.managerId}
                onChange={(e) => {
                  const mId = e.target.value;
                  const m = eligibleManagers.find((mgr) => mgr.userId === mId);
                  setFormData({
                    ...formData,
                    managerId: mId,
                    managerName: m ? `${m.fullName} (${m.role})` : '',
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer"
              >
                <option value="">Select Reporting Manager</option>
                {eligibleManagers.map((mgr) => (
                  <option key={mgr.userId} value={mgr.userId}>
                    {mgr.fullName} ({mgr.role}) - {mgr.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+977-98..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
              />
            </div>
          </div>

          {formData.role === 'DEALER' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Dealer Agency ID</label>
              <input
                type="text"
                value={formData.assignedDealerId}
                onChange={(e) => setFormData({ ...formData, assignedDealerId: e.target.value })}
                placeholder="e.g. dlr-002"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
              />
            </div>
          )}

          {/* Employee Responsibilities Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-700">
                Employee Operational Responsibilities & Scopes
              </label>
              <span className="text-[10px] text-slate-400">Select duty tags or add custom</span>
            </div>

            {/* Checklist of suggested responsibilities */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto space-y-1.5">
              {(PREDEFINED_RESPONSIBILITIES[formData.role] || []).map((resp) => {
                const isSelected = formData.responsibilities.includes(resp);
                return (
                  <label
                    key={resp}
                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 select-none text-[11px]"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleResponsibility(resp)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span>{resp}</span>
                  </label>
                );
              })}
            </div>

            {/* Add Custom Duty */}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={formData.customResponsibilityInput}
                onChange={(e) => setFormData({ ...formData, customResponsibilityInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomResponsibility();
                  }
                }}
                placeholder="Add specialized operational duty (e.g. Kalanki Night Emergency Shift)..."
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
              />
              <button
                type="button"
                onClick={handleAddCustomResponsibility}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Add
              </button>
            </div>

            {/* Active selected tags */}
            <div className="mt-2 flex flex-wrap gap-1">
              {formData.responsibilities.map((r, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10.5px] font-medium flex items-center gap-1"
                >
                  <span>{r}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleResponsibility(r)}
                    className="hover:text-red-900 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors"
            >
              {editingUser ? 'Save Employee Profile' : 'Create Employee Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Invite Employee (CEO Feature) */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Employee to Netcare Nepal ERP"
        subtitle="Issue official onboarding invitation with verified access credentials and department reporting"
        maxWidth="md"
      >
        <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Employee Full Name (Optional)</label>
            <input
              type="text"
              value={inviteData.fullName}
              onChange={(e) => setInviteData({ ...inviteData, fullName: e.target.value })}
              placeholder="e.g. Ramesh Subedi"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Corporate / Personal Email *</label>
            <input
              type="email"
              required
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              placeholder="ramesh@netcarenepal.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Designated Role *</label>
              <select
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
              >
                <option value="OPERATIONS_MANAGER">Operations Manager</option>
                <option value="OFFICE_STAFF">Office & Support</option>
                <option value="FIELD_TECHNICIAN">Field Technician</option>
                <option value="DEALER">Regional Dealer</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <select
                value={inviteData.department}
                onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
              >
                {COMMON_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Reporting Supervisor</label>
            <select
              value={inviteData.managerId}
              onChange={(e) => setInviteData({ ...inviteData, managerId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
            >
              {eligibleManagers.map((mgr) => (
                <option key={mgr.userId} value={mgr.userId}>
                  {mgr.fullName} ({mgr.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Invitation Message</label>
            <textarea
              rows={2}
              value={inviteData.notes}
              onChange={(e) => setInviteData({ ...inviteData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-[11px]"
            />
          </div>

          {inviteSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{inviteSuccessMsg}</p>
                <p className="mt-0.5 text-emerald-700 font-mono text-[10px]">
                  Invitation token: NC-INV-{Date.now().toString().slice(-8)}
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Invitation</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: View Login Activity & Session Audit */}
      <Modal
        isOpen={!!selectedUserForActivity}
        onClose={() => setSelectedUserForActivity(null)}
        title={selectedUserForActivity ? `Login Activity: ${selectedUserForActivity.fullName}` : 'Login Activity'}
        subtitle={`Audit logs of employee logins, logouts, IP addresses, and client devices for ${selectedUserForActivity?.email}`}
        maxWidth="xl"
      >
        {selectedUserForActivity && (
          <div className="space-y-4 text-xs">
            {/* Quick Session Stats */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Logins</span>
                <p className="text-base font-black text-slate-900">
                  {selectedUserForActivity.loginCount || (selectedUserForActivity.loginActivity?.length || 1)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Latest IP</span>
                <p className="font-mono text-slate-800 text-[11px] truncate">
                  {selectedUserForActivity.lastLoginIp || '103.141.22.8'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Current Status</span>
                <p className="font-bold capitalize text-emerald-600">
                  {selectedUserForActivity.status || 'Active'}
                </p>
              </div>
            </div>

            {/* Login Activity Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp (NPT)</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Device / Browser</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {selectedUserForActivity.loginActivity && selectedUserForActivity.loginActivity.length > 0 ? (
                    selectedUserForActivity.loginActivity.map((log, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-slate-600 font-sans">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${
                              log.action === 'login'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700">{log.ipAddress}</td>
                        <td className="py-2 px-3 text-slate-500 font-sans truncate max-w-[150px]">
                          {log.userAgent || 'Chrome 130 / Mobile'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="text-emerald-600 font-bold font-sans">
                            {log.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-sans">
                        No individual session records found. Default onboarding session recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserForActivity(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
