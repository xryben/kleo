'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { campaignsApi, clipsApi } from '@/lib/api';

interface CampaignDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: number;
  spent: number;
  cpmRate: number;
  totalViews: number;
  createdAt: string;
  clips: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    claims: number;
    views: number;
  }[];
  topClippers: {
    id: string;
    name: string;
    avatarUrl: string | null;
    views: number;
    earnings: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  PAUSED: 'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  DRAFT: 'bg-slate-700 text-slate-400',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  PAUSED: 'Pausada',
  COMPLETED: 'Completada',
  DRAFT: 'Borrador',
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('cleo_token');
    if (!token) { router.replace('/login'); return; }

    campaignsApi.get(campaignId)
      .then(setCampaign)
      .catch(() => setError('No se pudo cargar la campaña'))
      .finally(() => setLoading(false));
  }, [router, campaignId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✂️</span>
            <Link href="/infoproductor/campaigns" className="text-lg font-bold text-white">Cleo</Link>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-6 py-16 animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-slate-400">{error || 'Campaña no encontrada'}</p>
          <Link href="/infoproductor/campaigns" className="text-purple-400 hover:text-purple-300 text-sm mt-4 inline-block">
            Volver a campañas
          </Link>
        </div>
      </div>
    );
  }

  const budgetPercent = campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✂️</span>
          <Link href="/dashboard" className="text-lg font-bold text-white hover:text-purple-400 transition-colors">Cleo</Link>
          <span className="text-slate-600 mx-2">/</span>
          <Link href="/infoproductor/campaigns" className="text-sm text-slate-400 hover:text-white transition-colors">Campañas</Link>
          <span className="text-slate-600 mx-2">/</span>
          <span className="text-sm text-slate-300 font-medium truncate max-w-[200px]">{campaign.title}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Title + Status */}
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">{campaign.title}</h1>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[campaign.status] || 'bg-slate-700 text-slate-400'}`}>
            {STATUS_LABELS[campaign.status] || campaign.status}
          </span>
        </div>

        {campaign.description && (
          <p className="text-slate-400 mb-6">{campaign.description}</p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="text-sm text-slate-400">Presupuesto</div>
            <div className="text-2xl font-bold text-white mt-1">${campaign.budget.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="text-sm text-slate-400">Gastado</div>
            <div className="text-2xl font-bold text-white mt-1">${campaign.spent.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="text-sm text-slate-400">Vistas totales</div>
            <div className="text-2xl font-bold text-white mt-1">{campaign.totalViews.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="text-sm text-slate-400">CPM</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">${campaign.cpmRate.toFixed(2)}</div>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-400">Gasto vs Presupuesto</span>
            <span className="text-white font-medium">{budgetPercent}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${budgetPercent >= 90 ? 'bg-red-500' : budgetPercent >= 70 ? 'bg-yellow-500' : 'bg-purple-500'}`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>${campaign.spent.toFixed(2)} gastado</span>
            <span>${(campaign.budget - campaign.spent).toFixed(2)} restante</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Clips */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Clips incluidos ({campaign.clips.length})</h2>
            {campaign.clips.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">Sin clips en esta campaña</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaign.clips.map((clip) => (
                  <div key={clip.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-16 h-11 bg-slate-700 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {clip.thumbnailUrl ? (
                        <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg text-slate-500">🎬</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{clip.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {clip.claims} claims · {clip.views.toLocaleString()} vistas
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Clippers */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Top Clippers</h2>
            {campaign.topClippers.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">Sin clippers activos todavía</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaign.topClippers.map((clipper, index) => (
                  <div key={clipper.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-400">
                      #{index + 1}
                    </div>
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {clipper.avatarUrl ? (
                        <img src={clipper.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-lg">👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{clipper.name}</div>
                      <div className="text-xs text-slate-400">{clipper.views.toLocaleString()} vistas</div>
                    </div>
                    <div className="text-green-400 font-medium text-sm">${clipper.earnings.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
