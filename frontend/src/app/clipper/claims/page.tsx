'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { claimsApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import { statusBadgeClasses, statusLabel, platformIcon } from '@/lib/design-tokens';

interface Claim {
  id: string;
  clipTitle: string;
  clipThumbnailUrl: string | null;
  status: string;
  earnings: number;
  platform: string;
  socialUrl: string | null;
  createdAt: string;
}

export default function ClaimsListPage() {
  const router = useRouter();
  const auth = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;

    const controller = new AbortController();
    claimsApi
      .list()
      .then(setClaims)
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load claims:', err);
          setError('No se pudieron cargar los claims');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.isLoading, auth.isAuthenticated]);

  const filtered = filter === 'ALL' ? claims : claims.filter((c) => c.status === filter);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✂️</span>
          <Link
            href="/dashboard"
            className="text-lg font-bold text-white hover:text-purple-400 transition-colors"
          >
            Cleo
          </Link>
          <span className="text-slate-600 mx-2">/</span>
          <Link
            href="/clipper/dashboard"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Clipper
          </Link>
          <span className="text-slate-600 mx-2">/</span>
          <span className="text-sm text-slate-300 font-medium">Mis Claims</span>
        </div>
        <Link
          href="/marketplace"
          className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
        >
          + Buscar clips
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis Claims</h1>
            <p className="text-slate-400 text-sm mt-1">Clips que has reclamado del marketplace</p>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['ALL', 'CLAIMED', 'SUBMITTED', 'VERIFIED', 'REJECTED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === s
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s === 'ALL' ? 'Todos' : statusLabel(s)}
            </button>
          ))}
        </div>

        {error ? (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-purple-400 hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="w-20 h-14 bg-slate-700 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-700 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-lg font-medium text-white mb-2">
              {filter === 'ALL' ? 'No tienes claims' : 'No hay claims con este estado'}
            </h2>
            <Link href="/marketplace" className="text-purple-400 hover:text-purple-300 text-sm">
              Explorar marketplace →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((claim) => (
              <Link
                key={claim.id}
                href={`/clipper/claims/${claim.id}`}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-center gap-4 hover:border-purple-500/50 transition-colors block"
              >
                <div className="w-20 h-14 bg-slate-700 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {claim.clipThumbnailUrl ? (
                    <img
                      src={claim.clipThumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-slate-500">🎬</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{claim.clipTitle}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>
                      {platformIcon(claim.platform)} {claim.platform}
                    </span>
                    <span>·</span>
                    <span>{new Date(claim.createdAt).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {claim.earnings > 0 && (
                    <span className="text-green-400 font-medium text-sm">
                      ${claim.earnings.toFixed(2)}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadgeClasses(claim.status)}`}
                  >
                    {statusLabel(claim.status)}
                  </span>
                  <span className="text-slate-500">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
