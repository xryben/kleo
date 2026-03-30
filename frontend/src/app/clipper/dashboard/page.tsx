'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clipperApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import { statusTextColor, statusLabel } from '@/lib/design-tokens';

interface DashboardData {
  totalEarnings: number;
  activeClaims: number;
  pendingSubmissions: number;
  recentClaims: {
    id: string;
    clipTitle: string;
    status: string;
    earnings: number;
    createdAt: string;
  }[];
}

export default function ClipperDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;

    const controller = new AbortController();
    clipperApi
      .dashboard()
      .then(setData)
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load clipper dashboard:', err);
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
          <span className="text-sm text-slate-300 font-medium">Clipper Dashboard</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/marketplace" className="text-slate-400 hover:text-white transition-colors">
            Marketplace
          </Link>
          <Link
            href="/clipper/claims"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Mis Claims
          </Link>
          <Link
            href="/clipper/earnings"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Ganancias
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Mi Dashboard</h1>

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
            <div className="text-5xl mb-4">📊</div>
            <p className="text-slate-400">No se pudieron cargar los datos</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-sm text-slate-400">Ganancias totales</div>
                <div className="text-3xl font-bold text-green-400 mt-2">
                  ${data.totalEarnings.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-sm text-slate-400">Claims activos</div>
                <div className="text-3xl font-bold text-white mt-2">{data.activeClaims}</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-sm text-slate-400">Pendientes de verificación</div>
                <div className="text-3xl font-bold text-yellow-400 mt-2">
                  {data.pendingSubmissions}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Link
                href="/marketplace"
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Buscar clips
              </Link>
              <Link
                href="/clipper/claims"
                className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Ver todos mis claims
              </Link>
              <Link
                href="/clipper/earnings"
                className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Historial de ganancias
              </Link>
            </div>

            {/* Recent Claims */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Claims recientes</h2>
              {data.recentClaims.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <div className="text-4xl mb-3">🎬</div>
                  <p className="text-slate-400 text-sm">No tienes claims todavía</p>
                  <Link
                    href="/marketplace"
                    className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block"
                  >
                    Explora el marketplace →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentClaims.map((claim) => (
                    <Link
                      key={claim.id}
                      href={`/clipper/claims/${claim.id}`}
                      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-purple-500/50 transition-colors block"
                    >
                      <div>
                        <div className="font-medium text-white">{claim.clipTitle}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(claim.createdAt).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {claim.earnings > 0 && (
                          <span className="text-green-400 font-medium">
                            ${claim.earnings.toFixed(2)}
                          </span>
                        )}
                        <span className={`font-medium ${statusTextColor(claim.status)}`}>
                          {statusLabel(claim.status)}
                        </span>
                        <span className="text-slate-500">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
