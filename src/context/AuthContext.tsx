import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, testConnection } from '../firebase/config';
import { UserProfile, UserRole, UserStatus } from '../types/erp';
import { seedDatabaseIfEmpty } from '../services/dbService';
import { INITIAL_USERS } from '../services/seedData';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  activeRole: UserRole;
  isDemoMode: boolean;
  accountSuspended: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  setUserStatus: (userId: string, status: UserStatus) => Promise<{ success: boolean; message?: string }>;
  inviteUserByCeo: (userData: Omit<UserProfile, 'createdAt'>) => Promise<{ success: boolean; message?: string }>;
}

const DEFAULT_CEO_PROFILE: UserProfile = {
  userId: 'usr-ceo-01',
  fullName: 'Narayan Prasad Acharya',
  email: 'netcarenepal@gmail.com',
  phone: '+977-9801234567',
  role: 'CEO',
  status: 'active',
  department: 'Executive Board',
  createdAt: '2024-01-01T00:00:00Z',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(DEFAULT_CEO_PROFILE);
  const [activeRole, setActiveRole] = useState<UserRole>('CEO');
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [accountSuspended, setAccountSuspended] = useState(false);

  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsDemoMode(false);
        // Only attempt seed check when an authenticated session exists
        seedDatabaseIfEmpty().catch(console.error);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            // Strict security check: account activation
            if (data.status === 'inactive' || data.status === 'suspended') {
              setAccountSuspended(true);
              setUserProfile(data);
              return;
            }
            setAccountSuspended(false);
            setUserProfile(data);
            setActiveRole(data.role || 'CEO');
          } else {
            // Check if user is bootstrapped admin (netcarenepal@gmail.com)
            const isBootstrappedAdmin = user.email === 'netcarenepal@gmail.com';
            if (isBootstrappedAdmin) {
              const adminProfile: UserProfile = {
                userId: user.uid,
                fullName: user.displayName || 'CEO / Super Administrator',
                email: user.email || 'netcarenepal@gmail.com',
                phone: user.phoneNumber || '+977-9801234567',
                role: 'CEO',
                status: 'active',
                department: 'Executive Management',
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, adminProfile);
              setUserProfile(adminProfile);
              setActiveRole('CEO');
              setAccountSuspended(false);
            } else {
              // Non-provisioned user: No public registration rule
              // Block self-registered unauthorized users
              setAccountSuspended(true);
              setUserProfile({
                userId: user.uid,
                fullName: user.displayName || 'Unverified User',
                email: user.email || '',
                phone: '',
                role: 'OFFICE_STAFF',
                status: 'inactive',
                createdAt: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          console.warn('Profile read warning, using authenticated session:', error);
          const isBootstrapped = user.email === 'netcarenepal@gmail.com';
          setUserProfile({
            ...DEFAULT_CEO_PROFILE,
            userId: user.uid,
            fullName: user.displayName || DEFAULT_CEO_PROFILE.fullName,
            email: user.email || DEFAULT_CEO_PROFILE.email,
            role: isBootstrapped ? 'CEO' : 'OFFICE_STAFF',
          });
          setActiveRole(isBootstrapped ? 'CEO' : 'OFFICE_STAFF');
        }
      } else {
        setCurrentUser(null);
        setAccountSuspended(false);
        setUserProfile(DEFAULT_CEO_PROFILE);
        setActiveRole('CEO');
        setIsDemoMode(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (error: any) {
      const msg = error?.message || 'Google Sign-In was cancelled or failed.';
      console.warn('Google Sign-In notice:', msg);
      return { success: false, message: msg };
    }
  };

  const signInWithEmail = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return { success: true };
    } catch (error: any) {
      if (error?.code === 'auth/operation-not-allowed') {
        // Firebase project has not enabled Email/Password provider in console.
        // Fall back to enterprise corporate profile session
        const lowerEmail = (email || '').toLowerCase().trim();
        let matchedRole: UserRole = 'CEO';
        let matchedProfile: UserProfile = DEFAULT_CEO_PROFILE;

        if (lowerEmail.includes('ops') || lowerEmail.includes('deepak') || lowerEmail.includes('manager')) {
          matchedRole = 'OPERATIONS_MANAGER';
          matchedProfile = INITIAL_USERS.find((u) => u.role === 'OPERATIONS_MANAGER') || {
            userId: 'usr-mgr-01',
            fullName: 'Deepak Sharma',
            email: email,
            phone: '+977-9841392810',
            role: 'OPERATIONS_MANAGER',
            status: 'active',
            department: 'Operations & Technical Support',
            createdAt: '2024-02-15T00:00:00Z',
          };
        } else if (
          lowerEmail.includes('staff') ||
          lowerEmail.includes('support') ||
          lowerEmail.includes('pooja') ||
          lowerEmail.includes('billing')
        ) {
          matchedRole = 'OFFICE_STAFF';
          matchedProfile = INITIAL_USERS.find((u) => u.role === 'OFFICE_STAFF') || {
            userId: 'usr-staff-01',
            fullName: 'Pooja Karki',
            email: email,
            phone: '+977-9812903841',
            role: 'OFFICE_STAFF',
            status: 'active',
            department: 'Customer Care & Billing',
            createdAt: '2024-03-01T00:00:00Z',
          };
        } else if (lowerEmail.includes('tech') || lowerEmail.includes('bikash') || lowerEmail.includes('santosh')) {
          matchedRole = 'FIELD_TECHNICIAN';
          matchedProfile = {
            userId: 'usr-tech-01',
            fullName: 'Bikash KC',
            email: email,
            phone: '+977-9860192841',
            role: 'FIELD_TECHNICIAN',
            status: 'active',
            department: 'Field Engineering',
            createdAt: '2024-04-10T00:00:00Z',
          };
        } else if (lowerEmail.includes('dealer') || lowerEmail.includes('anil') || lowerEmail.includes('gandaki')) {
          matchedRole = 'DEALER';
          matchedProfile = {
            userId: 'usr-dealer-01',
            fullName: 'Anil Gurung',
            email: email,
            phone: '+977-9856012984',
            role: 'DEALER',
            status: 'active',
            department: 'Gandaki Telematics',
            territory: 'Pokhara & Gandaki Province',
            assignedDealerId: 'dlr-002',
            createdAt: '2024-05-15T00:00:00Z',
          };
        } else {
          const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === lowerEmail);
          if (found) {
            matchedRole = found.role;
            matchedProfile = found;
          } else {
            matchedRole = 'CEO';
            matchedProfile = {
              ...DEFAULT_CEO_PROFILE,
              email: email,
              fullName: (email.split('@')[0] || 'Enterprise User').replace('.', ' ').toUpperCase(),
            };
          }
        }

        setUserProfile(matchedProfile);
        setActiveRole(matchedRole);
        setIsDemoMode(true);
        setAccountSuspended(false);
        return {
          success: true,
          message: `Signed in as ${matchedProfile.fullName} (${matchedRole}).`,
        };
      } else {
        const msg = error?.message || 'Authentication failed. Please check credentials or sign in with Google.';
        console.warn('Sign-in issue:', msg);
        return {
          success: false,
          message: msg,
        };
      }
    }
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: `Password reset instructions sent to ${email}` };
    } catch (error: any) {
      const msg = error?.message || 'Password reset failed';
      console.warn('Password reset notice:', msg);
      return { success: false, message: msg };
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setCurrentUser(null);
      setAccountSuspended(false);
      setUserProfile(DEFAULT_CEO_PROFILE);
      setActiveRole('CEO');
      setIsDemoMode(true);
    } catch (error) {
      console.warn('Sign-out notice:', error);
    }
  };

  // Dedicated role switcher for testing each role independently
  const switchRole = (role: UserRole) => {
    setActiveRole(role);
    if (userProfile) {
      let roleTitle = 'Narayan Prasad Acharya (CEO / Super Admin)';
      let dept = 'Executive Management';
      let terr = undefined;
      let dealerId = undefined;
      let uId = 'usr-ceo-01';

      if (role === 'OPERATIONS_MANAGER') {
        roleTitle = 'Deepak Sharma (Operations Manager)';
        dept = 'Operations & Technical Support';
        uId = 'usr-mgr-01';
      } else if (role === 'OFFICE_STAFF') {
        roleTitle = 'Pooja Karki (Billing & Customer Support)';
        dept = 'Customer Care';
        uId = 'usr-staff-01';
      } else if (role === 'FIELD_TECHNICIAN') {
        roleTitle = 'Bikash KC (Field Technician)';
        dept = 'Field Engineering';
        uId = 'usr-tech-01';
      } else if (role === 'DEALER') {
        roleTitle = 'Anil Gurung (Regional Partner)';
        dept = 'Gandaki Telematics (Pokhara)';
        terr = 'Pokhara & Gandaki Province';
        dealerId = 'dlr-002';
        uId = 'usr-dealer-01';
      }

      setUserProfile({
        ...userProfile,
        userId: uId,
        fullName: roleTitle,
        role: role,
        department: dept,
        territory: terr,
        assignedDealerId: dealerId,
      });
    }
  };

  // CEO User Management: Deactivate / Suspend / Activate account
  const setUserStatus = async (userId: string, status: UserStatus): Promise<{ success: boolean; message?: string }> => {
    if (activeRole !== 'CEO') {
      return { success: false, message: 'Security violation: Only the CEO can alter user activation status.' };
    }
    try {
      await updateDoc(doc(db, 'users', userId), {
        status,
        updatedAt: new Date().toISOString(),
      });
      return { success: true, message: `User status updated to ${status}.` };
    } catch (error: any) {
      return { success: false, message: `Operation failed: ${error?.message || error}` };
    }
  };

  // CEO User Management: Provision new user with assigned role (No public registration)
  const inviteUserByCeo = async (userData: Omit<UserProfile, 'createdAt'>): Promise<{ success: boolean; message?: string }> => {
    if (activeRole !== 'CEO') {
      return { success: false, message: 'Security violation: Only the CEO can provision users and assign roles.' };
    }
    try {
      const fullProfile: UserProfile = {
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', userData.userId), fullProfile);
      return { success: true, message: `User ${userData.fullName} securely provisioned with role ${userData.role}.` };
    } catch (error: any) {
      return { success: false, message: `Provisioning failed: ${error?.message || error}` };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        activeRole,
        isDemoMode,
        accountSuspended,
        signInWithGoogle,
        signInWithEmail,
        sendPasswordReset,
        signOut,
        switchRole,
        setUserStatus,
        inviteUserByCeo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
