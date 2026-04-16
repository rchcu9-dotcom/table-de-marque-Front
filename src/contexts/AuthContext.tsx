import React, { createContext, useContext } from 'react';
import { useFirebaseAuth, type FirebaseAuthState } from '../firebase/useFirebaseAuth';

const AuthContext = createContext<FirebaseAuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): FirebaseAuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return ctx;
}
