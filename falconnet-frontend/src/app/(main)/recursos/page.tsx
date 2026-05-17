'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { api } from '@/services/api';
import { STORAGE_KEYS, timeAgo } from '@/lib/utils';

type RecursoTipo = 'apunte' | 'libro' | 'ejercicio' | 'otro';

interface Recurso {
  id: number;
  titulo: string;
  descripcion?: string;
  archivoUrl?: string;
  tipo: RecursoTipo;
  carrera?: string;
  materia?: string;
  usuarioId: number;
  autorNombre?: string;
  fecha: string;
  descargas: number;
}

const TIPO_LABELS: Record<RecursoTipo, string> = {
  apunte:   'Apunte',
  libro:    'Libro',
  ejercicio:'Ejercicio',
  otro:     'Otro',
};

const TIPO_ICONS: Record<RecursoTipo, string> = {
  apunte:   '📝',
  libro:    '📚',
  ejercicio:'✏️',
  otro:     '📎',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

async function uploadFile(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
  const form = new FormData();
  form.append('archivo', file);
  const res = await fetch(`${API_BASE}/recursos/subir-archivo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Error al subir');
    throw new Error(msg);
  }
  const data = await res.json() as { url: string };
  return data.url.startsWith('http') ? data.url : `${API_BASE.replace(/\/$/, '')}${data.url.startsWith('/') ? data.url : `/${data.url}`}`;
}

function UploadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [titulo, setTitulo]   = useState('');
  const [desc, setDesc]       = useState('');
  const [tipo, setTipo]       = useState<RecursoTipo>('apunte');
  const [carrera, setCarrera] = useState('');
  const [materia, setMateria] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { setError('El título es requerido.'); return; }
    if (!file) { setError('Selecciona un archivo.'); return; }
    setLoading(true); setError('');
    try {
      const archivoUrl = await uploadFile(file);
      await api.post('/recursos', {
        titulo: titulo.trim(),
        descripcion: desc.trim() || undefined,
        archivoUrl,
        tipo,
        carrera: carrera.trim() || undefined,
        materia: materia.trim() || undefined,
      });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al subir.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Subir recurso</h2>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-elevated)] cursor-pointer hover:border-[var(--brand)] transition-colors"
          >
            <svg className="size-6 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/></svg>
            <p className="text-xs text-[var(--text-muted)]">{file ? file.name : 'Toca para seleccionar archivo'}</p>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,image/*" className="hidden"
              onChange={(ev) => { const f = ev.target.files?.[0]; if (f) setFile(f); ev.target.value = ''; }} />
          </div>

          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título *" maxLength={120}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción (opcional)" rows={2} maxLength={400}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] resize-none" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as RecursoTipo)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:outline-none">
                {(Object.keys(TIPO_LABELS) as RecursoTipo[]).map((t) => (
                  <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Carrera</label>
              <input value={carrera} onChange={(e) => setCarrera(e.target.value)} placeholder="Ej: ISC"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none" />
            </div>
          </div>
          <input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Materia (opcional)" maxLength={80}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none" />

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 h-9 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors">
              {loading ? 'Subiendo…' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecursoCard({ r, onDownload }: { r: Recurso; onDownload: (id: number) => void }) {
  const ext = r.archivoUrl?.split('.').pop()?.toLowerCase() ?? '';
  const isImage = ['jpg','jpeg','png','gif','webp'].includes(ext);

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 flex gap-3">
      <div className="size-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-2xl shrink-0">
        {TIPO_ICONS[r.tipo]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{r.titulo}</p>
          <span className="text-[10px] font-medium text-[var(--brand)] bg-[var(--brand-muted)] rounded-full px-2 py-0.5 shrink-0">
            {TIPO_LABELS[r.tipo]}
          </span>
        </div>
        {r.descripcion && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{r.descripcion}</p>}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {r.carrera && <span className="text-xs text-[var(--text-muted)]">{r.carrera}</span>}
          {r.materia && <span className="text-xs text-[var(--text-muted)]">· {r.materia}</span>}
          <span className="text-xs text-[var(--text-muted)] ml-auto">{r.descargas} descargas · {timeAgo(r.fecha)}</span>
        </div>
        {r.archivoUrl && (
          <a
            href={r.archivoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onDownload(r.id)}
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-[var(--brand)] hover:underline"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/></svg>
            {isImage ? 'Ver imagen' : 'Descargar'}
          </a>
        )}
      </div>
    </div>
  );
}

export default function RecursosPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploadOpen, setUpload] = useState(false);
  const [carrera, setCarrera]   = useState('');
  const [materia, setMateria]   = useState('');
  const [tipo, setTipo]         = useState('');

  const load = async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (carrera) qs.set('carrera', carrera);
    if (materia) qs.set('materia', materia);
    if (tipo) qs.set('tipo', tipo);
    try {
      setRecursos(await api.get<Recurso[]>(`/recursos?${qs}`));
    } catch { setRecursos([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [carrera, materia, tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDownload(id: number) {
    api.post(`/recursos/${id}/descargar`).catch(() => {});
    setRecursos((p) => p.map((r) => r.id === id ? { ...r, descargas: r.descargas + 1 } : r));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Recursos educativos</h1>
        <button onClick={() => setUpload(true)}
          className="h-9 px-4 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] transition-colors">
          + Subir
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={carrera} onChange={(e) => setCarrera(e.target.value)} placeholder="Carrera" maxLength={20}
          className="h-8 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none w-28" />
        <input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Materia" maxLength={40}
          className="h-8 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none w-36" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}
          className="h-8 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:outline-none">
          <option value="">Todos los tipos</option>
          {(Object.keys(TIPO_LABELS) as RecursoTipo[]).map((t) => (
            <option key={t} value={t}>{TIPO_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : recursos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 select-none">📂</div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Sin recursos aún</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">¡Sé el primero en compartir material!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recursos.map((r) => <RecursoCard key={r.id} r={r} onDownload={handleDownload} />)}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          onClose={() => setUpload(false)}
          onCreated={() => { setUpload(false); load(); }}
        />
      )}
    </div>
  );
}
