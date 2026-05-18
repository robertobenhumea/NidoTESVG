'use client';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div
      style={{
        margin: 0,
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#0a0a0b',
        color: '#f5f5f7',
        padding: '1rem',
        textAlign: 'center',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: 16,
          background: '#ef4444', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: '#fff',
        }}
      >
        !
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
        Algo salió mal
      </h1>
      <p style={{ color: '#a1a1aa', margin: 0, maxWidth: 280, lineHeight: 1.6 }}>
        Ocurrió un error crítico. Intenta recargar la página.
      </p>
      {process.env.NODE_ENV === 'development' && error?.message && (
        <pre
          style={{
            fontSize: '0.7rem', color: '#f87171', textAlign: 'left',
            maxWidth: 400, overflowX: 'auto', background: '#1a1a1d',
            padding: '0.75rem', borderRadius: 8, whiteSpace: 'pre-wrap',
          }}
        >
          {error.message}
        </pre>
      )}
      <button
        onClick={unstable_retry}
        style={{
          height: 36, padding: '0 1.25rem', borderRadius: 10,
          background: '#2563eb', color: '#fff', border: 'none',
          fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
        }}
      >
        Reintentar
      </button>
      <a
        href="/"
        style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: 4 }}
      >
        Volver al inicio
      </a>
    </div>
  );
}
