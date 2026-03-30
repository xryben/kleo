'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { marketplaceApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';

interface MarketplaceClip {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  cpmRate: number;
  platform: string;
  category: string;
  campaignTitle: string;
  duration: number;
}

const PLATFORMS = ['Todas', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK'];
const CATEGORIES = [
  'Todas',
  'TECH',
  'FITNESS',
  'FINANCE',
  'LIFESTYLE',
  'EDUCATION',
  'ENTERTAINMENT',
];
const SORT_OPTIONS = [
  { value: 'cpm_desc', label: 'CPM: Mayor a menor' },
  { value: 'cpm_asc', label: 'CPM: Menor a mayor' },
  { value: 'newest', label: 'Más recientes' },
];

function formatCPM(cpm: number) {
  return `$${cpm.toFixed(2)}`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: '📸',
  YOUTUBE: '▶️',
  TIKTOK: '🎵',
};

export default function MarketplacePage() {
  const router = useRouter();
  const auth = useAuth();
  const [clips, setClips] = useState<MarketplaceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState('Todas');
  const [category, setCategory] = useState('Todas');
  const [sort, setSort] = useState('cpm_desc');

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;

    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params: Record<string, string> = {};
    if (platform !== 'Todas') params.platform = platform;
    if (category !== 'Todas') params.category = category;
    params.sort = sort;

    marketplaceApi
      .list(params)
      .then(setClips)
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load marketplace clips:', err);
          setError('No se pudieron cargar los clips');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.isLoading, auth.isAuthenticated, platform, category, sort]);

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
          <span className="text-sm text-slate-300 font-medium">Marketplace</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/clipper/dashboard"
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Mi Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Proyectos
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Marketplace de Clips</h1>
          <p className="text-slate-400 text-sm mt-1">
            Encuentra clips para publicar y genera ingresos
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p === 'Todas' ? 'Plataforma: Todas' : p}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'Todas' ? 'Categoría: Todas' : c}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden animate-pulse"
              >
                <div className="w-full h-48 bg-slate-700" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : clips.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎬</div>
            <h2 className="text-lg font-medium text-white mb-2">No hay clips disponibles</h2>
            <p className="text-slate-400 text-sm">Intenta cambiar los filtros o vuelve más tarde</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {clips.map((clip) => (
              <Link
                key={clip.id}
                href={`/marketplace/${clip.id}`}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors group"
              >
                <div className="relative w-full h-48 bg-slate-700 flex items-center justify-center">
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-slate-500">🎬</span>
                  )}
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {formatCPM(clip.cpmRate)} CPM
                  </div>
                  {clip.duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                      {formatDuration(clip.duration)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors truncate">
                    {clip.title}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 truncate">{clip.campaignTitle}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm">{PLATFORM_ICONS[clip.platform] || '📱'}</span>
                    <span className="text-xs text-slate-400">{clip.platform}</span>
                    <span className="text-slate-600 mx-1">·</span>
                    <span className="text-xs text-slate-400">{clip.category}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
