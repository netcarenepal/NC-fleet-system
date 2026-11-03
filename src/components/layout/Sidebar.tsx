import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Wrench,
  Handshake,
  DollarSign,
  BarChart3,
  UserCheck,
  ShieldCheck,
  Radio,
  ChevronRight,
  Wifi,
  Sparkles,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/erp';

export type ActiveTab =
  | 'ceo-dashboard'
  | 'customers'
  | 'subscriptions'
  | 'inventory'
  | 'operations'
  | 'dealers'
  | 'finance'
  | 'reports'
  | 'team'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  counts: {
    customers: number;
    subscriptions: number;
    inventory: number;
    workOrders: number;
    dealers: number;
    invoices: number;
  };
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  counts,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { activeRole, switchRole, userProfile } = useAuth();

  const navItems = [
    {
      id: 'ceo-dashboard' as ActiveTab,
      label: 'CEO Dashboard',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['CEO', 'OPERATIONS_MANAGER', 'OFFICE_STAFF'],
      badge: 'Live',
    },
    {
      id: 'customers' as ActiveTab,
      label: 'Bus Operators & Clients',
      shortLabel: 'Operators',
      icon: Users,
      roles: ['CEO', 'OPERATIONS_MANAGER', 'OFFICE_STAFF', 'DEALER'],
      count: counts.customers,
    },
    {
      id: 'subscriptions' as ActiveTab,
      label: 'Bus WiFi & GPS Subs',
      shortLabel: 'Subscriptions',
      icon: CreditCard,
      roles: ['CEO', 'OPERATIONS_MANAGER', 'OFFICE_STAFF', 'DEALER'],
      count: counts.subscriptions,
    },
    {
      id: 'inventory' as ActiveTab,
      label: 'Hardware & SIM Inventory',
      shortLabel: 'Inventory',
      icon: Package,
      roles: ['CEO', 'OPERATIONS_MANAGER', 'OFFICE_STAFF', 'FIELD_TECHNICIAN'],
      count: counts.inventory,
    },
    {
      id: 'operations' as ActiveTab,
      label: 'Technical Operations',
      shortLabel: 'Field Jobs',
      icon: Wrench,
      roles: ['CEO', 'OPERATIONS_MANAGER', 'OFFICE_STAFF', 'FIELD_TECHNICIAN'],
      count: counts.workOrders,
      highlight: activeRole === 'FIELD_TECHNICIAN',
    },
    {
      id: 'dealers' as ActiveTab,
      label: 'Dealer & Regional Partners',
      shortLabel: 'Dealers',
      icon: Handshake,
      roles: ['CEO', 'OPERATIONS_MANAGER', 'DEALER'],
      count: counts.dealers,
    },
    {
      id: 'finance' as ActiveTab,
      label: 'Finance & VAT Invoices',
      shortLabel: 'Finance',
      icon: DollarSign,
      roles: ['CEO', 'OPERATIONS_MANAGER', 'OFFICE_STAFF'],
      count: counts.invoices,
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Reports & Export',
      shortLabel: 'Reports',
      icon: BarChart3,
      roles: ['CEO', 'OPERATIONS_MANAGER', 'OFFICE_STAFF', 'DEALER'],
      badge: 'PDF',
    },
    {
      id: 'team' as ActiveTab,
      label: 'Employee Directory',
      shortLabel: 'Team',
      icon: UserCheck,
      roles: ['CEO', 'OPERATIONS_MANAGER'],
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings & Audit Logs',
      shortLabel: 'Settings',
      icon: ShieldCheck,
      roles: ['CEO', 'OPERATIONS_MANAGER', 'OFFICE_STAFF'],
    },
  ];

  const allowedNavItems = navItems.filter((item) => (item.roles as string[]).includes(activeRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-45 bg-slate-900 text-slate-200 border-r border-slate-800/90 flex flex-col transition-all duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20 w-72' : 'lg:w-68 w-72'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-md shadow-red-900/40 text-white font-black shrink-0">
              <Wifi className="w-5 h-5 stroke-[2.5]" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white text-sm tracking-wide">NETCARE</span>
                  <span className="text-red-500 font-extrabold text-sm">NEPAL</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">
                  Fleet ERP Platform
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Role Switcher Toolbar */}
        {!isCollapsed ? (
          <div className="p-3 mx-3 mt-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Active Viewport
              </span>
              <span className="text-[9.5px] font-mono text-slate-400 uppercase">RBAC</span>
            </div>
            <select
              value={activeRole}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              <option value="CEO">CEO (Narayan Prasad Acharya)</option>
              <option value="OPERATIONS_MANAGER">Operations Mgr (Deepak Sharma)</option>
              <option value="OFFICE_STAFF">Office Staff (Pooja Karki)</option>
              <option value="FIELD_TECHNICIAN">Field Tech (Bikash KC)</option>
              <option value="DEALER">Regional Dealer (Anil Gurung)</option>
            </select>
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center py-3 border-b border-slate-800/60">
            <div
              className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-700"
              title={`Role: ${activeRole}`}
            >
              {activeRole.charAt(0)}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Modules
            </div>
          )}

          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                title={isCollapsed ? `${item.label} ${item.count ? `(${item.count})` : ''}` : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all group relative ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-900/40 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                } ${item.highlight ? 'ring-1 ring-amber-500/50' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-400'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isActive
                            ? 'bg-red-700 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                        isActive ? 'opacity-100' : 'text-slate-400'
                      }`}
                    />
                  </div>
                )}

                {/* Collapsed Badge Dot indicator */}
                {isCollapsed && item.count !== undefined && item.count > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 ring-2 ring-slate-900" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/50 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate">Tinkune, Kathmandu</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold shrink-0">
                <Radio className="w-3 h-3 animate-ping" />
                Online
              </span>
            </div>
          ) : (
            <div className="flex justify-center" title="Netcare Nepal Online">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
