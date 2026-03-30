'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';

export default function NewTenantPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    plan: 'FREE',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'name') {
      setForm((f) => ({
        ...f,
        name: value,
        slug: value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, ''),
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.createTenant(form);
      router.push('/admin/tenants');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al crear tenant');
    } finally {
      setLoading(false);
    }
  }

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
        <span className="text-lg font-bold text-white">Nuevo tenant</span>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {[
            { key: 'name', label: 'Nombre de la empresa', placeholder: 'Acme Inc.' },
            { key: 'slug', label: 'Slug (URL)', placeholder: 'acme-inc' },
            { key: 'ownerName', label: 'Nombre del owner', placeholder: 'Juan García' },
            { key: 'ownerEmail', label: 'Email del owner', placeholder: 'juan@acme.com' },
            { key: 'ownerPassword', label: 'Contraseña inicial', placeholder: 'Min. 8 caracteres' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-sm text-slate-300 mb-1">{field.label}</label>
              <input
                type={
                  field.key === 'ownerPassword'
                    ? 'password'
                    : field.key === 'ownerEmail'
                      ? 'email'
                      : 'text'
                }
                value={form[field.key as keyof typeof form]}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm text-slate-300 mb-1">Plan</label>
            <select
              value={form.plan}
              onChange={(e) => set('plan', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              {['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? 'Creando...' : 'Crear tenant'}
          </button>
        </form>
      </main>
    </div>
  );
}
