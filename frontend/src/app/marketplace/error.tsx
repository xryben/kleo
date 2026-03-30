'use client';

import Link from 'next/link';

export default function MarketplaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-white mb-2">Error en el marketplace</h2>
        <p className="text-sm text-slate-400 mb-6">
          {error.message || 'No se pudo cargar el marketplace.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
