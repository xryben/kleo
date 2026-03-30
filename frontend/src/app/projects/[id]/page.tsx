'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi, clipsApi, publishApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import { useToast } from '@/components/ui/toast';
import { platformIcon } from '@/lib/design-tokens';

interface SocialPublish {
  platform: 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK';
  status: 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
}

interface Clip {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  startTime: number;
  endTime: number;
  thumbnail: string | null;
  publishes: SocialPublish[];
}

interface Project {
  id: string;
  title: string;
  status: string;
  sourceType: string;
  sourceUrl: string | null;
  duration: number | null;
  clips: Clip[];
  createdAt: string;
}

const STEPS = ['DOWNLOADING', 'TRANSCRIBING', 'ANALYZING', 'CUTTING', 'READY'];
const STEP_LABELS: Record<string, string> = {
  DOWNLOADING: 'Descargando',
  TRANSCRIBING: 'Transcribiendo',
  ANALYZING: 'Analizando con IA',
  CUTTING: 'Cortando clips',
  READY: 'Listo',
};

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null); // `${clipId}-${platform}`

  const load = useCallback(async () => {
    try {
      const data = await projectsApi.get(params.id);
      setProject(data);
    } catch {
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;
    load();
  }, [auth.isLoading, auth.isAuthenticated, load]);

  // Poll while processing
  useEffect(() => {
    if (!project || project.status === 'READY' || project.status === 'FAILED') return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [project, load]);

  async function handlePublish(clipId: string, platform: 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK') {
    const key = `${clipId}-${platform}`;
    setPublishing(key);
    try {
      await publishApi.publish(clipId, platform);
      await load();
    } catch (err) {
      console.error(`Publish to ${platform} failed:`, err);
      toast(`Error al publicar en ${platform}. ¿Lo tienes conectado en Configuración?`, 'error');
    } finally {
      setPublishing(null);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando...
      </div>
    );
  if (!project) return null;

  const isProcessing = !['READY', 'FAILED', 'PENDING'].includes(project.status);
  const currentStep = STEPS.indexOf(project.status);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Volver al dashboard"
        >
          ←
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{project.title}</h1>
          {project.sourceUrl && (
            <a
              href={project.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:underline truncate block max-w-xs"
            >
              {project.sourceUrl}
            </a>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Progress bar */}
        {project.status !== 'FAILED' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-3">
              {isProcessing && <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />}
              <span className="text-sm font-medium text-white">
                {project.status === 'READY'
                  ? `✅ ${project.clips.length} clips generados`
                  : `⏳ ${STEP_LABELS[project.status] || project.status}...`}
              </span>
            </div>
            <div className="flex gap-2">
              {STEPS.slice(0, 5).map((step, i) => (
                <div key={step} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full transition-colors ${
                      i < currentStep
                        ? 'bg-purple-500'
                        : i === currentStep
                          ? 'bg-purple-400 animate-pulse'
                          : 'bg-slate-700'
                    }`}
                  />
                  <div
                    className={`text-xs mt-1 ${i <= currentStep ? 'text-purple-400' : 'text-slate-600'}`}
                  >
                    {STEP_LABELS[step]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {project.status === 'FAILED' && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-8">
            ❌ Error procesando el video. Intenta de nuevo.
          </div>
        )}

        {/* Clips grid */}
        {project.clips.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Clips generados
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({project.clips.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.clips.map((clip, i) => (
                <div
                  key={clip.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
                >
                  {/* Thumbnail / play area */}
                  <button
                    onClick={() => setSelectedClip(clip)}
                    className="w-full aspect-[9/16] bg-slate-900 flex items-center justify-center relative hover:bg-slate-800 transition-colors group"
                  >
                    <div className="text-4xl group-hover:scale-110 transition-transform">▶️</div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                      {Math.round(clip.duration)}s
                    </div>
                    <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-0.5 rounded">
                      #{i + 1}
                    </div>
                  </button>

                  {/* Info */}
                  <div className="p-3">
                    <div className="text-sm font-medium text-white mb-1 line-clamp-2">
                      {clip.title}
                    </div>
                    {clip.description && (
                      <div className="text-xs text-slate-400 line-clamp-2 mb-2">
                        {clip.description}
                      </div>
                    )}
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => setSelectedClip(clip)}
                        className="flex-1 min-w-0 text-xs bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded-lg transition-colors"
                      >
                        ▶ Preview
                      </button>
                      {(
                        [
                          {
                            platform: 'INSTAGRAM' as const,
                            label: platformIcon('INSTAGRAM'),
                            color: 'bg-pink-600 hover:bg-pink-700',
                          },
                          {
                            platform: 'YOUTUBE' as const,
                            label: platformIcon('YOUTUBE'),
                            color: 'bg-red-600 hover:bg-red-700',
                          },
                          {
                            platform: 'TIKTOK' as const,
                            label: platformIcon('TIKTOK'),
                            color: 'bg-slate-600 hover:bg-slate-500',
                          },
                        ] as const
                      ).map(({ platform, label, color }) => {
                        const pub = clip.publishes.find((p) => p.platform === platform);
                        const isPublished = pub?.status === 'PUBLISHED';
                        const isPublishing = publishing === `${clip.id}-${platform}`;
                        return (
                          <button
                            key={platform}
                            onClick={() => !isPublished && handlePublish(clip.id, platform)}
                            disabled={isPublished || isPublishing}
                            title={platform}
                            aria-label={`${isPublishing ? 'Publicando en' : isPublished ? 'Publicado en' : 'Publicar en'} ${platform}`}
                            className={`px-2 py-1.5 rounded-lg text-xs text-white transition-colors disabled:opacity-60 ${
                              isPublished ? 'bg-green-600' : color
                            }`}
                          >
                            {isPublishing ? '⏳' : isPublished ? '✅' : label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Video preview modal */}
      {selectedClip && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa: ${selectedClip.title}`}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedClip(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedClip(null);
          }}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <div className="text-sm font-medium text-white line-clamp-1">
                {selectedClip.title}
              </div>
              <button
                onClick={() => setSelectedClip(null)}
                className="text-slate-400 hover:text-white"
                aria-label="Cerrar vista previa"
              >
                ✕
              </button>
            </div>
            <video
              src={clipsApi.streamUrl(selectedClip.id)}
              controls
              autoPlay
              className="w-full aspect-[9/16] bg-black"
            />
            {selectedClip.description && (
              <div className="px-4 py-3 text-sm text-slate-300">{selectedClip.description}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
