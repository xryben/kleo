'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import { statusTextColor } from '@/lib/design-tokens';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  createdAt: string;
  users: Array<{ id: string; name: string; email: string; role: string; createdAt: string }>;
  _count: { projects: number };
  projects: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    _count: { clips: number };
  }>;
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'text-slate-300',
  STARTER: 'text-blue-300',
  PRO: 'text-purple-300',
  ENTERPRISE: 'text-yellow-300',
};

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const auth = useAuth({ requiredRole: 'SUPER_ADMIN' });
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', plan: '', active: true });
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;
    const controller = new AbortController();
    adminApi
      .getTenant(params.id)
      .then((data) => {
        if (controller.signal.aborted) return;
        setTenant(data);
        setEditForm({ name: data.name, plan: data.plan, active: data.active });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.isLoading, auth.isAuthenticated, params.id]);

  async function handleSave() {
    if (!tenant) return;
    await adminApi.updateTenant(tenant.id, editForm);
    setTenant((t) => (t ? { ...t, ...editForm } : null));
    setEditing(false);
  }

  async function handleImpersonate() {
    if (!tenant) return;
    setImpersonating(true);
    try {
      const data = await adminApi.impersonate(tenant.id);
      localStorage.setItem('cleo_admin_token', localStorage.getItem('cleo_token') || '');
      localStorage.setItem('cleo_token', data.token);
      localStorage.setItem('cleo_role', 'OWNER');
      router.push('/dashboard');
    } finally {
      setImpersonating(false);
    }
  }

  async function handleToggleActive() {
    if (!tenant) return;
    await adminApi.updateTenant(tenant.id, { active: !tenant.active });
    setTenant((t) => (t ? { ...t, active: !t.active } : null));
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando...
      </div>
    );
  if (!tenant) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link
          href="/admin/tenants"
          className="text-slate-400 hover:text-white"
          aria-label="Volver a tenants"
        >
          ←
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{tenant.name}</h1>
          <div className="text-xs text-slate-400">{tenant.slug}</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImpersonate}
            disabled={impersonating}
            className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            {impersonating ? '...' : '🎭 Impersonar'}
          </button>
          <button
            onClick={handleToggleActive}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              tenant.active
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
            }`}
          >
            {tenant.active ? 'Suspender' : 'Activar'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Info card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Información</h2>
            <button
              onClick={() => setEditing(!editing)}
              className="text-xs text-purple-400 hover:underline"
            >
              {editing ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Plan</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  {['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSave}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                Guardar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                {
                  label: 'Plan',
                  value: <span className={PLAN_COLORS[tenant.plan]}>{tenant.plan}</span>,
                },
                {
                  label: 'Estado',
                  value: (
                    <span className={tenant.active ? 'text-green-400' : 'text-red-400'}>
                      {tenant.active ? 'Activo' : 'Suspendido'}
                    </span>
                  ),
                },
                { label: 'Proyectos', value: tenant._count.projects },
                {
                  label: 'Miembro desde',
                  value: new Date(tenant.createdAt).toLocaleDateString('es-ES'),
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-xs text-slate-400 mb-0.5">{item.label}</div>
                  <div className="font-medium text-white">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-white">Usuarios ({tenant.users.length})</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {tenant.users.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </div>
                <span className="text-xs text-slate-400">{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent projects */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-white">Proyectos recientes</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {tenant.projects.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{p.title}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400">{p._count.clips} clips</span>
                  <span className={statusTextColor(p.status)}>{p.status}</span>
                </div>
              </div>
            ))}
            {tenant.projects.length === 0 && (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">Sin proyectos</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
