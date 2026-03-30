# Kleo v2 — UX Audit Report

**Date:** 2026-03-30
**Auditor:** Designer Agent (UX/UI Designer)
**Scope:** Full frontend at `/home/ubuntu/cleo/frontend/`

---

## Executive Summary

Kleo's frontend has a solid foundation — dark theme, consistent color palette, and clear user flows. However, it lacks a component library entirely (all `src/components/` directories are empty), leading to significant code duplication, styling inconsistencies, and accessibility gaps. To reach premium quality, we need a design system, shared components, and targeted UX fixes.

---

## 1. Usability Issues

### 1.1 No Shared Navigation Component
- Every page re-implements the header/breadcrumb bar from scratch
- Navigation links differ per page with no consistent pattern
- No mobile hamburger menu — nav links overflow on small screens
- **Recommendation:** Create `<AppShell>` layout with sidebar/nav, consistent across all views

### 1.2 Auth Guard Duplication
- Every page manually checks `localStorage.getItem('cleo_token')` in `useEffect`
- No middleware or layout-level auth — users see flash of content before redirect
- **Recommendation:** Implement Next.js middleware or a shared `<AuthGuard>` wrapper

### 1.3 No Global Error Handling
- API errors silently set empty state (`catch(() => setData(null))`)
- Users see "No se pudieron cargar los datos" with no retry option
- No toast/notification system despite Radix Toast being installed
- **Recommendation:** Add error boundaries and toast notifications for API failures

### 1.4 Polling Without User Feedback
- `/projects/[id]` polls every 4 seconds during processing
- No visual indicator that auto-refresh is happening
- If connection drops, user has no way to know
- **Recommendation:** Add subtle refresh indicator and error recovery

### 1.5 Form Validation Absent
- `/login`, `/register`, `/projects/new`, `/infoproductor/campaigns/new` — none have client-side validation
- No inline error messages or field-level feedback
- **Recommendation:** Add Zod schema validation with inline error display

---

## 2. Visual Inconsistencies

### 2.1 Button Variants (Critical)
| Location | Style | Issue |
|----------|-------|-------|
| Dashboard | `px-4 py-2 rounded-lg` | Standard |
| Projects/new submit | `py-3 rounded-xl` | Taller, rounder |
| Marketplace CPM badge | `text-xs font-bold px-2 py-1 rounded-full` | Pill variant |
| Settings Instagram | `bg-gradient-to-r from-purple-500 to-pink-500` | Gradient CTA |
| Campaigns empty state | `px-6 py-2.5 rounded-lg` | Wider padding |

**5 different button implementations** — needs a single `<Button>` component with `variant`, `size` props.

### 2.2 Card Padding
- `p-4` (marketplace clip cards)
- `p-5` (dashboard project cards)
- `p-6` (stats cards, campaign cards)
- `px-5 py-3` (inline items)

**Recommendation:** Standardize to 3 card sizes: `compact` (p-4), `default` (p-5), `spacious` (p-6).

### 2.3 Container Width
- Most pages: `max-w-5xl`
- Marketplace: `max-w-6xl`
- Admin: `max-w-6xl`

**Recommendation:** Marketplace/grid pages = `max-w-6xl`, form/detail pages = `max-w-4xl`, standard = `max-w-5xl`.

### 2.4 Status Badge Duplication
`STATUS_COLORS` is defined independently in:
- `clipper/dashboard/page.tsx` (text-only colors)
- `clipper/claims/page.tsx` (text-only colors)
- `clipper/earnings/page.tsx` (text-only colors)
- `infoproductor/campaigns/page.tsx` (bg + text badge style)
- `dashboard/page.tsx` (yet another mapping)
- `admin/page.tsx` (another mapping)

**6 separate status color maps.** Must be a single shared `<StatusBadge>` component.

### 2.5 Platform Icons Duplicated
`PLATFORM_ICONS` map (`INSTAGRAM: '📸', YOUTUBE: '▶️', TIKTOK: '🎵'`) is copy-pasted in at least 3 files.

---

## 3. Accessibility Issues

### 3.1 Critical
- **No `aria-label` on emoji-only buttons** — screen readers can't identify publish buttons in `/projects/[id]`
- **No focus ring** — only `focus:border-purple-500` used, no `focus-visible:ring` for keyboard users
- **Modals don't trap focus** — clip preview modal in `/projects/[id]` allows tab-escape
- **No skip-to-content link** anywhere

### 3.2 High
- **Missing `aria-live` regions** — status changes (processing progress, publish success) not announced
- **Error messages not linked** — form errors use plain `<div>` without `aria-describedby`
- **Emoji used as semantic content** — `<div className="text-5xl">🎬</div>` should use `role="img" aria-label="..."`

### 3.3 Medium
- **Disabled button contrast** — `opacity-50` may not meet WCAG 2.1 non-text contrast ratio
- **No `aria-current="page"`** on active nav links
- **Select dropdowns** — native `<select>` is accessible but visually inconsistent with brand

### 3.4 Unused Accessibility Dependencies
Radix UI (Dialog, Dropdown, Tabs, Toast, Progress) is installed but **never imported** in any page. These provide built-in focus trapping, keyboard navigation, and ARIA attributes out of the box.

---

## 4. Mobile Responsiveness

### 4.1 Good
- Grid layouts use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` ✓
- Filter buttons wrap with `flex flex-wrap gap-3` ✓
- Cards stack vertically on mobile ✓

### 4.2 Needs Improvement
- **No mobile navigation** — header links overflow horizontally on screens < 640px
- **Tab/filter bars** — horizontal scroll on mobile with no visual scroll affordance
- **Touch targets** — some links (breadcrumb text) are < 44px tap target
- **Earnings tables** — data-dense views need mobile-specific card layouts
- **No pull-to-refresh** on dashboard or marketplace

---

## 5. User Flow Issues

### 5.1 Marketplace → Claim Flow
- After claiming a clip, user stays on the clip detail page
- No clear "next step" guidance (publish where? when?)
- **Recommendation:** Post-claim modal with next steps and link to claims dashboard

### 5.2 Onboarding
- No onboarding flow for new users
- Dashboard shows empty state but doesn't guide role selection (clipper vs infoproductor)
- **Recommendation:** First-login wizard or role selection screen

### 5.3 Navigation Mental Model
- Three separate nav contexts: Projects/Dashboard, Marketplace/Clipper, Infoproductor/Campaigns
- No sidebar or persistent nav to show full app structure
- Users must rely on breadcrumbs and header links
- **Recommendation:** Collapsible sidebar with role-based sections

---

## Priority Matrix

| Priority | Issue | Impact |
|----------|-------|--------|
| P0 | Create shared component library | Blocks all other improvements |
| P0 | Design tokens (colors, spacing, typography) | Foundation for consistency |
| P1 | Shared `<AppShell>` with sidebar nav | Navigation clarity |
| P1 | `<Button>` component with variants | Visual consistency |
| P1 | `<StatusBadge>` shared component | Eliminate 6x duplication |
| P1 | Focus states + skip link | Accessibility baseline |
| P2 | Toast/notification system (use Radix) | Error handling UX |
| P2 | Form validation | Data integrity + UX |
| P2 | Mobile nav (hamburger menu) | Mobile usability |
| P3 | Onboarding flow | New user retention |
| P3 | Post-action guidance (modals) | Flow completeness |
