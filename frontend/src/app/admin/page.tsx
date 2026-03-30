'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAuth, logout } from '@/lib/useAuth';
import { statusTextColor } from '@/lib/design-tokens';

interface Stats {
  totals: {
    tenants: number;
    users: number;
    projects: number;
    clips: number;
    publishedClips: number;
  };
  projectsByStatus: Record<string, number>;
  recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    tenant: { name: string; slug: string };
    user: { name: string; email: string };
    _count: { clips: number };
  }>;
}

export default function AdminPage() {
  const router = useRouter();
  const auth = useAuth({ requiredRole: 'SUPER_ADMIN' });
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;
    const controller = new AbortController();
    adminApi
      .stats()
      .then((data) => {
        if (!controller.signal.aborted) setStats(data);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.isLoading, auth.isAuthenticated]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando...
      </div>
    );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✂️</span>
          <span className="text-lg font-bold text-white">Cleo</span>
          <span className="bg-purple-500/20 text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/tenants"
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Tenants
          </Link>
          <button
            onClick={() => logout(router)}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Tenants', value: stats?.totals.tenants, emoji: '🏢' },
            { label: 'Usuarios', value: stats?.totals.users, emoji: '👤' },
            { label: 'Proyectos', value: stats?.totals.projects, emoji: '🎬' },
            { label: 'Clips', value: stats?.totals.clips, emoji: '✂️' },
            { label: 'Publicados', value: stats?.totals.publishedClips, emoji: '📤' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-2xl mb-1">{kpi.emoji}</div>
              <div className="text-2xl font-bold text-white">{kpi.value ?? 0}</div>
              <div className="text-xs text-slate-400 mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Status breakdown */}
        {stats?.projectsByStatus && Object.keys(stats.projectsByStatus).length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-8">
            <h2 className="text-sm font-medium text-slate-300 mb-3">Proyectos por estado</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.projectsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium ${statusTextColor(status)}`}>{status}</span>
                  <span className="text-white font-bold text-sm">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent projects */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">Proyectos recientes</h2>
            <Link href="/admin/tenants" className="text-xs text-purple-400 hover:underline">
              Ver todos los tenants →
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {stats?.recentProjects.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{p.title}</div>
                  <div className="text-xs text-slate-400">
                    {p.tenant.name} · {p.user.email} ·{' '}
                    {new Date(p.createdAt).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-400">{p._count.clips} clips</span>
                  <span className={statusTextColor(p.status)}>{p.status}</span>
                </div>
              </div>
            ))}
            {!stats?.recentProjects.length && (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">
                Sin proyectos todavía
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
