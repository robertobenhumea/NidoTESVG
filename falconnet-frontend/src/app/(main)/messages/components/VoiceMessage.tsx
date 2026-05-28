'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Mic, Pause, Play, Send, Square, Trash2, X } from 'lucide-react';
import { getStoredAuthToken, resolveUrl } from '@/lib/utils';

const MAX_VOICE_SECONDS = 5 * 60;
const AUDIO_ACCEPT = 'audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,.webm,.ogg,.mp3,.m4a,.mp4,.wav';

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

function preferredMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
  return options.find(type => MediaRecorder.isTypeSupported(type)) ?? '';
}

function extensionFromMime(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
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
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;
    setError('');
    setObjectUrl(null);
    void fetchObjectUrl(url)
      .then(nextUrl => {
        localUrl = nextUrl;
        if (!cancelled) setObjectUrl(nextUrl);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el audio');
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
    await audio.play();
    setPlaying(true);
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
        <div className="mb-1 flex items-center gap-1">
          {Array.from({ length: 18 }).map((_, idx) => (
            <span
              key={idx}
              className={`w-1 rounded-full ${isOwn ? 'bg-white/45' : 'bg-[var(--text-muted)]/45'}`}
              style={{ height: `${8 + ((idx * 7) % 18)}px` }}
            />
          ))}
        </div>
        <div className={`flex items-center justify-between text-[10px] ${isOwn ? 'text-white/65' : 'text-[var(--text-muted)]'}`}>
          <span>{error || 'Nota de voz'}</span>
          <span className="tabular-nums">{formatDuration(current || duration)}</span>
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
  const [supported, setSupported] = useState(false);
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
    setSupported(typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined');
    return () => {
      stopTracks();
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function stopTracks() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }

  function resetPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setPreviewDuration(0);
    setError('');
  }

  async function startRecording() {
    if (!supported || disabled || recording) {
      if (!supported) {
        setError('Tu navegador no permite grabar audio. Adjunta un archivo.');
        audioInputRef.current?.click();
      }
      return;
    }
    try {
      resetPreview();
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const ext = extensionFromMime(type);
        const file = new File([blob], `nota-voz-${Date.now()}.${ext}`, { type });
        setPreviewDuration(duration);
        setPreviewFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        stopTracks();
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_VOICE_SECONDS) stopRecording();
      }, 500);
    } catch {
      setError('No se pudo acceder al micrófono.');
      stopTracks();
    }
  }

  function stopRecording() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recorderRef.current = null;
    setRecording(false);
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

  function onManualAudio(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Selecciona un archivo de audio válido.');
      e.target.value = '';
      return;
    }
    resetPreview();
    setPreviewFile(file);
    setPreviewDuration(0);
    setPreviewUrl(URL.createObjectURL(file));
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
        <button
          type="button"
          onClick={() => recording ? stopRecording() : void startRecording()}
          disabled={disabled}
          className={`grid size-9 place-items-center rounded-full transition-colors ${recording ? 'bg-red-500/15 text-red-500' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'} disabled:opacity-50`}
          aria-label={recording ? 'Detener grabación' : 'Grabar audio'}
          title={recording ? formatDuration(seconds) : 'Grabar nota de voz'}
        >
          {recording ? <Square className="size-4" /> : <Mic className="size-5" />}
        </button>
      )}
      {recording && <span className="text-[11px] font-semibold tabular-nums text-red-500">{formatDuration(seconds)}</span>}
      {error && (
        <button type="button" onClick={() => setError('')} className="flex max-w-[120px] items-center gap-1 truncate text-[10px] text-red-500" title={error}>
          <span className="truncate">{error}</span><X className="size-3" />
        </button>
      )}
      <input ref={audioInputRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={onManualAudio} />
    </div>
  );
}
