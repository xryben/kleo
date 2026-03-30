'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  createdAt: string;
  _count: { users: number; projects: number };
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-slate-500/20 text-slate-300',
  STARTER: 'bg-blue-500/20 text-blue-300',
  PRO: 'bg-purple-500/20 text-purple-300',
  ENTERPRISE: 'bg-yellow-500/20 text-yellow-300',
};

export default function AdminTenantsPage() {
  const router = useRouter();
  const auth = useAuth({ requiredRole: 'SUPER_ADMIN' });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;
    adminApi
      .listTenants()
      .then(setTenants)
      .finally(() => setLoading(false));
  }, [auth.isLoading, auth.isAuthenticated]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
          ←
        </Link>
        <span className="text-lg font-bold text-white">Tenants</span>
        <div className="ml-auto">
          <Link
            href="/admin/tenants/new"
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo tenant
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-16 text-slate-500">Cargando...</div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-700/50">
              {tenants.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/tenants/${t.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full ${t.active ? 'bg-green-400' : 'bg-red-400'}`}
                    />
                    <div>
                      <div className="font-medium text-white">{t.name}</div>
                      <div className="text-xs text-slate-400">
                        {t.slug} · {new Date(t.createdAt).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">{t._count.users} usuarios</span>
                    <span className="text-slate-400">{t._count.projects} proyectos</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_COLORS[t.plan] || 'bg-slate-500/20 text-slate-300'}`}
                    >
                      {t.plan}
                    </span>
                    <span className="text-slate-500">→</span>
                  </div>
                </Link>
              ))}
              {tenants.length === 0 && (
                <div className="px-5 py-16 text-center text-slate-500">Sin tenants todavía</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
