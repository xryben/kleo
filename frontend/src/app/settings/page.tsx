'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { instagramApi, youtubeApi, tiktokApi } from '@/lib/api';
import { useAuth, logout } from '@/lib/useAuth';
import { Modal } from '@/components/ui/modal';

interface SocialStatus {
  connected: boolean;
  username?: string;
  channelName?: string;
  tokenExpires?: string;
}

const PLATFORMS = [
  {
    key: 'ig',
    label: 'Instagram',
    emoji: '📸',
    gradient: 'from-purple-500 to-pink-500',
    api: instagramApi,
    nameKey: 'username' as const,
    prefix: '@',
  },
  {
    key: 'yt',
    label: 'YouTube Shorts',
    emoji: '▶️',
    gradient: 'from-red-500 to-red-600',
    api: youtubeApi,
    nameKey: 'channelName' as const,
    prefix: '',
  },
  {
    key: 'tt',
    label: 'TikTok',
    emoji: '🎵',
    gradient: 'from-slate-800 to-slate-900',
    api: tiktokApi,
    nameKey: 'username' as const,
    prefix: '@',
  },
];

function SettingsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const [statuses, setStatuses] = useState<Record<string, SocialStatus>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [disconnectTarget, setDisconnectTarget] = useState<{
    key: string;
    api: typeof instagramApi;
  } | null>(null);

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;

    const toasts: Record<string, string> = {
      'ig=connected': '✅ Instagram conectado',
      'ig=error': '❌ Error al conectar Instagram',
      'yt=connected': '✅ YouTube conectado',
      'yt=error': '❌ Error al conectar YouTube',
      'tt=connected': '✅ TikTok conectado',
      'tt=error': '❌ Error al conectar TikTok',
    };
    for (const [param, msg] of Object.entries(toasts)) {
      const [k, v] = param.split('=');
      if (params.get(k) === v) {
        setToast(msg);
        break;
      }
    }

    Promise.all(
      PLATFORMS.map((p) =>
        p.api.status().then((s: SocialStatus) => [p.key, s] as [string, SocialStatus]),
      ),
    )
      .then((results) => setStatuses(Object.fromEntries(results)))
      .finally(() => setLoading(false));
  }, [auth.isLoading, auth.isAuthenticated, router, params]);

  async function handleConnect(api: typeof instagramApi) {
    const data = await api.authUrl();
    window.location.href = data.url;
  }

  async function handleDisconnect() {
    if (!disconnectTarget) return;
    const { key, api } = disconnectTarget;
    await api.disconnect();
    setStatuses((s) => ({ ...s, [key]: { connected: false } }));
    setDisconnectTarget(null);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-400 hover:text-white">
          ←
        </Link>
        <span className="text-lg font-bold text-white">Configuración</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {toast && (
          <div
            className={`px-4 py-3 rounded-xl text-sm ${toast.startsWith('✅') ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}
          >
            {toast}
          </div>
        )}

        {/* Social platforms */}
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
            Redes sociales
          </h2>
          <div className="space-y-3">
            {PLATFORMS.map((p) => {
              const status = statuses[p.key];
              const name = status?.[p.nameKey as keyof SocialStatus];
              return (
                <div key={p.key} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 bg-gradient-to-br ${p.gradient} rounded-lg flex items-center justify-center text-lg`}
                      >
                        {p.emoji}
                      </div>
                      <div>
                        <div className="font-medium text-white">{p.label}</div>
                        {loading ? (
                          <div className="text-xs text-slate-500">Cargando...</div>
                        ) : status?.connected ? (
                          <div className="text-xs text-green-400">
                            {p.prefix}
                            {name as string}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">No conectado</div>
                        )}
                      </div>
                    </div>
                    {!loading &&
                      (status?.connected ? (
                        <button
                          onClick={() => setDisconnectTarget({ key: p.key, api: p.api })}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Desconectar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(p.api)}
                          className={`bg-gradient-to-r ${p.gradient} text-white text-xs font-medium px-3 py-1.5 rounded-lg`}
                        >
                          Conectar
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Account */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">Cuenta</h2>
          <button
            onClick={() => logout(router)}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Cerrar sesión
          </button>
        </div>
      </main>

      {/* Disconnect confirmation dialog */}
      <Modal
        open={!!disconnectTarget}
        onOpenChange={(open) => {
          if (!open) setDisconnectTarget(null);
        }}
        title="Desconectar red social"
        description="¿Estás seguro de que quieres desconectar esta cuenta?"
        footer={
          <>
            <button
              onClick={() => setDisconnectTarget(null)}
              className="text-sm text-slate-400 hover:text-white px-3 py-1.5"
            >
              Cancelar
            </button>
            <button
              onClick={handleDisconnect}
              className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg"
            >
              Desconectar
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Tendrás que volver a conectar tu cuenta para publicar clips en esta plataforma.
        </p>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Cargando...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
