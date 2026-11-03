import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Clock,
  LogIn,
  LogOut,
  User as UserIcon,
  PlusCircle,
  Database,
  Lock,
  Mail,
  Key,
  ShieldAlert,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ActiveTab } from './Sidebar';
import { Modal } from '../common/Modal';

interface HeaderProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTab: ActiveTab;
  onOpenQuickAction: (action: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  searchQuery,
  setSearchQuery,
  activeTab,
  onOpenQuickAction,
}) => {
  const {
    currentUser,
    userProfile,
    activeRole,
    signInWithGoogle,
    signInWithEmail,
    sendPasswordReset,
    signOut,
    switchRole,
  } = useAuth();

  const [nepalTime, setNepalTime] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Email/Pass form state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kathmandu',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setNepalTime(formatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const result = await signInWithEmail(authEmail, authPassword);
      if (result.success) {
        setIsAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
      } else {
        setAuthMessage({ text: result.message || 'Authentication failed.', type: 'error' });
      }
    } catch (err: any) {
      setAuthMessage({ text: err?.message || 'Authentication encountered an issue.', type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) {
      setAuthMessage({ text: 'Please enter your corporate email address.', type: 'error' });
      return;
    }
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const result = await sendPasswordReset(authEmail);
      if (result.success) {
        setAuthMessage({ text: result.message || 'Password reset link sent.', type: 'success' });
      } else {
        setAuthMessage({ text: result.message || 'Failed to send reset link.', type: 'error' });
      }
    } catch (err: any) {
      setAuthMessage({ text: err?.message || 'Password reset encountered an issue.', type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const getTabLabel = (tab: ActiveTab) => {
    switch (tab) {
      case 'ceo-dashboard':
        return 'Executive Dashboard';
      case 'customers':
        return 'Bus Operators & Fleets';
      case 'subscriptions':
        return 'WiFi & GPS Subscriptions';
      case 'inventory':
        return 'Hardware & SIM Inventory';
      case 'operations':
        return 'Technical Operations';
      case 'dealers':
        return 'Regional Partners';
      case 'finance':
        return 'Finance & VAT Billing';
      case 'reports':
        return 'Reports & Analytics';
      case 'team':
        return 'Employee Directory';
      case 'settings':
        return 'Settings & Audit Logs';
      default:
        return 'Netcare ERP';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16 gap-4">
          {/* Zone 1: Breadcrumb Trail & Mobile Hamburger */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav className="flex items-center gap-2 text-xs min-w-0" aria-label="Breadcrumb">
              <span className="font-bold text-slate-400 hidden sm:inline">Netcare Nepal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                {getTabLabel(activeTab)}
              </h1>
            </nav>
          </div>

          {/* Zone 2: Global Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bus (e.g. Ba 3 Kha), operator, router IMEI, or ticket..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Zone 3: Actions, Nepal Clock & User Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Real-time Kathmandu Clock */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs font-mono font-medium">
              <Clock className="w-3.5 h-3.5 text-red-600" />
              <span>{nepalTime} NPT</span>
            </div>

            {/* Quick Action Button for staff */}
            {['CEO', 'OPERATIONS_MANAGER', 'OFFICE_STAFF'].includes(activeRole) && (
              <button
                onClick={() => onOpenQuickAction('work_order')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">New Ticket</span>
              </button>
            )}

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                aria-label="Operational Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600" />
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-xs">
                  <div className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2.5 flex items-center justify-between">
                    <span>Operational Alerts</span>
                    <span className="text-[10px] text-red-600 font-bold uppercase">2 Pending</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-900">
                      <p className="font-bold text-xs">Bus Ga 1 Kha 8900 Expired</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">Blue Sky Travels renewal due.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-900">
                      <p className="font-bold text-xs">M2M SIM Expiry in 3 Days</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">5 NTC data cards due for auto-recharge.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                      <p className="font-bold text-xs">Technician on Site</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Bikash KC dispatched to Gongabu Bay 4.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile / Auth Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-red-500/20">
                  {userProfile?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="hidden lg:block text-left text-xs">
                  <p className="font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                    {userProfile?.fullName || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">
                    {activeRole}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={isForgotPassword ? 'Reset Netcare Password' : 'Staff & Dealer Sign In'}
        subtitle="Secure enterprise authentication with Firebase and Google Workspace"
        maxWidth="md"
      >
        <div className="space-y-4">
          {authMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                authMessage.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              <span className="font-bold shrink-0">{authMessage.type === 'error' ? 'Notice:' : 'Success:'}</span>
              <span>{authMessage.text}</span>
            </div>
          )}

          {!isForgotPassword ? (
            <>
              <button
                onClick={async () => {
                  setAuthMessage(null);
                  const result = await signInWithGoogle();
                  if (result.success) {
                    setIsAuthModalOpen(false);
                  } else {
                    setAuthMessage({ text: result.message || 'Google sign-in was not completed.', type: 'error' });
                  }
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google Workspace</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Or corporate email
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleEmailSignIn} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="staff@netcarenepal.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMessage(null);
                        setIsForgotPassword(true);
                      }}
                      className="text-[11px] text-red-600 hover:text-red-700 font-semibold"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {authLoading && (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>Sign In to Account</span>
                </button>
              </form>

              {/* 1-Click Role Access for Testing & QA */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Quick Role Sign-In (Testing & QA)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      switchRole('CEO');
                      setIsAuthModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-left transition-colors"
                  >
                    👔 CEO
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchRole('OPERATIONS_MANAGER');
                      setIsAuthModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-left transition-colors"
                  >
                    ⚙️ Ops Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchRole('OFFICE_STAFF');
                      setIsAuthModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-left transition-colors"
                  >
                    📋 Billing Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchRole('FIELD_TECHNICIAN');
                      setIsAuthModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-left transition-colors"
                  >
                    🔧 Field Tech
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchRole('DEALER');
                      setIsAuthModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-left transition-colors"
                  >
                    🤝 Dealer
                  </button>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-3 text-xs">
              <p className="text-slate-600 text-[11px]">
                Enter your registered corporate email to receive a secure password reset link from Firebase.
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@netcarenepal.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMessage(null);
                    setIsForgotPassword(false);
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                >
                  Back to Sign In
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
};
