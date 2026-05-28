'use client';

import { useEffect, type ReactNode } from 'react';
import { ThemeProvider } from '@/store/theme.store';
import { AuthProvider } from '@/store/auth.store';
import { UIProvider } from '@/store/ui.store';
import { Toaster } from '@/components/ui/Toast';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { enableChatPush } from '@/lib/chatPush';

/**
 * Registers the PWA service worker on first client load.
 * Silently ignored in environments that don't support SW.
 */
function PWASetup() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (!config.features.pwa) {
      // In dev, unregister any lingering SW so it never serves stale chunks
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    navigator.serviceWorker
      .register(config.sw.path, { scope: config.sw.scope })
      .then((reg) => {
        logger.debug('SW registered', { scope: reg.scope });
        void enableChatPush().catch(() => undefined);
      })
      .catch((err) => logger.warn('SW registration failed', { error: String(err) }));
  }, []);

  return null;
}

/**
 * Composition root — order matters:
 * ThemeProvider must be outermost (others may read theme state).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UIProvider>
          <PWASetup />
          {children}
          <Toaster />
        </UIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
