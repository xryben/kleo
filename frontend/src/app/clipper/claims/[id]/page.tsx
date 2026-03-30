'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { claimsApi, clipsApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';

type Platform = 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE';

interface PlatformSubmission {
  platform: Platform;
  url: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  views: number;
  rejectionReason?: string;
}

interface ClaimDetail {
  id: string;
  clipId: string;
  clipTitle: string;
  clipThumbnailUrl: string | null;
  status: string;
  earnings: number;
  platform: string;
  socialUrl: string | null;
  cpmRate: number;
  verifiedViews: number;
  submissions?: PlatformSubmission[];
  createdAt: string;
  submittedAt: string | null;
  verifiedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  CLAIMED: 'bg-blue-500/20 text-blue-400',
  SUBMITTED: 'bg-yellow-500/20 text-yellow-400',
  VERIFIED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  CLAIMED: 'Reclamado',
  SUBMITTED: 'Enviado',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
};

const PLATFORM_CONFIG: Record<
  Platform,
  { label: string; icon: string; placeholder: string; regex: RegExp }
> = {
  TIKTOK: {
    label: 'TikTok',
    icon: '🎵',
    placeholder: 'https://www.tiktok.com/@user/video/...',
    regex: /^https?:\/\/(www\.|vm\.)?tiktok\.com\/.+/i,
  },
  INSTAGRAM: {
    label: 'Instagram Reels',
    icon: '📸',
    placeholder: 'https://www.instagram.com/reel/...',
    regex: /^https?:\/\/(www\.)?instagram\.com\/(reel|p)\/.+/i,
  },
  YOUTUBE: {
    label: 'YouTube Shorts',
    icon: '▶️',
    placeholder: 'https://youtube.com/shorts/...',
    regex: /^https?:\/\/(www\.|m\.)?(youtube\.com\/shorts\/|youtu\.be\/).+/i,
  },
};

const PLATFORMS: Platform[] = ['TIKTOK', 'INSTAGRAM', 'YOUTUBE'];

const SUBMISSION_STATUS_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  PENDING: { icon: '🕐', color: 'text-yellow-400', label: 'Pendiente de verificación' },
  VERIFIED: { icon: '✅', color: 'text-green-400', label: 'Verificado — trackeando vistas' },
  REJECTED: { icon: '❌', color: 'text-red-400', label: 'Rechazado' },
};

export default function ClaimDetailPage() {
  const router = useRouter();
  const params = useParams();
  const claimId = params.id as string;
  const auth = useAuth();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Record<Platform, string>>({
    TIKTOK: '',
    INSTAGRAM: '',
    YOUTUBE: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<Platform, string>>(
    {} as Record<Platform, string>,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;

    claimsApi
      .get(claimId)
      .then((data) => {
        setClaim(data);
        if (data.socialUrl) {
          // Back-compat: populate the field that matches the original platform
          setUrls((prev) => ({ ...prev, [data.platform]: data.socialUrl }));
        }
        if (data.submissions) {
          const filled: Record<Platform, string> = { TIKTOK: '', INSTAGRAM: '', YOUTUBE: '' };
          data.submissions.forEach((s: PlatformSubmission) => {
            filled[s.platform] = s.url;
          });
          setUrls(filled);
        }
      })
      .catch(() => setError('No se pudo cargar el claim'))
      .finally(() => setLoading(false));
  }, [auth.isLoading, auth.isAuthenticated, claimId]);

  function validateUrl(platform: Platform, url: string): string {
    if (!url) return '';
    const config = PLATFORM_CONFIG[platform];
    if (!config.regex.test(url)) return `URL no válida para ${config.label}`;
    return '';
  }

  function handleUrlChange(platform: Platform, value: string) {
    setUrls((prev) => ({ ...prev, [platform]: value }));
    if (validationErrors[platform]) {
      setValidationErrors((prev) => ({ ...prev, [platform]: '' }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate: at least 1 URL required
    const filledUrls = PLATFORMS.filter((p) => urls[p].trim());
    if (filledUrls.length === 0) {
      setError('Debes ingresar al menos 1 URL');
      return;
    }

    // Validate each filled URL
    const errors: Record<string, string> = {};
    let hasError = false;
    filledUrls.forEach((p) => {
      const err = validateUrl(p, urls[p].trim());
      if (err) {
        errors[p] = err;
        hasError = true;
      }
    });
    if (hasError) {
      setValidationErrors(errors as Record<Platform, string>);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = filledUrls.map((p) => ({ platform: p, url: urls[p].trim() }));
      const updated = await claimsApi.submitMulti(claimId, payload);
      setClaim(updated);
      setSuccess('URLs enviadas correctamente. Pendiente de verificación.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al enviar las URLs');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✂️</span>
            <Link href="/clipper/claims" className="text-lg font-bold text-white">
              Cleo
            </Link>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-6 py-16 animate-pulse space-y-6">
          <div className="h-64 bg-slate-800 rounded-xl" />
          <div className="h-6 bg-slate-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-slate-400">{error || 'Claim no encontrado'}</p>
          <Link
            href="/clipper/claims"
            className="text-purple-400 hover:text-purple-300 text-sm mt-4 inline-block"
          >
            Volver a mis claims
          </Link>
        </div>
      </div>
    );
  }

  const streamUrl = clipsApi.streamUrl(claim.clipId);
  const submissions = claim.submissions || [];
  const totalViews = submissions.reduce((sum, s) => sum + (s.views || 0), 0) || claim.verifiedViews;
  const canSubmit = claim.status === 'CLAIMED' || claim.status === 'REJECTED';

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
            href="/clipper/claims"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Mis Claims
          </Link>
          <span className="text-slate-600 mx-2">/</span>
          <span className="text-sm text-slate-300 font-medium truncate max-w-[200px]">
            {claim.clipTitle}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Status Bar */}
        <div className="flex items-center gap-3 mb-6">
          <span
            className={`text-sm font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[claim.status] || 'bg-slate-700 text-slate-400'}`}
          >
            {STATUS_LABELS[claim.status] || claim.status}
          </span>
          <span className="text-slate-400 text-sm">
            Reclamado el {new Date(claim.createdAt).toLocaleDateString('es-ES')}
          </span>
        </div>

        {/* Video Preview */}
        <div className="bg-black rounded-xl overflow-hidden aspect-video mb-6">
          <video
            src={streamUrl}
            controls
            className="w-full h-full"
            poster={claim.clipThumbnailUrl || undefined}
          />
        </div>

        <h1 className="text-xl font-bold text-white mb-6">{claim.clipTitle}</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">${claim.earnings.toFixed(2)}</div>
            <div className="text-xs text-slate-400 mt-1">Ganancias</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1">Vistas totales</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">${claim.cpmRate.toFixed(2)}</div>
            <div className="text-xs text-slate-400 mt-1">CPM</div>
          </div>
        </div>

        {/* Per-Platform Status Indicators (when submissions exist) */}
        {submissions.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Estado por plataforma</h2>
            <div className="space-y-3">
              {submissions.map((sub) => {
                const cfg = PLATFORM_CONFIG[sub.platform];
                const statusCfg =
                  SUBMISSION_STATUS_CONFIG[sub.status] || SUBMISSION_STATUS_CONFIG.PENDING;
                return (
                  <div
                    key={sub.platform}
                    className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{cfg.icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white">{cfg.label}</div>
                        <a
                          href={sub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300 truncate block max-w-[250px]"
                        >
                          {sub.url}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">
                          {(sub.views || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">vistas</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>{statusCfg.icon}</span>
                        <span className={`text-xs font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Views Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Desglose de vistas</span>
                <span>{totalViews.toLocaleString()} total</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-slate-700">
                {submissions.map((sub) => {
                  const pct = totalViews > 0 ? (sub.views / totalViews) * 100 : 0;
                  const colors: Record<string, string> = {
                    TIKTOK: 'bg-pink-500',
                    INSTAGRAM: 'bg-orange-500',
                    YOUTUBE: 'bg-red-500',
                  };
                  return pct > 0 ? (
                    <div
                      key={sub.platform}
                      className={`${colors[sub.platform] || 'bg-slate-500'} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${PLATFORM_CONFIG[sub.platform].label}: ${sub.views.toLocaleString()}`}
                    />
                  ) : null;
                })}
              </div>
              <div className="flex gap-4 mt-2">
                {submissions.map((sub) => (
                  <div
                    key={sub.platform}
                    className="flex items-center gap-1.5 text-xs text-slate-400"
                  >
                    <span>{PLATFORM_CONFIG[sub.platform].icon}</span>
                    <span>{(sub.views || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Multi-URL Submission Form */}
        {canSubmit && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">Enviar publicaciones</h2>
            <p className="text-slate-400 text-sm mb-4">
              Publica el clip en las plataformas y pega las URLs aquí. Mínimo 1 URL obligatoria, las
              demás son opcionales. Las vistas de todas las plataformas se suman.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {PLATFORMS.map((platform) => {
                const cfg = PLATFORM_CONFIG[platform];
                const err = validationErrors[platform];
                return (
                  <div key={platform}>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                      <span className="text-lg">{cfg.icon}</span>
                      {cfg.label}
                    </label>
                    <input
                      type="url"
                      value={urls[platform]}
                      onChange={(e) => handleUrlChange(platform, e.target.value)}
                      placeholder={cfg.placeholder}
                      className={`w-full bg-slate-900 border text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none transition-colors ${
                        err
                          ? 'border-red-500 focus:border-red-400'
                          : 'border-slate-600 focus:border-purple-500'
                      }`}
                    />
                    {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
                  </div>
                );
              })}
              <button
                type="submit"
                disabled={submitting || PLATFORMS.every((p) => !urls[p].trim())}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm w-full sm:w-auto"
              >
                {submitting ? 'Enviando...' : 'Enviar URLs'}
              </button>
            </form>
          </div>
        )}

        {/* Submitted — pending verification */}
        {claim.status === 'SUBMITTED' && submissions.length === 0 && claim.socialUrl && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-medium text-yellow-400 mb-2">Pendiente de verificación</h3>
            <a
              href={claim.socialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm break-all"
            >
              {claim.socialUrl}
            </a>
          </div>
        )}

        {/* Verified (legacy single-URL fallback) */}
        {claim.status === 'VERIFIED' && submissions.length === 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-medium text-green-400 mb-2">Verificado</h3>
            {claim.socialUrl && (
              <a
                href={claim.socialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-sm break-all"
              >
                {claim.socialUrl}
              </a>
            )}
            {claim.verifiedAt && (
              <p className="text-slate-400 text-xs mt-2">
                Verificado el {new Date(claim.verifiedAt).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-4">{success}</p>}

        {/* Timeline */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Línea de tiempo</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
              <div>
                <div className="text-sm text-white">Clip reclamado</div>
                <div className="text-xs text-slate-400">
                  {new Date(claim.createdAt).toLocaleString('es-ES')}
                </div>
              </div>
            </div>
            {claim.submittedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5" />
                <div>
                  <div className="text-sm text-white">URLs enviadas</div>
                  <div className="text-xs text-slate-400">
                    {new Date(claim.submittedAt).toLocaleString('es-ES')}
                  </div>
                  {submissions.length > 0 && (
                    <div className="flex gap-2 mt-1">
                      {submissions.map((s) => (
                        <span key={s.platform} className="text-xs text-slate-500">
                          {PLATFORM_CONFIG[s.platform].icon} {PLATFORM_CONFIG[s.platform].label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {claim.verifiedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5" />
                <div>
                  <div className="text-sm text-white">Verificado</div>
                  <div className="text-xs text-slate-400">
                    {new Date(claim.verifiedAt).toLocaleString('es-ES')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
