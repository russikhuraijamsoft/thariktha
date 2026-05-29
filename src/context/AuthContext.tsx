import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, isCloudConnected } from '../firebase';
import { UserProfile, UserRole, ROLE_DEFINITIONS } from '../types/auth';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isSandboxMode: boolean;
  staffMembers: UserProfile[];
  hasPermission: (permission: string) => boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, role: UserRole, branchId: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateUserRole: (uid: string, nextRole: UserRole) => Promise<void>;
  toggleUserProfileStatus: (uid: string, status: 'active' | 'suspended') => Promise<void>;
  inviteStaffMember: (name: string, email: string, role: UserRole, branchId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys for persistent simulation
const LOCAL_PROFILE_KEY = 'cricket_closet_erp_user_profile';
const LOCAL_STAFF_KEY = 'cricket_closet_erp_staff_list';
const LOCAL_SANDBOX_USER_KEY = 'cricket_closet_erp_sandbox_user';

// Prepopulated static staff registry (6 requested roles)
const PREPOPULATED_STAFF: UserProfile[] = [
  {
    uid: 'staff_super_admin',
    name: 'Sir Donald Bradman',
    email: 'super_admin_guru@cricketcloset.com',
    roleId: 'super_admin',
    branchId: 'Melbourne Closets',
    status: 'active',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-25T05:00:00Z',
    phone: '+61-491-570-001'
  },
  {
    uid: 'staff_melbourne_mgr',
    name: 'Ricky Ponting',
    email: 'melbourne_mgr@cricketcloset.com',
    roleId: 'manager',
    branchId: 'Melbourne Closets',
    status: 'active',
    createdAt: '2026-05-02T00:00:00Z',
    updatedAt: '2026-05-25T05:00:00Z',
    phone: '+61-491-570-002'
  },
  {
    uid: 'staff_craftsman_vijay',
    name: 'Vijay Merchant',
    email: 'craftsman_sharma@cricketcloset.com',
    roleId: 'manufacturing_staff',
    branchId: 'Melbourne Closets',
    status: 'active',
    createdAt: '2026-05-03T00:00:00Z',
    updatedAt: '2026-05-25T03:00:00Z',
    phone: '+61-491-570-003'
  },
  {
    uid: 'staff_printer_sarah',
    name: 'Sarah Printworks',
    email: 'printer_sarah@cricketcloset.com',
    roleId: 'printing_staff',
    branchId: 'Melbourne Closets',
    status: 'active',
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-25T04:10:00Z',
    phone: '+61-491-570-004'
  },
  {
    uid: 'staff_cashier_clara',
    name: 'Clara Ledger',
    email: 'cashier_clara@cricketcloset.com',
    roleId: 'cashier',
    branchId: 'Melbourne Closets',
    status: 'active',
    createdAt: '2026-05-05T00:00:00Z',
    updatedAt: '2026-05-25T05:12:00Z',
    phone: '+61-491-570-005'
  },
  {
    uid: 'staff_inventory_kane',
    name: 'Kane Stockroom',
    email: 'inventory_kane@cricketcloset.com',
    roleId: 'inventory_manager',
    branchId: 'Melbourne Closets',
    status: 'active',
    createdAt: '2026-05-06T00:00:00Z',
    updatedAt: '2026-05-25T01:10:00Z',
    phone: '+61-491-570-006'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(!isCloudConnected);
  
  // Staff database which supports persistent simulations in local session
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>(() => {
    const cached = localStorage.getItem(LOCAL_STAFF_KEY);
    return cached ? JSON.parse(cached) : PREPOPULATED_STAFF;
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(staffMembers));
  }, [staffMembers]);

  // Monitor Auth Changes
  useEffect(() => {
    if (!isSandboxMode && isCloudConnected) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          try {
            // Retrieve User profile document from firestore
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              setProfile(userSnap.data() as UserProfile);
            } else {
              // Creating a generic Customer profile if document is absent
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Default ERP User',
                email: firebaseUser.email || '',
                roleId: 'super_admin', // Default to admin for easiest playout initialization
                branchId: 'Melbourne Closets',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await setDoc(userRef, newProfile);
              setProfile(newProfile);
            }
          } catch (e) {
            console.error("Error matching Firestore custom profile: ", e);
            // Standby mock profile lookup for failsafe
            setProfile({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Cloud Active Worker',
              email: firebaseUser.email || '',
              roleId: 'super_admin',
              branchId: 'Melbourne Closets',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Sandbox/Simulation mode - Load persistent local profiles if logged in
      const savedUser = localStorage.getItem(LOCAL_SANDBOX_USER_KEY);
      const savedProfile = localStorage.getItem(LOCAL_PROFILE_KEY);
      if (savedUser && savedProfile) {
        setUser(JSON.parse(savedUser));
        setProfile(JSON.parse(savedProfile));
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    }
  }, [isSandboxMode]);

  // Handle Permissions check
  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    const roleDef = ROLE_DEFINITIONS[profile.roleId];
    if (!roleDef) return false;
    return roleDef.permissions.includes('read:all') || roleDef.permissions.includes(permission);
  };

  // Login handler
  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      if (!isSandboxMode && isCloudConnected) {
        // Authenticate with actual Firebase auth
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        // Sandbox Mock Mode: look for matching credentials from prepopulated team profiles
        const matchedStaff = staffMembers.find(s => s.email.toLowerCase() === email.toLowerCase());
        
        // Custom password mapping simulator:
        // password is role name + '123' (e.g., 'super_admin123', 'manager123')
        // Or default to 'admin123' if not matched
        const resolvedRole = matchedStaff ? matchedStaff.roleId : 'super_admin';
        const expectedPass = resolvedRole === 'super_admin' ? 'admin123' : `${resolvedRole}123`;
        
        if (pass === expectedPass || pass === 'admin123') {
          const mockUser = {
            uid: matchedStaff?.uid || `sandbox_${Date.now()}`,
            email: email,
            displayName: matchedStaff?.name || email.split('@')[0],
            emailVerified: true
          } as FirebaseUser;

          const mockProfile: UserProfile = matchedStaff || {
            uid: mockUser.uid,
            name: mockUser.displayName || 'Sandbox Admin',
            email: email,
            roleId: 'super_admin',
            branchId: 'Melbourne Closets',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          };

          // Update login timestamps in list
          if (matchedStaff) {
            setStaffMembers(prev => prev.map(s => {
              if (s.uid === matchedStaff.uid) {
                return { ...s, lastLoginAt: new Date().toISOString() };
              }
              return s;
            }));
          }

          localStorage.setItem(LOCAL_SANDBOX_USER_KEY, JSON.stringify(mockUser));
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(mockProfile));
          setUser(mockUser);
          setProfile(mockProfile);
        } else {
          throw new Error("Invalid credentials passed. Please match password 'admin123' or [role_id]+'123' (e.g. manager123).");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In helper
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (!isSandboxMode && isCloudConnected) {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        // Mock Google login
        const mockUser = {
          uid: `google_${Date.now()}`,
          email: 'russi.khuraijam@gmail.com',
          displayName: 'Russi Khuraijam Google Auth',
          emailVerified: true
        } as FirebaseUser;

        const mockProfile: UserProfile = {
          uid: mockUser.uid,
          name: mockUser.displayName || 'Russi Khuraijam',
          email: mockUser.email || '',
          roleId: 'super_admin',
          branchId: 'Melbourne Closets',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };

        localStorage.setItem(LOCAL_SANDBOX_USER_KEY, JSON.stringify(mockUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(mockProfile));
        setUser(mockUser);
        setProfile(mockProfile);
      }
    } finally {
      setLoading(false);
    }
  };

  // User Register handler
  const register = async (email: string, pass: string, name: string, role: UserRole, branchId: string) => {
    setLoading(true);
    try {
      const defaultStatus = 'active';
      if (!isSandboxMode && isCloudConnected) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const userRef = doc(db, 'users', cred.user.uid);
        const newProfile: UserProfile = {
          uid: cred.user.uid,
          name,
          email,
          roleId: role,
          branchId,
          status: defaultStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      } else {
        // Mock register context
        const newUid = `staff_${Date.now()}`;
        const newProfile: UserProfile = {
          uid: newUid,
          name,
          email,
          roleId: role,
          branchId,
          status: defaultStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const mockUser = {
          uid: newUid,
          email,
          displayName: name,
          emailVerified: true
        } as FirebaseUser;

        // Add to staff list of simulation
        setStaffMembers(prev => [...prev, newProfile]);

        localStorage.setItem(LOCAL_SANDBOX_USER_KEY, JSON.stringify(mockUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProfile));
        setUser(mockUser);
        setProfile(newProfile);
      }
    } finally {
      setLoading(false);
    }
  };

  // Password reset handler
  const resetPassword = async (email: string) => {
    if (!isSandboxMode && isCloudConnected) {
      await sendPasswordResetEmail(auth, email);
    } else {
      // Mock simulation reset email success response
      const matched = staffMembers.some(s => s.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        alert(`Sandbox Mode: Password reset instructions dispatched to account '${email}'! In offline sandbox, simply sign in with standard password '[role_id]123' (e.g. manager123) or 'admin123'`);
      } else {
        throw new Error("Specified user email is not registered inside our staff directory database.");
      }
    }
  };

  // Logout handler
  const logout = async () => {
    setLoading(true);
    try {
      if (!isSandboxMode && isCloudConnected) {
        await signOut(auth);
      } else {
        localStorage.removeItem(LOCAL_SANDBOX_USER_KEY);
        localStorage.removeItem(LOCAL_PROFILE_KEY);
      }
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Admin capability: UPDATE USER ROLE
  const updateUserRole = async (uid: string, nextRole: UserRole) => {
    // Audit check: Active user must be Super Admin
    if (profile?.roleId !== 'super_admin') {
      throw new Error("Unauthorized privilege violation: Must be Super Admin to alter employee authorization mappings.");
    }

    if (!isSandboxMode && isCloudConnected) {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        roleId: nextRole,
        updatedAt: new Date().toISOString()
      });
    }

    // Always mirror to our active memory simulation registry for seamless display
    setStaffMembers(prev => prev.map(member => {
      if (member.uid === uid) {
        return {
          ...member,
          roleId: nextRole,
          updatedAt: new Date().toISOString()
        };
      }
      return member;
    }));

    // If super admin altered their own account, update direct context profile too
    if (profile && profile.uid === uid) {
      setProfile(prev => prev ? { ...prev, roleId: nextRole } : null);
    }
  };

  // Admin capability: TOGGLE STATUS (ACTIVE / SUSPENDED)
  const toggleUserProfileStatus = async (uid: string, nextStatus: 'active' | 'suspended') => {
    if (profile?.roleId !== 'super_admin') {
      throw new Error("Unauthorized privilege violation: Must be Super Admin to adjust account operational status.");
    }

    if (!isSandboxMode && isCloudConnected) {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    }

    setStaffMembers(prev => prev.map(member => {
      if (member.uid === uid) {
        return {
          ...member,
          status: nextStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return member;
    }));
  };

  // Admin capability: ENLIST NEW INVITATIONS / STAFF RECORD
  const inviteStaffMember = async (name: string, email: string, role: UserRole, branchId: string) => {
    if (profile?.roleId !== 'super_admin') {
      throw new Error("Unauthorized: Super Admin access required.");
    }

    const exists = staffMembers.some(s => s.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      throw new Error("Staff account with this business email has already been registered.");
    }

    const invitationUid = `staff_invited_${Date.now()}`;
    const newStaff: UserProfile = {
      uid: invitationUid,
      name,
      email,
      roleId: role,
      branchId,
      status: 'invited',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phone: '+61-491-570-' + Math.floor(100 + Math.random() * 900)
    };

    if (!isSandboxMode && isCloudConnected) {
      const userRef = doc(db, 'users', invitationUid);
      await setDoc(userRef, newStaff);
    }

    setStaffMembers(prev => [newStaff, ...prev]);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isSandboxMode,
      staffMembers,
      hasPermission,
      login,
      register,
      resetPassword,
      logout,
      loginWithGoogle,
      updateUserRole,
      toggleUserProfileStatus,
      inviteStaffMember
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be consumed strictly within an AuthProvider root.');
  }
  return context;
};
