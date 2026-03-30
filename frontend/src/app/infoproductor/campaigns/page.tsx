'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { campaignsApi } from '@/lib/api';

interface Campaign {
  id: string;
  title: string;
  status: string;
  budget: number;
  spent: number;
  totalViews: number;
  clipsCount: number;
  createdAt: string;
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

export default function CampaignsListPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cleo_token');
    if (!token) { router.replace('/login'); return; }

    campaignsApi.list().then(setCampaigns).catch(() => setCampaigns([])).finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✂️</span>
          <Link href="/dashboard" className="text-lg font-bold text-white hover:text-purple-400 transition-colors">Cleo</Link>
          <span className="text-slate-600 mx-2">/</span>
          <span className="text-sm text-slate-300 font-medium">Mis Campañas</span>
        </div>
        <Link
          href="/infoproductor/campaigns/new"
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2"
        >
          <span>+</span> Nueva campaña
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Mis Campañas</h1>
          <p className="text-slate-400 text-sm mt-1">Gestiona tus campañas de marketplace</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-pulse">
                <div className="h-5 bg-slate-700 rounded w-1/3 mb-3" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📢</div>
            <h2 className="text-lg font-medium text-white mb-2">Sin campañas todavía</h2>
            <p className="text-slate-400 text-sm mb-6">Crea tu primera campaña para distribuir tus clips en el marketplace</p>
            <Link
              href="/infoproductor/campaigns/new"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors inline-block"
            >
              Crear primera campaña
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => {
              const budgetPercent = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
              return (
                <Link
                  key={c.id}
                  href={`/infoproductor/campaigns/${c.id}`}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-colors block"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white text-lg">{c.title}</h3>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-400'}`}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Creada el {new Date(c.createdAt).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <span className="text-slate-500">→</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-white">${c.budget.toFixed(2)}</div>
                      <div className="text-xs text-slate-400">Presupuesto</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">${c.spent.toFixed(2)}</div>
                      <div className="text-xs text-slate-400">Gastado</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{c.totalViews.toLocaleString()}</div>
                      <div className="text-xs text-slate-400">Vistas totales</div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 mt-2">{budgetPercent}% del presupuesto usado · {c.clipsCount} clips</div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
