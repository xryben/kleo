'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clipperApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import {
  statusTextColor,
  statusLabel,
  platformIcon,
  platforms as platformConfig,
} from '@/lib/design-tokens';

interface PlatformViews {
  platform: string;
  views: number;
}

interface EarningsData {
  totalEarnings: number;
  totalPayouts: number;
  pendingBalance: number;
  byClip: {
    clipId: string;
    clipTitle: string;
    earnings: number;
    views: number;
    cpmRate: number;
    platformBreakdown?: PlatformViews[];
  }[];
  byCampaign: {
    campaignId: string;
    campaignTitle: string;
    earnings: number;
    clipsCount: number;
  }[];
  payouts: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
}

const PLATFORM_BAR_COLORS: Record<string, string> = {
  TIKTOK: 'bg-pink-500',
  INSTAGRAM: 'bg-orange-500',
  YOUTUBE: 'bg-red-500',
};

export default function EarningsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'clips' | 'campaigns' | 'payouts'>('clips');

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;

    const controller = new AbortController();
    clipperApi
      .earnings()
      .then(setData)
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load earnings:', err);
          setData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.isLoading, auth.isAuthenticated]);

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
          <span className="text-sm text-slate-300 font-medium">Ganancias</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Mis Ganancias</h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-pulse"
              >
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-3" />
                <div className="h-8 bg-slate-700 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : !data ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-slate-400">No se pudieron cargar las ganancias</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-sm text-slate-400">Ganancias totales</div>
                <div className="text-3xl font-bold text-green-400 mt-2">
                  ${data.totalEarnings.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-sm text-slate-400">Pagos recibidos</div>
                <div className="text-3xl font-bold text-white mt-2">
                  ${data.totalPayouts.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-sm text-slate-400">Balance pendiente</div>
                <div className="text-3xl font-bold text-purple-400 mt-2">
                  ${data.pendingBalance.toFixed(2)}
                </div>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 mb-6">
              {(['clips', 'campaigns', 'payouts'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    view === v
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {v === 'clips' ? 'Por clip' : v === 'campaigns' ? 'Por campaña' : 'Pagos'}
                </button>
              ))}
            </div>

            {/* By Clip — with per-platform breakdown */}
            {view === 'clips' && (
              <div className="space-y-3">
                {data.byClip.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Sin ganancias por clips todavía
                  </div>
                ) : (
                  data.byClip.map((item) => {
                    const breakdown = item.platformBreakdown || [];
                    return (
                      <div
                        key={item.clipId}
                        className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">{item.clipTitle}</div>
                            <div className="text-xs text-slate-400 mt-1">
                              {item.views.toLocaleString()} vistas · ${item.cpmRate.toFixed(2)} CPM
                            </div>
                          </div>
                          <div className="text-green-400 font-bold">
                            ${item.earnings.toFixed(2)}
                          </div>
                        </div>

                        {/* Platform breakdown */}
                        {breakdown.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <div className="flex items-center gap-1 mb-2">
                              {breakdown.map((pb) => {
                                const pct = item.views > 0 ? (pb.views / item.views) * 100 : 0;
                                return (
                                  <div
                                    key={pb.platform}
                                    className={`h-2 rounded-full ${PLATFORM_BAR_COLORS[pb.platform] || 'bg-slate-500'} transition-all`}
                                    style={{ width: `${Math.max(pct, 2)}%` }}
                                    title={`${pb.platform}: ${pb.views.toLocaleString()} vistas`}
                                  />
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {breakdown.map((pb) => (
                                <div
                                  key={pb.platform}
                                  className="flex items-center gap-1.5 text-xs text-slate-400"
                                >
                                  <span>{platformIcon(pb.platform)}</span>
                                  <span>{pb.views.toLocaleString()} vistas</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* By Campaign */}
            {view === 'campaigns' && (
              <div className="space-y-3">
                {data.byCampaign.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Sin ganancias por campañas todavía
                  </div>
                ) : (
                  data.byCampaign.map((item) => (
                    <div
                      key={item.campaignId}
                      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-white">{item.campaignTitle}</div>
                        <div className="text-xs text-slate-400 mt-1">{item.clipsCount} clips</div>
                      </div>
                      <div className="text-green-400 font-bold">${item.earnings.toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Payouts */}
            {view === 'payouts' && (
              <div className="space-y-3">
                {data.payouts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">Sin pagos todavía</div>
                ) : (
                  data.payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-white">${payout.amount.toFixed(2)}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(payout.createdAt).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${statusTextColor(payout.status)}`}>
                        {statusLabel(payout.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
