import React, { createContext, useContext, useState } from 'react';
import { getToken, setToken, clearToken } from './authToken';
import type { AuthUser } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

/**
 * Décode le payload d'un JWT (base64url) sans vérifier la signature.
 * La vérification a lieu côté backend à chaque requête protégée.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // base64url → base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tokenToUser(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload['sub'] !== 'string') return null;
  return {
    uid: payload['sub'] as string,
    email: typeof payload['email'] === 'string' ? payload['email'] : undefined,
    displayName: typeof payload['displayName'] === 'string' ? payload['displayName'] : undefined,
  };
}

interface InitialAuthState {
  user: AuthUser | null;
  token: string | null;
}

/**
 * Initialisation synchrone depuis localStorage (localStorage est synchrone —
 * pas besoin de useEffect, pas de flash "non authentifié").
 */
function readFromStorage(): InitialAuthState {
  const stored = getToken();
  if (!stored) return { user: null, token: null };
  const decoded = tokenToUser(stored);
  if (!decoded) {
    clearToken();
    return { user: null, token: null };
  }
  return { user: decoded, token: stored };
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /** Toujours false : initialisation synchrone depuis localStorage */
  loading: false;
  googleLoginUrl: string;
  logout: () => void;
  /** Appelé par AuthCallbackPage après réception du token OAuth */
  setAuthToken: (token: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<InitialAuthState>(() => readFromStorage());

  function logout() {
    clearToken();
    setAuthState({ user: null, token: null });
  }

  function setAuthToken(newToken: string) {
    setToken(newToken);
    const decoded = tokenToUser(newToken);
    if (decoded) {
      setAuthState({ user: decoded, token: newToken });
    }
  }

  const googleLoginUrl = `${API_BASE_URL}/auth/google`;

  const value: AuthState = {
    user: authState.user,
    token: authState.token,
    loading: false,
    googleLoginUrl,
    logout,
    setAuthToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return ctx;
}
