'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/services/api';
import { resolveUrl } from '@/lib/utils';

interface RankEntry {
  id: number;
  username: string;
  carrera?: string;
  grupo?: string;
  fotoPerfil?: string;
  rol?: string;
  esMioCuenta: boolean;
  siguiendo: boolean;
  valor: number;
  rank: number;
}

type RankTipo = 'seguidores' | 'publicaciones' | 'likes' | 'insignias';

const TIPOS: { value: RankTipo; label: string }[] = [
  { value: 'seguidores',    label: 'Seguidores' },
  { value: 'publicaciones', label: 'Publicaciones' },
  { value: 'likes',         label: 'Me gustas' },
  { value: 'insignias',     label: 'Insignias' },
];

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function RankingPage() {
  const [tipo, setTipo]         = useState<RankTipo>('seguidores');
  const [entries, setEntries]   = useState<RankEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get<RankEntry[]>(`/ranking?tipo=${tipo}&limit=50`)
      .then(setEntries)
      .catch(() => setError('No se pudo cargar el ranking.'))
      .finally(() => setLoading(false));
  }, [tipo]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Ranking FalconNet</h1>

      {/* Tipo chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {TIPOS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTipo(t.value)}
            className={`shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-colors ${
              tipo === t.value
                ? 'bg-[var(--brand)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] animate-pulse">
              <div className="w-7 h-4 rounded-full bg-[var(--bg-elevated)]" />
              <div className="size-10 rounded-full bg-[var(--bg-elevated)]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 rounded-full bg-[var(--bg-elevated)]" />
                <div className="h-3 w-20 rounded-full bg-[var(--bg-elevated)]" />
              </div>
              <div className="h-4 w-10 rounded-full bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/profile/${entry.id}`}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                entry.esMioCuenta
                  ? 'bg-[var(--brand-muted)] border-[var(--brand)] ring-1 ring-[var(--brand)]'
                  : 'bg-[var(--bg-surface)] border-[var(--border)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {/* Rank */}
              <div className="w-7 text-center text-sm font-bold text-[var(--text-muted)] shrink-0">
                {RANK_MEDAL[entry.rank] ?? `#${entry.rank}`}
              </div>

              {/* Avatar */}
              <Avatar
                src={resolveUrl(entry.fotoPerfil)}
                name={entry.username}
                size="md"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${entry.esMioCuenta ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>
                  {entry.username}
                  {entry.esMioCuenta && <span className="ml-1.5 text-xs font-normal opacity-70">Tú</span>}
                </p>
                {(entry.carrera || entry.grupo) && (
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {[entry.carrera, entry.grupo].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              {/* Value */}
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums">{entry.valor.toLocaleString()}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{TIPOS.find((t) => t.value === tipo)?.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
