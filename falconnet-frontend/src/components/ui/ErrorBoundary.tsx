'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { logger } from '@/lib/logger';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  /** Custom fallback — receives the error and a reset function */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ErrorBoundary caught', {
      message: error.message,
      stack:   info.componentStack ?? '',
    });
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { fallback, children } = this.props;

    if (error) {
      if (typeof fallback === 'function') return fallback(error, this.reset);
      if (fallback) return fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="size-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="size-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
              <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeWidth={2.5}/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Algo salió mal
            </p>
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                {error.message}
              </p>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={this.reset}>
            Reintentar
          </Button>
        </div>
      );
    }

    return children;
  }
}

export { ErrorBoundary };
