'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '@/lib/utils';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthState | null>(null);

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage and validate token
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const storedUser  = localStorage.getItem(STORAGE_KEYS.USER);

    if (storedToken && !isTokenExpired(storedToken)) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      }
    } else if (storedToken) {
      // Token exists but expired — clear silently
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }

    setIsLoading(false);
  }, []);

  // Listen for 401s dispatched by the API client
  useEffect(() => {
    function onExpired() {
      setUser(null);
      setToken(null);
    }
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const setAuth = useCallback((newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, setAuth, clearAuth, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthStore(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthStore must be used inside <AuthProvider>');
  return ctx;
}
