'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { marketplaceApi, clipsApi } from '@/lib/api';

interface ClipDetail {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  cpmRate: number;
  platform: string;
  category: string;
  duration: number;
  campaign: {
    id: string;
    title: string;
    description: string;
    totalBudget: number;
    spentBudget: number;
    totalViews: number;
  };
  infoproductor: {
    name: string;
    avatarUrl: string | null;
  };
  stats: {
    totalClaims: number;
    totalViews: number;
  };
}

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: '📸',
  YOUTUBE: '▶️',
  TIKTOK: '🎵',
};

export default function ClipDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clipId = params.clipId as string;
  const [clip, setClip] = useState<ClipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('cleo_token');
    if (!token) { router.replace('/login'); return; }

    marketplaceApi.get(clipId)
      .then((data) => setClip(data))
      .catch(() => setError('No se pudo cargar el clip'))
      .finally(() => setLoading(false));
  }, [router, clipId]);

  async function handleClaim() {
    setClaiming(true);
    setError('');
    try {
      await marketplaceApi.claim(clipId);
      setClaimed(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al reclamar el clip');
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✂️</span>
            <Link href="/marketplace" className="text-lg font-bold text-white">Cleo</Link>
            <span className="text-slate-600 mx-2">/</span>
            <span className="text-sm text-slate-400">Cargando...</span>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="animate-pulse space-y-6">
            <div className="w-full h-80 bg-slate-800 rounded-xl" />
            <div className="h-6 bg-slate-800 rounded w-1/2" />
            <div className="h-4 bg-slate-800 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !clip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-slate-400">{error}</p>
          <Link href="/marketplace" className="text-purple-400 hover:text-purple-300 text-sm mt-4 inline-block">Volver al marketplace</Link>
        </div>
      </div>
    );
  }

  if (!clip) return null;

  const streamUrl = clipsApi.streamUrl(clip.id);
  const budgetPercent = clip.campaign.totalBudget > 0
    ? Math.round((clip.campaign.spentBudget / clip.campaign.totalBudget) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✂️</span>
          <Link href="/marketplace" className="text-lg font-bold text-white hover:text-purple-400 transition-colors">Cleo</Link>
          <span className="text-slate-600 mx-2">/</span>
          <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white transition-colors">Marketplace</Link>
          <span className="text-slate-600 mx-2">/</span>
          <span className="text-sm text-slate-300 font-medium truncate max-w-[200px]">{clip.title}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-xl overflow-hidden aspect-video">
              <video
                src={streamUrl}
                controls
                className="w-full h-full"
                poster={clip.thumbnailUrl || undefined}
              />
            </div>
            <div className="mt-6">
              <h1 className="text-2xl font-bold text-white">{clip.title}</h1>
              <p className="text-slate-400 mt-2">{clip.description}</p>
            </div>

            {/* Campaign Stats */}
            <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-medium text-slate-300 mb-4">Estadísticas de la campaña</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">{clip.stats.totalViews.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mt-1">Vistas totales</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{clip.stats.totalClaims}</div>
                  <div className="text-xs text-slate-400 mt-1">Claims activos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{budgetPercent}%</div>
                  <div className="text-xs text-slate-400 mt-1">Presupuesto usado</div>
                </div>
              </div>
              <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${budgetPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* CPM Badge */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-green-400">${clip.cpmRate.toFixed(2)}</div>
              <div className="text-sm text-slate-400 mt-1">CPM (costo por mil vistas)</div>
            </div>

            {/* Claim Button */}
            <button
              onClick={handleClaim}
              disabled={claiming || claimed}
              className={`w-full py-3 rounded-xl font-medium text-white transition-colors ${
                claimed
                  ? 'bg-green-600 cursor-default'
                  : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50'
              }`}
            >
              {claimed ? '✓ Clip reclamado' : claiming ? 'Reclamando...' : 'Reclamar clip'}
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {claimed && (
              <Link
                href="/clipper/claims"
                className="block text-center text-purple-400 hover:text-purple-300 text-sm"
              >
                Ver mis claims →
              </Link>
            )}

            {/* Clip Info */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-lg">
                  {clip.infoproductor.avatarUrl ? (
                    <img src={clip.infoproductor.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : '👤'}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{clip.infoproductor.name}</div>
                  <div className="text-xs text-slate-400">Infoproductor</div>
                </div>
              </div>
              <div className="border-t border-slate-700 pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Plataforma</span>
                  <span className="text-white">{PLATFORM_ICONS[clip.platform] || '📱'} {clip.platform}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Categoría</span>
                  <span className="text-white">{clip.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Campaña</span>
                  <span className="text-white truncate max-w-[140px]">{clip.campaign.title}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
