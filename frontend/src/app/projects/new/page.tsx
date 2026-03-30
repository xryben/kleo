'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi } from '@/lib/api';

export default function NewProjectPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'youtube' | 'upload'>('youtube');
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('El título es obligatorio'); return; }
    setError('');
    setLoading(true);

    try {
      let project;
      if (mode === 'youtube') {
        if (!youtubeUrl) { setError('URL de YouTube obligatoria'); setLoading(false); return; }
        project = await projectsApi.create({ title, sourceType: 'YOUTUBE', sourceUrl: youtubeUrl });
      } else {
        if (!file) { setError('Selecciona un video'); setLoading(false); return; }
        project = await projectsApi.upload(title, file, setUploadProgress);
      }
      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">←</Link>
        <span className="text-lg font-bold text-white">Nuevo proyecto</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Título del proyecto</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Podcast episodio 42"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Source type tabs */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Fuente del video</label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode('youtube')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'youtube' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ▶️ YouTube URL
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'upload' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                📁 Subir archivo
              </button>
            </div>

            {mode === 'youtube' ? (
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => e.target.files && setFile(e.target.files[0])}
                />
                {file ? (
                  <div>
                    <div className="text-2xl mb-2">🎬</div>
                    <div className="text-white font-medium">{file.name}</div>
                    <div className="text-slate-400 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-3">📁</div>
                    <div className="text-slate-300 font-medium">Arrastra tu video aquí</div>
                    <div className="text-slate-500 text-sm mt-1">o haz clic para seleccionar (máx. 500MB)</div>
                    <div className="text-slate-600 text-xs mt-2">MP4, MOV, AVI, MKV, WebM</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {loading && mode === 'upload' && uploadProgress > 0 && (
            <div>
              <div className="flex justify-between text-sm text-slate-400 mb-1">
                <span>Subiendo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
            <div className="font-medium text-slate-300 mb-1">¿Qué pasa después?</div>
            Cleo descargará el video, lo transcribirá y usará IA para detectar los momentos más virales.
            Luego recortará clips de máximo 59 segundos automáticamente. Recibirás entre 3 y 8 clips.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? 'Procesando...' : 'Generar clips ✂️'}
          </button>
        </form>
      </main>
    </div>
  );
}
