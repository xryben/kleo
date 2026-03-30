/**
 * Kleo v2 Design System — Design Tokens
 *
 * Single source of truth for all non-Tailwind visual constants.
 * Tailwind config defines the utility classes; this file defines
 * shared runtime values (status maps, platform config, layout constants).
 *
 * For color/spacing/typography tokens, see tailwind.config.ts.
 */

// ─── Layout Constants ────────────────────────────────────────────
export const layout = {
  maxWidth: {
    form: '56rem',     // max-w-4xl — forms, detail pages
    default: '64rem',  // max-w-5xl — standard pages
    wide: '72rem',     // max-w-6xl — grid pages (marketplace)
    full: '80rem',     // max-w-7xl — admin dashboards
  },
  sidebar: {
    width: '16rem',         // 256px expanded
    collapsedWidth: '4rem', // 64px collapsed
  },
} as const;

// ─── Status Colors (shared across all entities) ──────────────────
export type EntityStatus =
  // Clip statuses
  | 'DOWNLOADING' | 'TRANSCRIBING' | 'ANALYZING' | 'CUTTING' | 'READY' | 'ERROR'
  // Campaign statuses
  | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT'
  // Claim statuses
  | 'CLAIMED' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED'
  // Project statuses
  | 'PROCESSING' | 'DONE' | 'FAILED';

export const statusStyles: Record<string, { bg: string; text: string; label?: string }> = {
  // Processing pipeline
  DOWNLOADING: { bg: 'bg-info-500/15', text: 'text-info-400', label: 'Descargando' },
  TRANSCRIBING: { bg: 'bg-primary-500/15', text: 'text-primary-400', label: 'Transcribiendo' },
  ANALYZING: { bg: 'bg-warning-500/15', text: 'text-warning-400', label: 'Analizando' },
  CUTTING: { bg: 'bg-warning-500/15', text: 'text-warning-400', label: 'Cortando' },
  READY: { bg: 'bg-success-500/15', text: 'text-success-400', label: 'Listo' },
  ERROR: { bg: 'bg-error-500/15', text: 'text-error-400', label: 'Error' },

  // Campaign
  ACTIVE: { bg: 'bg-success-500/15', text: 'text-success-400', label: 'Activa' },
  PAUSED: { bg: 'bg-warning-500/15', text: 'text-warning-400', label: 'Pausada' },
  COMPLETED: { bg: 'bg-info-500/15', text: 'text-info-400', label: 'Completada' },
  DRAFT: { bg: 'bg-content-disabled/15', text: 'text-content-tertiary', label: 'Borrador' },

  // Claims
  CLAIMED: { bg: 'bg-info-500/15', text: 'text-info-400', label: 'Reclamado' },
  SUBMITTED: { bg: 'bg-warning-500/15', text: 'text-warning-400', label: 'Enviado' },
  VERIFIED: { bg: 'bg-success-500/15', text: 'text-success-400', label: 'Verificado' },
  REJECTED: { bg: 'bg-error-500/15', text: 'text-error-400', label: 'Rechazado' },

  // Project
  PROCESSING: { bg: 'bg-info-500/15', text: 'text-info-400', label: 'Procesando' },
  DONE: { bg: 'bg-success-500/15', text: 'text-success-400', label: 'Completo' },
  FAILED: { bg: 'bg-error-500/15', text: 'text-error-400', label: 'Fallido' },
};

// ─── Platform Config ─────────────────────────────────────────────
export const platforms = {
  INSTAGRAM: { icon: '📸', label: 'Instagram', color: 'text-pink-400' },
  YOUTUBE: { icon: '▶️', label: 'YouTube', color: 'text-error-400' },
  TIKTOK: { icon: '🎵', label: 'TikTok', color: 'text-accent-400' },
} as const;

// ─── Z-Index Scale ───────────────────────────────────────────────
export const zIndex = {
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;
