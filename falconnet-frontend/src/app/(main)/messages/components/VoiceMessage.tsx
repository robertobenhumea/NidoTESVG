'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Mic, Paperclip, Pause, Play, Send, Square, Trash2, X } from 'lucide-react';
import { getStoredAuthToken, resolveUrl } from '@/lib/utils';

const MAX_VOICE_SECONDS = 5 * 60;
const MAX_VOICE_BYTES = 10 * 1024 * 1024;
const AUDIO_ACCEPT = 'audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,.webm,.ogg,.mp3,.m4a,.mp4,.wav';
const AUDIO_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
const AUDIO_EXTENSIONS = ['webm', 'ogg', 'mp3', 'm4a', 'mp4', 'wav'];

type AudioRuntimeInfo = {
  browser: 'safari-ios' | 'safari' | 'chrome-android' | 'desktop' | 'unknown';
  isPwa: boolean;
  isSecureContext: boolean;
  isLocalhost: boolean;
  isLanIp: boolean;
  protocol: string;
  hostname: string;
};

function authHeader(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDuration(seconds?: number | null): string {
  const value = Math.max(0, Math.round(seconds ?? 0));
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getAudioRuntimeInfo(): AudioRuntimeInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      browser: 'unknown',
      isPwa: false,
      isSecureContext: false,
      isLocalhost: false,
      isLanIp: false,
      protocol: '',
      hostname: '',
    };
  }
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isAndroid = /Android/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  const hostname = window.location.hostname;
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const isLanIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  const isPwa = window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true;

  return {
    browser: isIOS && isSafari ? 'safari-ios' : isSafari ? 'safari' : isAndroid && isChrome ? 'chrome-android' : 'desktop',
    isPwa,
    isSecureContext: window.isSecureContext,
    isLocalhost,
    isLanIp,
    protocol: window.location.protocol,
    hostname,
  };
}

function logAudioDiagnostic(message: string, extra?: unknown) {
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && window.localStorage.getItem('fn_chat_audio_debug') === '1') {
    console.warn(`[chat-audio] ${message}`, extra ?? '');
  }
}

function getUnsupportedReason(info = getAudioRuntimeInfo()): string | null {
  if (typeof navigator === 'undefined') return 'El navegador no soporta grabación.';
  if (!info.isSecureContext && !info.isLocalhost) {
    if (info.isLanIp) return 'La grabación requiere HTTPS en móvil. En algunos celulares el micrófono requiere HTTPS o PWA compatible.';
    return 'La grabación requiere HTTPS en móvil.';
  }
  if (!navigator.mediaDevices?.getUserMedia) return 'Tu navegador no soporta acceso al micrófono.';
  if (typeof MediaRecorder === 'undefined') return 'Tu navegador no soporta grabación.';
  return null;
}

function microphoneErrorMessage(err: unknown, info = getAudioRuntimeInfo()): string {
  if (!info.isSecureContext && !info.isLocalhost) return info.isLanIp ? 'La grabación requiere HTTPS en móvil. En algunos celulares el micrófono requiere HTTPS o PWA compatible.' : 'La grabación requiere HTTPS en móvil.';
  if (!(err instanceof DOMException)) return 'No se pudo acceder al micrófono.';
  if (err.name === 'NotAllowedError') return 'Debes permitir acceso al micrófono para grabar audio.';
  if (err.name === 'SecurityError') return 'La grabación requiere HTTPS en móvil.';
  if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') return 'No se encontró un micrófono disponible.';
  if (err.name === 'NotReadableError' || err.name === 'TrackStartError') return 'El micrófono está ocupado o no se puede iniciar.';
  if (err.name === 'AbortError') return 'La grabación se interrumpió. Intenta de nuevo.';
  if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') return 'El micrófono no cumple los requisitos de grabación.';
  return 'No se pudo acceder al micrófono.';
}

function preferredMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return AUDIO_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) ?? '';
}

function extensionFromMime(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_EXTENSIONS.includes(ext);
}

function fileSizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function readAudioDuration(url: string): Promise<number> {
  return new Promise(resolve => {
    const audio = document.createElement('audio');
    const cleanup = () => {
      audio.removeAttribute('src');
      audio.load();
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.max(1, Math.round(audio.duration)) : 0;
      cleanup();
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
    audio.src = url;
  });
}

async function fetchObjectUrl(url: string): Promise<string> {
  const res = await fetch(resolveUrl(url) ?? url, { headers: authHeader() });
  if (!res.ok) throw new Error('No se pudo cargar el audio');
  return URL.createObjectURL(await res.blob());
}

export function VoicePlayer({
  url,
  fileName = 'audio',
  durationSeconds,
  isOwn,
}: {
  url: string;
  fileName?: string | null;
  durationSeconds?: number | null;
  isOwn?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioState, setAudioState] = useState<{ sourceUrl: string; objectUrl: string | null; error: string }>({
    sourceUrl: url,
    objectUrl: null,
    error: '',
  });
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const objectUrl = audioState.sourceUrl === url ? audioState.objectUrl : null;
  const error = audioState.sourceUrl === url ? audioState.error : '';

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;
    void fetchObjectUrl(url)
      .then(nextUrl => {
        localUrl = nextUrl;
        if (!cancelled) setAudioState({ sourceUrl: url, objectUrl: nextUrl, error: '' });
      })
      .catch(() => {
        if (!cancelled) setAudioState({ sourceUrl: url, objectUrl: null, error: 'No se pudo cargar el audio' });
      });
    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [url]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setAudioState(prev => ({ ...prev, error: 'No se pudo reproducir el audio' }));
    }
  }

  function download() {
    if (!objectUrl) return;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName ?? 'audio';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className={`mb-1.5 flex min-w-[220px] max-w-[280px] items-center gap-2 rounded-xl p-2 ${isOwn ? 'bg-white/10' : 'bg-[var(--bg-surface)]'}`}>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={!objectUrl || Boolean(error)}
        className={`grid size-9 shrink-0 place-items-center rounded-full ${isOwn ? 'bg-white/20 text-white' : 'bg-[var(--brand-muted)] text-[var(--brand)]'} disabled:opacity-50`}
        aria-label={playing ? 'Pausar audio' : 'Reproducir audio'}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1" aria-hidden>
          {Array.from({ length: 18 }).map((_, idx) => {
            const active = duration > 0 && idx / 18 <= current / duration;
            return (
              <span
                key={idx}
                className={`w-1 rounded-full ${active ? isOwn ? 'bg-white' : 'bg-[var(--brand)]' : isOwn ? 'bg-white/35' : 'bg-[var(--text-muted)]/35'}`}
                style={{ height: `${8 + ((idx * 7) % 18)}px` }}
              />
            );
          })}
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          value={Math.min(current, Math.max(duration, 1))}
          onChange={e => {
            const audio = audioRef.current;
            const next = Number(e.currentTarget.value);
            setCurrent(next);
            if (audio) audio.currentTime = next;
          }}
          disabled={!objectUrl || Boolean(error)}
          aria-label="Progreso del audio"
          className="mb-1 h-1 w-full accent-[var(--brand)]"
        />
        <div className={`flex items-center justify-between text-[10px] ${isOwn ? 'text-white/65' : 'text-[var(--text-muted)]'}`}>
          <span>{error || 'Nota de voz'}</span>
          <span className="tabular-nums">{formatDuration(current)} / {formatDuration(duration)}</span>
        </div>
        {objectUrl && (
          <audio
            ref={audioRef}
            src={objectUrl}
            preload="metadata"
            onLoadedMetadata={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : durationSeconds ?? 0)}
            onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
            onEnded={() => { setPlaying(false); setCurrent(0); }}
          />
        )}
      </div>
      <button type="button" onClick={download} disabled={!objectUrl} className="grid size-7 shrink-0 place-items-center rounded-full opacity-70 hover:bg-black/10 disabled:opacity-30" aria-label="Descargar audio">
        <Download className="size-3.5" />
      </button>
    </div>
  );
}

export function VoiceRecorder({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (file: File, durationSeconds: number) => Promise<void>;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const recordingErrorRef = useRef(false);
  const cancelRequestedRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const audioInputRef = useRef<HTMLInputElement>(null);

  const canSend = useMemo(() => previewFile && !sending && !disabled, [previewFile, sending, disabled]);

  useEffect(() => {
    const runtimeInfo = getAudioRuntimeInfo();
    const unsupportedReason = getUnsupportedReason(runtimeInfo);
    if (unsupportedReason) {
      logAudioDiagnostic(unsupportedReason, runtimeInfo);
    } else {
      logAudioDiagnostic('grabación disponible', {
        ...runtimeInfo,
        mimeType: preferredMimeType() || 'MediaRecorder default',
      });
    }
    return () => {
      stopTracks();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function stopTracks() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function resetPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setPreviewDuration(0);
    setError('');
  }

  function validateAudioForPreview(file: File): string | null {
    if (!isAudioFile(file)) return 'Selecciona un archivo de audio válido.';
    if (file.size > MAX_VOICE_BYTES) return `El audio pesa ${fileSizeLabel(file.size)}. Máximo 10 MB.`;
    return null;
  }

  async function startRecording() {
    const runtimeInfo = getAudioRuntimeInfo();
    const unsupportedReason = getUnsupportedReason(runtimeInfo);
    if (unsupportedReason || disabled || recording) {
      if (unsupportedReason) {
        logAudioDiagnostic(unsupportedReason, runtimeInfo);
        setError(`${unsupportedReason} Puedes adjuntar un audio.`);
        audioInputRef.current?.click();
      }
      return;
    }
    try {
      resetPreview();
      chunksRef.current = [];
      recordingErrorRef.current = false;
      cancelRequestedRef.current = false;
      logAudioDiagnostic('solicitando permiso de micrófono', runtimeInfo);
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      if (!stream.getAudioTracks().length) {
        logAudioDiagnostic('stream sin pistas de audio', runtimeInfo);
        throw new DOMException('No audio track', 'NotFoundError');
      }
      const mimeType = preferredMimeType();
      logAudioDiagnostic('iniciando MediaRecorder', { mimeType: mimeType || 'MediaRecorder default' });
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = event => {
        recordingErrorRef.current = true;
        logAudioDiagnostic('MediaRecorder error', event);
        setError('No se pudo grabar audio en este navegador. Puedes adjuntar un audio.');
        stopRecording();
      };
      recorder.onstop = () => {
        const cancelled = cancelRequestedRef.current;
        cancelRequestedRef.current = false;
        if (recordingErrorRef.current) {
          stopTracks();
          return;
        }
        if (cancelled) {
          chunksRef.current = [];
          stopTracks();
          return;
        }
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const type = recorder.mimeType || mimeType || 'audio/webm';
        if (chunksRef.current.length === 0) {
          setError('No se capturó audio. Revisa el permiso del micrófono o adjunta un audio.');
          stopTracks();
          return;
        }
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size > MAX_VOICE_BYTES) {
          setError(`El audio pesa ${fileSizeLabel(blob.size)}. Máximo 10 MB.`);
          stopTracks();
          return;
        }
        const ext = extensionFromMime(type);
        const file = new File([blob], `nota-voz-${Date.now()}.${ext}`, { type });
        setPreviewDuration(duration);
        setPreviewFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        stopTracks();
      };
      recorder.start(1000);
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_VOICE_SECONDS) stopRecording();
      }, 500);
    } catch (err) {
      const runtimeInfo = getAudioRuntimeInfo();
      const message = microphoneErrorMessage(err, runtimeInfo);
      logAudioDiagnostic(message, { error: err, runtimeInfo });
      setError(message);
      clearTimer();
      setRecording(false);
      recorderRef.current = null;
      stopTracks();
    }
  }

  function stopRecording() {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.requestData();
      } catch {
        // Some mobile browsers throw when data is not ready yet.
      }
      recorder.stop();
    } else {
      stopTracks();
    }
    recorderRef.current = null;
    setRecording(false);
  }

  function cancelRecording() {
    cancelRequestedRef.current = true;
    chunksRef.current = [];
    stopRecording();
    setSeconds(0);
    setError('');
  }

  async function sendPreview() {
    if (!previewFile || !canSend) return;
    setSending(true);
    try {
      await onSend(previewFile, previewDuration);
      resetPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el audio.');
    } finally {
      setSending(false);
    }
  }

  async function onManualAudio(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateAudioForPreview(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }
    resetPreview();
    const nextUrl = URL.createObjectURL(file);
    setPreviewFile(file);
    setPreviewDuration(await readAudioDuration(nextUrl));
    setPreviewUrl(nextUrl);
    e.target.value = '';
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {previewFile && previewUrl ? (
        <div className="flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-1.5 py-1">
          <audio src={previewUrl} controls className="h-8 max-w-[150px] sm:max-w-[210px]" />
          <span className="hidden text-[10px] text-[var(--text-muted)] tabular-nums sm:inline">{formatDuration(previewDuration)}</span>
          <button type="button" onClick={resetPreview} className="grid size-7 place-items-center rounded-full text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500" aria-label="Cancelar audio">
            <Trash2 className="size-3.5" />
          </button>
          <button type="button" onClick={() => void sendPreview()} disabled={!canSend} className="grid size-7 place-items-center rounded-full bg-[var(--brand)] text-white disabled:bg-[var(--bg-surface)] disabled:text-[var(--text-muted)]" aria-label="Enviar audio">
            {sending ? <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="size-3.5" />}
          </button>
        </div>
      ) : (
        <>
          {recording && (
            <button
              type="button"
              onClick={cancelRecording}
              className="grid size-9 place-items-center rounded-full text-red-500 hover:bg-red-500/10"
              aria-label="Cancelar grabación"
              title="Cancelar grabación"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => recording ? stopRecording() : void startRecording()}
            disabled={disabled}
            className={`grid size-9 place-items-center rounded-full transition-colors ${recording ? 'bg-red-500/15 text-red-500' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'} disabled:opacity-50`}
            aria-label={recording ? 'Detener grabación' : 'Grabar audio'}
            title={recording ? `Detener ${formatDuration(seconds)}` : 'Grabar nota de voz'}
          >
            {recording ? <Square className="size-4" /> : <Mic className="size-5" />}
          </button>
        </>
      )}
      {recording && <span className="text-[11px] font-semibold tabular-nums text-red-500">{formatDuration(seconds)}</span>}
      {error && (
        <>
          <button type="button" onClick={() => audioInputRef.current?.click()} className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]" aria-label="Adjuntar audio" title="Adjuntar audio">
            <Paperclip className="size-4" />
          </button>
          <button type="button" onClick={() => setError('')} className="flex max-w-[150px] items-center gap-1 truncate text-[10px] text-red-500" title={error}>
            <span className="truncate">{error}</span><X className="size-3" />
          </button>
        </>
      )}
      <input ref={audioInputRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={onManualAudio} />
    </div>
  );
}
