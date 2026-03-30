'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { campaignsApi, projectsApi, clipsApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';

interface Project {
  id: string;
  title: string;
  status: string;
  clips: { id: string; title: string; duration: number }[];
}

export default function NewCampaignPage() {
  const router = useRouter();
  const auth = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [cpmRate, setCpmRate] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;

    projectsApi
      .list()
      .then((data: Project[]) =>
        setProjects(data.filter((p) => p.status === 'READY' && p.clips?.length > 0)),
      )
      .catch((err) => {
        console.error('Failed to load projects:', err);
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, [auth.isLoading, auth.isAuthenticated]);

  function toggleClip(clipId: string) {
    setSelectedClips((prev) =>
      prev.includes(clipId) ? prev.filter((id) => id !== clipId) : [...prev, clipId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !budget || !cpmRate || selectedClips.length === 0) {
      setError('Completa todos los campos y selecciona al menos un clip');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const campaign = await campaignsApi.create({
        title: title.trim(),
        description: description.trim(),
        budget: parseFloat(budget),
        cpmRate: parseFloat(cpmRate),
        clipIds: selectedClips,
      });
      router.push(`/infoproductor/campaigns/${campaign.id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al crear la campaña';
      console.error('Campaign creation failed:', err);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4">
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
            href="/infoproductor/campaigns"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Campañas
          </Link>
          <span className="text-slate-600 mx-2">/</span>
          <span className="text-sm text-slate-300 font-medium">Nueva</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Crear Campaña</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Título de la campaña
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Promoción curso React 2025"
              required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe los objetivos de la campaña..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Budget and CPM */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Presupuesto total ($)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="500.00"
                min="1"
                step="0.01"
                required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">CPM ($)</label>
              <input
                type="number"
                value={cpmRate}
                onChange={(e) => setCpmRate(e.target.value)}
                placeholder="5.00"
                min="0.01"
                step="0.01"
                required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {budget && cpmRate && parseFloat(cpmRate) > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm">
              <span className="text-slate-400">Vistas estimadas: </span>
              <span className="text-white font-medium">
                {Math.floor((parseFloat(budget) / parseFloat(cpmRate)) * 1000).toLocaleString()}
              </span>
            </div>
          )}

          {/* Select Clips */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Seleccionar clips ({selectedClips.length} seleccionados)
            </label>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse"
                  >
                    <div className="h-4 bg-slate-700 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
                <p className="text-slate-400 text-sm">No tienes proyectos con clips disponibles</p>
                <Link
                  href="/projects/new"
                  className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block"
                >
                  Crear un proyecto →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="text-sm font-medium text-slate-300 mb-3">{project.title}</div>
                    <div className="space-y-2">
                      {project.clips.map((clip) => (
                        <label
                          key={clip.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedClips.includes(clip.id)
                              ? 'bg-purple-500/20 border border-purple-500/50'
                              : 'bg-slate-900/50 border border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedClips.includes(clip.id)}
                            onChange={() => toggleClip(clip.id)}
                            className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{clip.title}</div>
                            <div className="text-xs text-slate-400">
                              {Math.floor(clip.duration / 60)}:
                              {String(clip.duration % 60).padStart(2, '0')}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              {submitting ? 'Creando...' : 'Crear campaña'}
            </button>
            <Link
              href="/infoproductor/campaigns"
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
