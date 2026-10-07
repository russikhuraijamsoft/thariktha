import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { ROLES, type UserProfile } from '../types/auth';
import { ApiError, createErpApi, errorMessage } from '../services/erpApi';

export const erpApi = createErpApi(async () => {
  if (!auth.currentUser) throw new ApiError('AUTH_REQUIRED', 'Sign in to access the ERP.', 401);
  return auth.currentUser.getIdToken();
});
interface AuthContextType {
  user: User | null; profile: UserProfile | null; loading: boolean; sessionError: string;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>; logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>; refreshSession: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const generation = useRef(0);
  async function loadSession(current: User | null) {
    const version = ++generation.current;
    setUser(current); setProfile(null); setSessionError(''); setLoading(true);
    try {
      if (current) {
        const actor = await erpApi.session();
        if (!actor || actor.uid !== current.uid || !ROLES.includes(actor.role) || !actor.companyId || !actor.branchId) {
          throw new ApiError('PROVISIONING_REQUIRED', 'A valid active ERP profile with company, branch and role is required.', 403);
        }
        if (version === generation.current) setProfile(actor);
      }
    } catch (error) {
      if (version === generation.current) setSessionError(error instanceof ApiError && [403, 404].includes(error.status)
        ? `Provisioning required or access disabled. Ask an authorized operator to provision an active users/${current?.uid} profile. ${errorMessage(error)}`
        : errorMessage(error));
    } finally { if (version === generation.current) setLoading(false); }
  }
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, current => { void loadSession(current); });
    return () => { generation.current++; unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={{ user, profile, loading, sessionError,
    login: async (email, password) => { await signInWithEmailAndPassword(auth, email, password); },
    loginWithGoogle: async () => { await signInWithPopup(auth, new GoogleAuthProvider()); },
    resetPassword: email => sendPasswordResetEmail(auth, email),
    logout: async () => { await signOut(auth); },
    refreshSession: () => loadSession(auth.currentUser),
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required.');
  return context;
}
