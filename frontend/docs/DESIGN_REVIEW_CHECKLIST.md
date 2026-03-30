# Kleo v2 — Design Review Checklist

Use this checklist when reviewing any frontend PR for design fidelity.

## Tokens & Consistency

- [ ] Uses design system colors (`primary-*`, `surface-*`, `content-*`, `success/warning/error/info`) — no hardcoded hex values or raw `slate-*`/`purple-*`
- [ ] Uses typography scale (`text-heading-*`, `text-body`, `text-body-sm`, `text-caption`, `text-label`) — no raw `text-xs`/`text-sm`
- [ ] Spacing follows 4px grid — uses Tailwind spacing scale (e.g. `p-4`, `gap-3`, `mb-6`)
- [ ] Border radius uses tokens (`rounded-md`, `rounded-lg`, `rounded-xl`) — consistent per element type
- [ ] Shadows use design system shadows (`shadow-sm`, `shadow-glow-sm`) — no custom box-shadow
- [ ] Transitions use `duration-150` (fast) or `duration-300` (slow) — consistent across similar interactions

## Components

- [ ] Uses `Button` component with correct variant — never raw `<button>` with inline styles
- [ ] Uses `Card`/`CardInteractive` for elevated containers — no manual `bg-surface-raised border` patterns
- [ ] Uses `Input`/`Textarea`/`Select` with `label`, `error`, `hint` props — not raw `<input>`
- [ ] Uses `Badge`/`StatusBadge` for status indicators — consistent pill styling
- [ ] Uses `StatCard` for metric display — not manual card+number patterns
- [ ] Uses `EmptyState` for zero-data screens — consistent illustration + CTA pattern
- [ ] Uses `Skeleton`/`SkeletonCard`/`SkeletonGrid` for loading — not `animate-pulse` divs
- [ ] Uses `Modal` (Radix Dialog) for overlays — not custom div overlays
- [ ] Uses `Alert` for inline messages — not manual colored divs
- [ ] Uses `Table` for tabular data — with proper sorting/pagination support

## Layout

- [ ] Uses `PageShell` + `PageHeader` for page structure — consistent padding and max-width
- [ ] Uses `Topbar` with breadcrumbs for navigation context
- [ ] Uses `Sidebar` for main navigation on dashboard views
- [ ] Content area uses correct `maxWidth` prop (`form`, `default`, `wide`, `full`)

## Mobile-First

- [ ] All layouts work at 375px (iPhone SE) — no horizontal overflow
- [ ] Touch targets are minimum 44×44px on mobile
- [ ] Cards stack to single column on mobile (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- [ ] Navigation is accessible on mobile (collapsible sidebar or mobile menu)
- [ ] Forms are full-width on mobile with adequate spacing
- [ ] Tables scroll horizontally on mobile (inside `overflow-x-auto`)

## Accessibility (WCAG 2.1)

- [ ] All interactive elements have focus-visible ring (`:focus-visible` styles)
- [ ] Color contrast meets AA standard (4.5:1 for text, 3:1 for large text)
- [ ] All images have alt text; decorative icons have `aria-hidden`
- [ ] Form inputs have associated labels (via `label` prop or `aria-label`)
- [ ] Error states have `role="alert"` and `aria-invalid`
- [ ] Loading states have `aria-busy` and `aria-label`
- [ ] Modals trap focus and close on Escape

## Animations

- [ ] Entry animations use design system (`animate-fade-in`, `animate-fade-up`, `animate-scale-in`)
- [ ] Loading states use `animate-shimmer` (skeleton) or `animate-spin` (spinner)
- [ ] Respects `prefers-reduced-motion` (no jarring movement)
- [ ] Transitions are subtle — no flashy or distracting effects

## Quality Bar

- [ ] Feels like a premium SaaS product (Linear, Vercel, Stripe Dashboard level)
- [ ] No generic Bootstrap / default Tailwind appearance
- [ ] Consistent spacing, typography, and color usage across all pages
- [ ] No orphan text, misaligned elements, or inconsistent padding
- [ ] Dark theme is cohesive — no jarring white/light elements
