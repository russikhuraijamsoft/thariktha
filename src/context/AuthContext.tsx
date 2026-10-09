import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import type { UserProfile } from '../types/auth';
import { ApiError, createErpApi } from '../services/erpApi';
import { createSessionLoader, type SessionState } from '../services/erpSession';
import { createGoogleSignInProvider } from '../services/googleSignIn';

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
  const [session, setSession] = useState<SessionState<User>>({ user: null, profile: null, loading: true, sessionError: '' });
  const loader = useMemo(() => createSessionLoader<User>(
    // Bind each session request to its captured identity, not a later currentUser.
    current => createErpApi(() => current.getIdToken()).session(),
    setSession,
  ), []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, current => { void loader.load(current); });
    return () => { loader.cancel(); unsubscribe(); };
  }, [loader]);
  return <AuthContext.Provider value={{ ...session,
    login: async (email, password) => { await signInWithEmailAndPassword(auth, email, password); },
    loginWithGoogle: async () => { await signInWithPopup(auth, createGoogleSignInProvider()); },
    resetPassword: email => sendPasswordResetEmail(auth, email),
    logout: async () => { await signOut(auth); },
    refreshSession: () => loader.load(auth.currentUser),
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required.');
  return context;
}
