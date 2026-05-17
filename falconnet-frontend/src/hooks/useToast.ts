'use client';

import { useUIStore, type ToastType } from '@/store/ui.store';

export function useToast() {
  const { toasts, addToast, removeToast, clearToasts } = useUIStore();

  return {
    toasts,
    toast:   (message: string, type: ToastType = 'info', duration?: number) =>
               addToast({ message, type, duration }),
    success: (message: string, duration?: number) =>
               addToast({ message, type: 'success', duration }),
    error:   (message: string, duration?: number) =>
               addToast({ message, type: 'error', duration }),
    warning: (message: string, duration?: number) =>
               addToast({ message, type: 'warning', duration }),
    info:    (message: string, duration?: number) =>
               addToast({ message, type: 'info', duration }),
    dismiss: removeToast,
    clear:   clearToasts,
  };
}
