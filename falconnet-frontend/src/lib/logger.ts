const isDev = process.env.NODE_ENV === 'development';

type Meta = Record<string, unknown>;

function fmt(level: string, msg: string, meta?: Meta): string {
  return `[FN:${level}] ${msg}`;
}

export const logger = {
  info(msg: string, meta?: Meta): void {
    if (isDev) console.info(fmt('INFO', msg), meta ?? '');
  },

  debug(msg: string, meta?: Meta): void {
    if (isDev) console.debug(fmt('DEBUG', msg), meta ?? '');
  },

  warn(msg: string, meta?: Meta): void {
    console.warn(fmt('WARN', msg), meta ?? '');
  },

  error(msg: string, meta?: Meta): void {
    console.error(fmt('ERROR', msg), meta ?? '');
    // Phase 3: send to error tracking service (e.g. Sentry)
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureMessage(msg, { level: 'error', extra: meta });
    // }
  },

  /** Measure time for an async operation (dev only). */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!isDev) return fn();
    const start = performance.now();
    try {
      const result = await fn();
      console.debug(fmt('PERF', `${label} — ${(performance.now() - start).toFixed(1)}ms`));
      return result;
    } catch (err) {
      console.error(fmt('PERF', `${label} FAILED — ${(performance.now() - start).toFixed(1)}ms`));
      throw err;
    }
  },
};
