'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/services/api';
import { STORAGE_KEYS, cn } from '@/lib/utils';
import type { AudienciaInfo, BuzonOficialItem, BUser, CarreraInfo, UsuarioInstitucional } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const MAX_ATTACHMENTS = 6;
const MAX_FILE_MB      = 25;
const MAX_FILE_BYTES   = MAX_FILE_MB * 1024 * 1024;

const ALLOWED_EXTS = new Set([
  'pdf','doc','docx','xls','xlsx','ppt','pptx',
  'txt','png','jpg','jpeg','gif','webp','zip',
  'mp4','mov','webm',
]);

const CATEGORY_OPTIONS = [
  { value: 'GENERAL',       label: 'General' },
  { value: 'ACADEMICO',     label: 'Académico' },
  { value: 'INSTITUCIONAL', label: 'Institucional' },
  { value: 'COORDINACION',  label: 'Coordinación' },
  { value: 'TRAMITE',       label: 'Trámite' },
  { value: 'JUSTIFICANTE',  label: 'Justificante' },
  { value: 'SOLICITUD',     label: 'Solicitud' },
  { value: 'REPORTE',       label: 'Reporte' },
  { value: 'DUDA',          label: 'Duda' },
  { value: 'EQUIPOS',       label: 'Equipos' },
  { value: 'MARKETPLACE',   label: 'Marketplace' },
  { value: 'EVENTOS',       label: 'Eventos' },
  { value: 'IMPORTANTE',    label: 'Importante' },
];

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function fileExt(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function formatSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const EXT_COLORS: Record<string, string> = {
  pdf:  'bg-red-500/10 text-red-600 dark:text-red-400',
  doc:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  docx: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  xls:  'bg-green-500/10 text-green-600 dark:text-green-400',
  xlsx: 'bg-green-500/10 text-green-600 dark:text-green-400',
  ppt:  'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  pptx: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  txt:  'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
  zip:  'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

type ComposeMode = 'compose' | 'reply' | 'replyAll' | 'forward';

interface ComposeModalProps {
  onClose:         () => void;
  onSent:          () => void;
  mode?:           ComposeMode;
  initialTo?:      BUser[];
  initialSubject?: string;
  initialBody?:    string;
  threadId?:       number;
  parentId?:       number;
}

export function ComposeModal({ onClose, onSent, mode = 'compose', initialTo, initialSubject, initialBody, threadId, parentId }: ComposeModalProps) {
  // Individual recipient state
  const [users, setUsers]               = useState<BUser[]>([]);
  const [toSearch, setToSearch]         = useState('');
  const [selectedTo, setSelectedTo]     = useState<BUser[]>(initialTo ?? []);
  // Compose fields
  const [asunto, setAsunto]             = useState(initialSubject ?? '');
  const [cuerpo, setCuerpo]             = useState(initialBody ?? '');
  const [categoria, setCategoria]       = useState('GENERAL');
  const [attachments, setAttachments]   = useState<File[]>([]);
  const [progress, setProgress]         = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [loading, setLoading]           = useState(false);
  const [loadingCoord, setLoadingCoord] = useState(false);
  const [error, setError]               = useState('');
  const [sent, setSent]                 = useState(false);
  // Audience picker state
  type RecipientMode = 'individual' | 'grupo' | 'carrera' | 'buzon';
  const [recipientMode, setRecipientMode] = useState<RecipientMode>(
    mode === 'reply' || mode === 'replyAll' || mode === 'forward' ? 'individual' : 'individual'
  );
  const [audienciaInfo, setAudienciaInfo]     = useState<AudienciaInfo | null>(null);
  const [audienciaLoading, setAudienciaLoading] = useState(false);
  const [selectedCarrera, setSelectedCarrera]  = useState('');
  const [selectedGrupo, setSelectedGrupo]      = useState('');
  const [buzones, setBuzones]                  = useState<BuzonOficialItem[]>([]);
  const [selectedBuzon, setSelectedBuzon]      = useState<BuzonOficialItem | null>(null);
  const [buzonesLoading, setBuzonesLoading]    = useState(false);
  const [audienciaPreview, setAudienciaPreview] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);

  function userLabel(user: BUser): string {
    return user.username || user.correo?.split('@')[0] || `Usuario #${user.id}`;
  }

  useEffect(() => {
    api.get<BUser[]>('/usuarios', { suppressAuthExpiry: true })
      .then(data => setUsers(data.filter(u => u.activo !== false)))
      .catch(() => {});
    const focusTarget = initialTo?.length ? textareaRef : searchRef;
    setTimeout(() => focusTarget.current?.focus(), 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 260) + 'px';
  }, [cuerpo]);

  const filteredUsers = toSearch.trim().length > 0
    ? users
        .filter(u =>
          `${u.username ?? ''} ${u.correo ?? ''}`.toLowerCase().includes(toSearch.toLowerCase()) &&
          !selectedTo.find(s => s.id === u.id)
        )
        .slice(0, 5)
    : [];

  async function handleAddCoordinacion() {
    setLoadingCoord(true);
    try {
      const coords = await api.get<UsuarioInstitucional[]>(
        '/correos/destinatarios/coordinacion',
        { suppressAuthExpiry: true }
      );
      const toAdd = coords.filter(u => !selectedTo.find(s => s.id === u.id));
      if (toAdd.length === 0) return;
      setSelectedTo(prev => [
        ...prev,
        ...toAdd.map(u => ({
          id:         u.id,
          username:   u.nombre ?? u.username,
          correo:     u.correo,
          fotoPerfil: u.fotoPerfil,
          carrera:    u.carrera,
          grupo:      u.grupo,
          rol:        u.rol,
          rolLabel:   u.rolLabel,
        } as BUser)),
      ]);
      if (categoria === 'GENERAL') setCategoria('COORDINACION');
    } catch {
      // silently ignore
    } finally {
      setLoadingCoord(false);
    }
  }

  async function loadAudienciaInfo() {
    if (audienciaInfo || audienciaLoading) return;
    setAudienciaLoading(true);
    try {
      const data = await api.get<AudienciaInfo>('/correos/destinatarios/info-academica', { suppressAuthExpiry: true });
      setAudienciaInfo(data);
    } catch {
      // ignore — show empty state
    } finally {
      setAudienciaLoading(false);
    }
  }

  async function loadBuzones() {
    if (buzones.length > 0 || buzonesLoading) return;
    setBuzonesLoading(true);
    try {
      const data = await api.get<BuzonOficialItem[]>('/correos/buzones', { suppressAuthExpiry: true });
      setBuzones(data);
    } catch {
      // ignore
    } finally {
      setBuzonesLoading(false);
    }
  }

  function switchRecipientMode(newMode: RecipientMode) {
    setRecipientMode(newMode);
    setError('');
    setAudienciaPreview(null);
    if (newMode === 'grupo' || newMode === 'carrera') void loadAudienciaInfo();
    if (newMode === 'buzon') void loadBuzones();
  }

  function currentCarreraInfo(): CarreraInfo | undefined {
    return audienciaInfo?.carreras.find(c => c.nombre === selectedCarrera);
  }

  // Update audienciaPreview when carrera/grupo selection changes
  useEffect(() => {
    if (recipientMode === 'carrera' && selectedCarrera) {
      const c = audienciaInfo?.carreras.find(x => x.nombre === selectedCarrera);
      setAudienciaPreview(c ? c.totalEstudiantes + c.totalDocentes : null);
    } else if (recipientMode === 'grupo' && selectedCarrera && selectedGrupo) {
      const c = audienciaInfo?.carreras.find(x => x.nombre === selectedCarrera);
      const g = c?.grupos.find(x => x.nombre === selectedGrupo);
      setAudienciaPreview(g ? g.totalEstudiantes : null);
    } else {
      setAudienciaPreview(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCarrera, selectedGrupo, recipientMode, audienciaInfo]);

  function validateAndAddFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newFiles: File[] = [];
    const rejected: string[] = [];

    Array.from(fileList).forEach(file => {
      if (attachments.length + newFiles.length >= MAX_ATTACHMENTS) {
        rejected.push(`${file.name}: límite de ${MAX_ATTACHMENTS} archivos alcanzado`);
        return;
      }
      const ext = fileExt(file.name);
      if (!ALLOWED_EXTS.has(ext)) {
        rejected.push(`${file.name}: tipo no permitido (.${ext})`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name}: excede ${MAX_FILE_MB} MB`);
        return;
      }
      newFiles.push(file);
    });

    if (rejected.length > 0) setError(rejected.join(' · '));
    if (newFiles.length > 0) {
      setError('');
      setAttachments(prev => [...prev, ...newFiles]);
    }
  }

  function uploadAttachment(correoId: number, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr  = new XMLHttpRequest();
      const form = new FormData();
      form.append('archivo', file);
      xhr.open('POST', `${BASE_URL}/correos/${correoId}/adjunto`);
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = event => {
        if (!event.lengthComputable) return;
        setProgress(prev => ({
          ...prev,
          [file.name]: Math.round((event.loaded / event.total) * 100),
        }));
      };
      xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`${xhr.status}`));
      xhr.onerror = () => reject(new Error('network'));
      xhr.send(form);
    });
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!asunto.trim()) { setError('El asunto es requerido.'); return; }
    if (!cuerpo.trim()) { setError('Escribe el cuerpo del mensaje.'); return; }

    // Validate recipient selection by mode
    if (recipientMode === 'individual' && !selectedTo.length) {
      setError('Agrega al menos un destinatario.'); return;
    }
    if (recipientMode === 'carrera' && !selectedCarrera) {
      setError('Selecciona una carrera.'); return;
    }
    if (recipientMode === 'grupo' && (!selectedCarrera || !selectedGrupo)) {
      setError('Selecciona carrera y grupo.'); return;
    }
    if (recipientMode === 'buzon' && !selectedBuzon) {
      setError('Selecciona un buzón oficial.'); return;
    }

    setLoading(true);
    setError('');
    setUploadErrors([]);

    const tipo = categoria === 'ACADEMICO'     ? 'ACADEMICO'
               : categoria === 'INSTITUCIONAL' ? 'INSTITUCIONAL'
               : categoria === 'COORDINACION'  ? 'COORDINACION'
               : 'PERSONAL';

    try {
      let correoId: number;

      if (recipientMode === 'buzon' && selectedBuzon) {
        // Send to official mailbox
        const response = await api.post<{ id: number }>(`/correos/buzones/${selectedBuzon.id}/enviar`, {
          asunto: asunto.trim(),
          cuerpo: cuerpo.trim(),
          categoria: 'INSTITUCIONAL',
          tipo: 'INSTITUCIONAL',
        }, { suppressAuthExpiry: true });
        correoId = response.id;

      } else if (recipientMode === 'carrera' || recipientMode === 'grupo') {
        // Mass send
        const audienciaType = recipientMode === 'grupo' ? 'GRUPO' : 'CARRERA';
        const response = await api.post<{ id: number }>('/correos/enviar-masivo', {
          asunto:    asunto.trim(),
          cuerpo:    cuerpo.trim(),
          audiencia: audienciaType,
          carrera:   selectedCarrera,
          grupo:     recipientMode === 'grupo' ? selectedGrupo : undefined,
          categoria,
          tipo,
        }, { suppressAuthExpiry: true });
        correoId = response.id;

      } else {
        // Individual send
        const tipoAccion = mode === 'reply'    ? 'RESPUESTA'
                         : mode === 'replyAll' ? 'RESPUESTA_TODOS'
                         : mode === 'forward'  ? 'REENVIO'
                         : undefined;

        const response = await api.post<{ id: number }>('/correos/enviar', {
          asunto:      asunto.trim(),
          cuerpo:      cuerpo.trim(),
          receptorIds: selectedTo.map(u => u.id),
          categoria,
          tipo,
          ...(tipoAccion && { tipoAccion }),
          ...(threadId   && { threadId }),
          ...(parentId   && { parentId }),
        }, { suppressAuthExpiry: true });
        correoId = response.id;
      }

      // Upload attachments for all send modes
      const failed: string[] = [];
      for (const file of attachments) {
        try {
          await uploadAttachment(correoId, file);
        } catch {
          failed.push(file.name);
        }
      }

      setSent(true);
      if (failed.length > 0) setUploadErrors(failed);
      setTimeout(onSent, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar. Intenta de nuevo.';
      setError(msg.includes('403') ? 'Sin permiso para este tipo de envío.' : 'Error al enviar. Intenta de nuevo.');
      setLoading(false);
    }
  }

  const canSend = !loading && asunto.trim().length > 0 && cuerpo.trim().length > 0 && (
    (recipientMode === 'individual' && selectedTo.length > 0) ||
    (recipientMode === 'carrera'   && selectedCarrera.length > 0) ||
    (recipientMode === 'grupo'     && selectedCarrera.length > 0 && selectedGrupo.length > 0) ||
    (recipientMode === 'buzon'     && selectedBuzon !== null)
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-xl bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle — mobile */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
              {mode === 'reply'    ? 'Responder'
               : mode === 'replyAll' ? 'Responder a todos'
               : mode === 'forward'  ? 'Reenviar mensaje'
               : 'Nuevo correo institucional'}
            </h2>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">FalconNet Mail · TESVG</p>
          </div>
          <button
            onClick={onClose}
            className="size-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Cerrar"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Sent success */}
        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-14 animate-fade-in">
            <div className="size-14 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
              <svg className="size-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">¡Correo enviado!</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Puedes verlo en la bandeja de Enviados</p>
            </div>
            {uploadErrors.length > 0 && (
              <div className="w-full max-w-xs bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">
                <p className="font-semibold mb-1">No se subieron {uploadErrors.length} adjunto{uploadErrors.length !== 1 ? 's' : ''}:</p>
                {uploadErrors.map(f => <p key={f} className="truncate">• {f}</p>)}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">

              {/* Para / Destinatarios */}
              <div className="px-4 pt-3 pb-3 border-b border-[var(--border)]">

                {/* Mode switcher tabs — compose only */}
                {mode === 'compose' && (
                  <div className="flex gap-1 mb-3 p-0.5 bg-[var(--bg-elevated)] rounded-xl">
                    {(['individual', 'grupo', 'carrera', 'buzon'] as const).map(m => {
                      const labels = { individual: 'Individual', grupo: 'Grupo', carrera: 'Carrera', buzon: 'Buzón' } as const;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => switchRecipientMode(m)}
                          className={cn(
                            'flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all',
                            recipientMode === m
                              ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-sm'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
                          )}
                        >
                          {labels[m]}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── INDIVIDUAL ── */}
                {recipientMode === 'individual' && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[var(--text-muted)] shrink-0 w-9 select-none">Para</span>
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={handleAddCoordinacion}
                        disabled={loadingCoord}
                        className={cn(
                          'flex items-center gap-1 h-6 px-2.5 rounded-lg border text-[11px] font-semibold transition-colors',
                          loadingCoord
                            ? 'border-[var(--border)] text-[var(--text-muted)] cursor-wait'
                            : 'border-[var(--brand)]/40 text-[var(--brand)] bg-[var(--brand-muted)] hover:bg-[var(--brand)] hover:text-white',
                        )}
                        title="Agregar coordinación de la carrera"
                      >
                        {loadingCoord ? (
                          <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        )}
                        Coordinación
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {selectedTo.map(u => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full bg-[var(--brand-muted)] text-[var(--brand-text)] text-xs font-medium max-w-[200px]"
                        >
                          <Avatar src={resolveUrl(u.fotoPerfil)} name={userLabel(u)} size="xs" />
                          <span className="truncate">{userLabel(u)}</span>
                          {u.rol && ['AUTORIDAD','ADMIN','DIRECCION'].includes(u.rol) && (
                            <span className="text-[8px] bg-[var(--brand)] text-white px-1 rounded-full font-bold">COORD</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedTo(p => p.filter(x => x.id !== u.id))}
                            className="ml-0.5 size-3.5 flex items-center justify-center rounded-full hover:bg-[var(--brand)] hover:text-white transition-colors shrink-0"
                            aria-label={`Quitar ${userLabel(u)}`}
                          >
                            <svg className="size-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      <input
                        ref={searchRef}
                        value={toSearch}
                        onChange={e => setToSearch(e.target.value)}
                        placeholder={selectedTo.length === 0 ? 'Busca un usuario…' : ''}
                        className="flex-1 min-w-[100px] text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none py-0.5"
                      />
                    </div>

                    {filteredUsers.length > 0 && (
                      <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden shadow-md">
                        {filteredUsers.map((u, i) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setSelectedTo(p => [...p, u]); setToSearch(''); searchRef.current?.focus(); }}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--bg-hover)] text-left transition-colors',
                              i > 0 && 'border-t border-[var(--border)]',
                            )}
                          >
                            <Avatar src={resolveUrl(u.fotoPerfil)} name={userLabel(u)} size="xs" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-[var(--text-primary)] truncate">{userLabel(u)}</p>
                              {u.carrera && (
                                <p className="text-[10px] text-[var(--text-muted)] truncate">{u.carrera}</p>
                              )}
                            </div>
                            {u.rol && (
                              <span className="text-[9px] text-[var(--text-muted)] shrink-0 font-medium">
                                {u.rolLabel ?? u.rol}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ── GRUPO/CLASE ── */}
                {recipientMode === 'grupo' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">Carrera</label>
                      {audienciaLoading ? (
                        <div className="h-9 rounded-lg bg-[var(--bg-elevated)] animate-pulse" />
                      ) : (
                        <select
                          value={selectedCarrera}
                          onChange={e => { setSelectedCarrera(e.target.value); setSelectedGrupo(''); }}
                          className="w-full h-9 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]/50 transition-colors"
                        >
                          <option value="">Selecciona una carrera…</option>
                          {audienciaInfo?.carreras.map(c => (
                            <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {selectedCarrera && (
                      <div>
                        <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">Grupo / Clase</label>
                        <select
                          value={selectedGrupo}
                          onChange={e => setSelectedGrupo(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]/50 transition-colors"
                        >
                          <option value="">Selecciona un grupo…</option>
                          {currentCarreraInfo()?.grupos.map(g => (
                            <option key={g.nombre} value={g.nombre}>
                              {g.nombre} · {g.totalEstudiantes} est.
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {audienciaPreview !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--brand)] font-medium">
                        <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        ~{audienciaPreview} estudiante{audienciaPreview !== 1 ? 's' : ''} recibirán este mensaje
                      </div>
                    )}
                  </div>
                )}

                {/* ── CARRERA COMPLETA ── */}
                {recipientMode === 'carrera' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">Carrera</label>
                      {audienciaLoading ? (
                        <div className="h-9 rounded-lg bg-[var(--bg-elevated)] animate-pulse" />
                      ) : (
                        <select
                          value={selectedCarrera}
                          onChange={e => setSelectedCarrera(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]/50 transition-colors"
                        >
                          <option value="">Selecciona una carrera…</option>
                          {audienciaInfo?.carreras.map(c => (
                            <option key={c.nombre} value={c.nombre}>
                              {c.nombre} · {c.totalEstudiantes + c.totalDocentes} pers.
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {audienciaPreview !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--brand)] font-medium">
                        <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        ~{audienciaPreview} persona{audienciaPreview !== 1 ? 's' : ''} recibirán este mensaje
                      </div>
                    )}
                  </div>
                )}

                {/* ── BUZÓN OFICIAL ── */}
                {recipientMode === 'buzon' && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Buzón oficial</p>
                    {buzonesLoading ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-14 rounded-xl bg-[var(--bg-elevated)] animate-pulse" />
                        ))}
                      </div>
                    ) : buzones.length === 0 ? (
                      <div className="text-center py-6 space-y-1.5">
                        <svg className="size-8 text-[var(--text-muted)] mx-auto opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <p className="text-xs font-medium text-[var(--text-muted)]">Sin buzones configurados aún</p>
                        <p className="text-[10px] text-[var(--text-muted)] opacity-70">Los buzones institucionales del TESVG estarán disponibles próximamente</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {buzones.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBuzon(prev => prev?.id === b.id ? null : b)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                              selectedBuzon?.id === b.id
                                ? 'border-[var(--brand)]/60 bg-[var(--brand-muted)] shadow-sm'
                                : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]',
                            )}
                          >
                            <div className="size-8 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                              <svg className="size-3.5 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{b.nombre}</p>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                {b.miembrosCount} miembro{b.miembrosCount !== 1 ? 's' : ''}
                                {b.descripcion ? ` · ${b.descripcion}` : ''}
                              </p>
                            </div>
                            {selectedBuzon?.id === b.id && (
                              <svg className="size-4 text-[var(--brand)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Asunto */}
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)] shrink-0 w-9 select-none">Asunto</span>
                  <input
                    value={asunto}
                    onChange={e => setAsunto(e.target.value)}
                    placeholder="Asunto del mensaje"
                    maxLength={200}
                    className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div className="px-4 py-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)] shrink-0 w-16 select-none">Categoría</span>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="flex-1 text-sm bg-transparent text-[var(--text-primary)] focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cuerpo */}
              <div className="px-4 pt-3 pb-2">
                <textarea
                  ref={textareaRef}
                  value={cuerpo}
                  onChange={e => setCuerpo(e.target.value)}
                  placeholder="Escribe tu mensaje institucional aquí…"
                  maxLength={5000}
                  style={{ minHeight: 120, resize: 'none' }}
                  className="w-full text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none leading-relaxed"
                />
                <p className="text-[10px] text-[var(--text-muted)] text-right mt-1 tabular-nums">
                  {cuerpo.length} / 5000
                </p>
              </div>

              {/* Adjuntos */}
              <div
                className="mx-4 mb-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/70 px-3 py-3"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); validateAndAddFiles(e.dataTransfer.files); }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Archivos adjuntos</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      PDF, Office, imágenes, TXT, ZIP · Máx. {MAX_FILE_MB} MB por archivo · {MAX_ATTACHMENTS} archivos
                    </p>
                  </div>
                  <label className="h-8 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.34a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    Adjuntar
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip,.mp4,.mov,.webm"
                      onChange={e => { validateAndAddFiles(e.target.files); e.currentTarget.value = ''; }}
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map(file => {
                      const ext       = fileExt(file.name);
                      const extColor  = EXT_COLORS[ext] ?? 'bg-[var(--brand-muted)] text-[var(--brand)]';
                      const pct       = progress[file.name];
                      const uploading = pct != null && pct < 100;

                      return (
                        <div
                          key={`${file.name}-${file.size}`}
                          className="flex items-center gap-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-2"
                        >
                          <span className={cn('size-9 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0', extColor)}>
                            {ext.slice(0, 4).toUpperCase() || 'FILE'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{file.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{formatSize(file.size)}</p>
                            {uploading && (
                              <div className="mt-1 h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                                <div
                                  className="h-full bg-[var(--brand)] transition-all duration-200"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                            {pct === 100 && (
                              <p className="text-[10px] text-green-500 font-semibold mt-0.5">Subido</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachments(prev => prev.filter(f => f !== file))}
                            className="size-7 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--error)] transition-colors flex items-center justify-center shrink-0"
                            aria-label="Quitar archivo"
                          >
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between gap-2 shrink-0 bg-[var(--bg-surface)]"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <div className="min-w-0 flex-1">
                {error && (
                  <p className="text-xs text-[var(--error)] truncate">{error}</p>
                )}
                {!error && attachments.length > 0 && !loading && (
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {attachments.length} archivo{attachments.length !== 1 ? 's' : ''} adjunto{attachments.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSend}
                  className="h-8 px-4 rounded-xl bg-[var(--brand)] text-white text-xs font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {loading ? (
                    <>
                      <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round" />
                      </svg>
                      {attachments.length > 0 ? 'Enviando…' : 'Enviando…'}
                    </>
                  ) : (
                    <>
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Enviar
                      {attachments.length > 0 && (
                        <span className="bg-white/20 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          +{attachments.length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
