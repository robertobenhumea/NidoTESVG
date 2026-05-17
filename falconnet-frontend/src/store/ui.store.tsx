'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface UIState {
  toasts: ToastItem[];
  isPageLoading: boolean;
  addToast: (opts: { type: ToastType; message: string; duration?: number }) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setPageLoading: (v: boolean) => void;
}

const UIContext = createContext<UIState | null>(null);

let toastId = 0;

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(false);

  const addToast = useCallback(
    ({ type, message, duration = 4000 }: { type: ToastType; message: string; duration?: number }) => {
      const id = String(++toastId);
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    },
    [],
  );

  const removeToast = useCallback(
    (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  const clearToasts = useCallback(() => setToasts([]), []);

  const setPageLoading = useCallback((v: boolean) => setIsPageLoading(v), []);

  return (
    <UIContext.Provider
      value={{ toasts, isPageLoading, addToast, removeToast, clearToasts, setPageLoading }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUIStore(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIStore must be used inside UIProvider');
  return ctx;
}
