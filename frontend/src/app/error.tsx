'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-white mb-2">Algo salió mal</h2>
        <p className="text-sm text-slate-400 mb-6">
          {error.message || 'Ocurrió un error inesperado.'}
        </p>
        <button
          onClick={reset}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
