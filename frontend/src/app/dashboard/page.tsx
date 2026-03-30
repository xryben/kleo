'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi } from '@/lib/api';

interface Project {
  id: string;
  title: string;
  status: string;
  sourceType: string;
  createdAt: string;
  _count: { clips: number };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En cola',
  DOWNLOADING: 'Descargando',
  TRANSCRIBING: 'Transcribiendo',
  ANALYZING: 'Analizando',
  CUTTING: 'Cortando clips',
  READY: 'Listo',
  FAILED: 'Error',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-slate-400',
  DOWNLOADING: 'text-blue-400',
  TRANSCRIBING: 'text-yellow-400',
  ANALYZING: 'text-orange-400',
  CUTTING: 'text-purple-400',
  READY: 'text-green-400',
  FAILED: 'text-red-400',
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const isImpersonating = typeof window !== 'undefined' && !!localStorage.getItem('cleo_admin_token');

  function exitImpersonation() {
    const adminToken = localStorage.getItem('cleo_admin_token');
    if (adminToken) {
      localStorage.setItem('cleo_token', adminToken);
      localStorage.removeItem('cleo_admin_token');
      localStorage.setItem('cleo_role', 'SUPER_ADMIN');
    }
    router.push('/admin');
  }

  useEffect(() => {
    const token = localStorage.getItem('cleo_token');
    const role = localStorage.getItem('cleo_role');
    if (!token) { router.replace('/login'); return; }
    // SUPER_ADMIN without impersonation → back to admin
    if (role === 'SUPER_ADMIN' && !localStorage.getItem('cleo_admin_token')) {
      router.replace('/admin'); return;
    }
    projectsApi.list().then(setProjects).finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen">
      {/* Impersonation bar */}
      {isImpersonating && (
        <div className="bg-orange-500 px-6 py-2 flex items-center justify-between text-sm">
          <span className="text-white font-medium">🎭 Modo impersonación activo</span>
          <button onClick={exitImpersonation} className="bg-white text-orange-600 font-medium px-3 py-1 rounded text-xs hover:bg-orange-50 transition-colors">
            Volver al admin
          </button>
        </div>
      )}
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✂️</span>
          <span className="text-lg font-bold text-white">Cleo</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-slate-400 hover:text-white text-sm transition-colors">
            Configuración
          </Link>
          <button
            onClick={() => { localStorage.removeItem('cleo_token'); router.push('/login'); }}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis proyectos</h1>
            <p className="text-slate-400 text-sm mt-1">Videos procesados y clips generados</p>
          </div>
          <Link
            href="/projects/new"
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>+</span> Nuevo proyecto
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500">Cargando...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎬</div>
            <h2 className="text-lg font-medium text-white mb-2">Sin proyectos todavía</h2>
            <p className="text-slate-400 text-sm mb-6">
              Pega una URL de YouTube o sube un video para generar clips automáticos
            </p>
            <Link
              href="/projects/new"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-lg transition-colors inline-block"
            >
              Crear primer proyecto
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-center justify-between hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-xl">
                    {p.sourceType === 'YOUTUBE' ? '▶️' : '📹'}
                  </div>
                  <div>
                    <div className="font-medium text-white">{p.title}</div>
                    <div className="text-sm text-slate-400 mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  {p.status === 'READY' && (
                    <div className="text-slate-300">
                      <span className="font-medium text-white">{p._count.clips}</span> clips
                    </div>
                  )}
                  <div className={`font-medium ${STATUS_COLORS[p.status] || 'text-slate-400'}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </div>
                  <span className="text-slate-500">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
