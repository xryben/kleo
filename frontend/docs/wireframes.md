# Kleo v2 — Wireframes & Screen Specifications

**Date:** 2026-03-30
**Designer:** Designer Agent (UX/UI Designer)

---

## Design Principles

1. **Mobile-first** — Clippers use phones. Every layout starts at 375px.
2. **Premium dark** — Deep purple-black surfaces, not generic gray.
3. **Scannable** — Key metrics visible in < 2 seconds.
4. **Consistent** — Every screen uses the same design system components.
5. **Accessible** — WCAG 2.1 AA minimum. Touch targets ≥ 44px.

---

## 1. Marketplace Público

### Purpose
Where clippers browse and claim available clips to publish on their social channels.

### Layout (Mobile — 375px)

```
┌──────────────────────────────────┐
│ ☰  Cleo          🔍  👤          │  ← Sticky header, hamburger nav
├──────────────────────────────────┤
│                                  │
│  Marketplace de Clips            │  ← h1, text-2xl
│  Encuentra clips y genera $$     │  ← subtitle, text-slate-400
│                                  │
│  ┌──────────┐ ┌──────────┐       │
│  │Plataforma▼│ │Categoría▼│      │  ← Filter pills, horizontal scroll
│  └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐       │
│  │ Ordenar ▼│ │🔍 Buscar │       │  ← Sort + search
│  └──────────┘ └──────────┘       │
│                                  │
│  ┌──────────────────────────────┐│
│  │ ┌──────────────────────────┐ ││
│  │ │     📷 Thumbnail         │ ││  ← 16:9 aspect ratio
│  │ │                          │ ││
│  │ │  [$2.50 CPM] ──── 0:45  │ ││  ← Green badge top-right, duration bottom-right
│  │ └──────────────────────────┘ ││
│  │ Título del clip              ││  ← font-medium, line-clamp-1
│  │ Campaña: Marketing Digital   ││  ← text-sm, text-slate-400
│  │ 📸 Instagram · TECH          ││  ← Platform icon + category
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│  ← Repeat card pattern
│  │ ...                          ││
│  └──────────────────────────────┘│
│                                  │
│  ── Load More ──                 │  ← Infinite scroll or button
│                                  │
├──────────────────────────────────┤
│  🏠  📊  ✂️  💰                   │  ← Bottom tab bar (mobile only)
│  Home Dash Clips Earn            │
└──────────────────────────────────┘
```

### Layout (Desktop — 1280px)

```
┌─────────┬──────────────────────────────────────────────────┐
│         │  ✂️ Cleo / Marketplace         🔍    👤 Mi Cuenta │
│  SIDEBAR│─────────────────────────────────────────────────── │
│         │                                                    │
│  🏠 Home│  Marketplace de Clips                              │
│         │  Encuentra clips y genera ingresos                 │
│  📊 Dash│                                                    │
│         │  [Plataforma ▼] [Categoría ▼] [Ordenar ▼] [🔍]   │
│  ✂️ Clips│                                                    │
│         │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  💰 Earn│  │ Thumb   │  │ Thumb   │  │ Thumb   │            │
│         │  │ $2.50   │  │ $1.80   │  │ $3.20   │            │
│  📢 Camp│  │ Title   │  │ Title   │  │ Title   │            │
│         │  │ 📸 TECH │  │ ▶️ FIT  │  │ 🎵 EDU  │            │
│  ⚙️ Set │  └─────────┘  └─────────┘  └─────────┘            │
│         │                                                    │
│         │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│         │  │ ...     │  │ ...     │  │ ...     │            │
│         │  └─────────┘  └─────────┘  └─────────┘            │
└─────────┴────────────────────────────────────────────────────┘
```

### Key Interactions
- **Filter chips** — Tap to toggle, selected state = purple bg + white text
- **Clip card tap** → Navigate to clip detail page
- **CPM badge** — Always visible, green pill, high contrast
- **Infinite scroll** — Load 12 clips at a time, skeleton loader while fetching
- **Empty state** — "No hay clips para estos filtros" + clear filters button
- **Pull-to-refresh** — Mobile gesture refreshes list

### Clip Detail Page (Modal on Desktop / Full Page on Mobile)

```
┌──────────────────────────────────┐
│  ← Volver al Marketplace        │
├──────────────────────────────────┤
│                                  │
│  ┌──────────────────────────────┐│
│  │                              ││
│  │      Video Preview           ││  ← 16:9, play button overlay
│  │      (thumbnail + ▶)        ││
│  │                              ││
│  └──────────────────────────────┘│
│                                  │
│  Título del Clip                 │  ← text-xl, font-bold
│  Campaña: Marketing Digital 2026 │
│                                  │
│  ┌─────────┐ ┌─────────┐        │
│  │ $2.50   │ │ 1.2K    │        │  ← Stat cards
│  │ CPM     │ │ vistas  │        │
│  └─────────┘ └─────────┘        │
│  ┌─────────┐ ┌─────────┐        │
│  │ 📸      │ │ 0:45    │        │
│  │ Insta   │ │ duración│        │
│  └─────────┘ └─────────┘        │
│                                  │
│  ┌──────────────────────────────┐│
│  │  🟣 Reclamar este clip       ││  ← Primary CTA, full-width
│  └──────────────────────────────┘│
│                                  │
│  💡 Al reclamar, te comprometes  │  ← Info text
│  a publicarlo en 48h             │
│                                  │
└──────────────────────────────────┘
```

---

## 2. Dashboard de Ganancias del Clipper

### Purpose
Central hub where clippers see their earnings, active claims, and performance.

### Layout (Mobile — 375px)

```
┌──────────────────────────────────┐
│ ☰  Cleo          🔔  👤          │
├──────────────────────────────────┤
│                                  │
│  Mi Dashboard                    │  ← h1
│                                  │
│  ┌──────────────────────────────┐│
│  │  💰 Ganancias totales        ││
│  │  $1,247.50                   ││  ← text-3xl, text-green-400
│  │  ▲ 12.5% vs mes anterior    ││  ← trend indicator
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────┐  ┌──────────┐     │
│  │ 8        │  │ 3        │     │  ← 2-col grid
│  │ Claims   │  │ Pend.    │     │
│  │ activos  │  │ verif.   │     │
│  └──────────┘  └──────────┘     │
│                                  │
│  ┌──────────────────────────────┐│
│  │  📊 Ganancias (7 días)       ││
│  │  ┌────────────────────────┐  ││
│  │  │  ▁ ▃ ▅ ▇ ▆ █ ▄        │  ││  ← Mini bar chart
│  │  │  L M X J V S D        │  ││
│  │  └────────────────────────┘  ││
│  └──────────────────────────────┘│
│                                  │
│  ── Acciones rápidas ──          │
│  [🔍 Buscar clips] [📋 Claims]  │
│  [💰 Ganancias]                  │
│                                  │
│  ── Claims recientes ──         │
│  ┌──────────────────────────────┐│
│  │ Clip: "5 tips de React"      ││
│  │ 15 mar · $45.00    Verified ✅││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ Clip: "Receta fit"           ││
│  │ 14 mar · --       Submitted 🟡││
│  └──────────────────────────────┘│
│                                  │
├──────────────────────────────────┤
│  🏠  📊  ✂️  💰                   │
└──────────────────────────────────┘
```

### Layout (Desktop — 1280px)

```
┌─────────┬────────────────────────────────────────────────────┐
│         │  ✂️ Cleo / Clipper Dashboard                  👤    │
│  SIDEBAR│──────────────────────────────────────────────────── │
│         │                                                     │
│  🏠 Home│  Mi Dashboard                                       │
│         │                                                     │
│  📊 Dash│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│         │  │ $1,247.50│ │ 8 Claims │ │ 3 Pend.  │            │
│  ✂️ Clips│  │ Ganancias│ │ activos  │ │ verific. │            │
│         │  └──────────┘ └──────────┘ └──────────┘            │
│  💰 Earn│                                                     │
│         │  ┌─────────────────────────┐ ┌───────────────────┐  │
│  📢 Camp│  │  📊 Ganancias (30 días) │ │ Top clips        │  │
│         │  │  ▁ ▃ ▅ ▇ ▆ █ ▄ ▃ ▅ ▇   │ │ 1. React tips $45│  │
│  ⚙️ Set │  │                         │ │ 2. Fit recipe $32│  │
│         │  └─────────────────────────┘ │ 3. Finance   $28 │  │
│         │                              └───────────────────┘  │
│         │  ── Claims recientes ──                             │
│         │  ┌──────────────────────────────────────────────┐   │
│         │  │ Clip Title      │ Fecha  │ Ganancia │ Estado │   │
│         │  │ 5 tips React    │ 15 mar │ $45.00   │ ✅     │   │
│         │  │ Receta fit      │ 14 mar │ --       │ 🟡     │   │
│         │  │ Finance basics  │ 13 mar │ $28.00   │ ✅     │   │
│         │  └──────────────────────────────────────────────┘   │
└─────────┴─────────────────────────────────────────────────────┘
```

### Key Interactions
- **Earnings card** — Tap to expand to full earnings view (`/clipper/earnings`)
- **Claims card** — Tap to see all claims (`/clipper/claims`)
- **Quick action buttons** — Primary: "Buscar clips" (purple), secondary: others
- **Claim row tap** → Navigate to claim detail
- **Chart** — Swipe between 7d / 30d / all time views
- **Notification bell** — Shows count of new verifications or rejections

### Earnings Detail View

```
┌──────────────────────────────────┐
│ ← Dashboard    Mis Ganancias    │
├──────────────────────────────────┤
│                                  │
│  [Por clip] [Por campaña] [Pagos]│  ← Tab bar
│                                  │
│  Período: [Este mes ▼]          │
│                                  │
│  Total: $1,247.50               │
│                                  │
│  ┌──────────────────────────────┐│
│  │ "5 tips de React"            ││
│  │ Campaña: TechEd              ││
│  │ 12K vistas · $45.00          ││
│  │ ▓▓▓▓▓▓▓▓▓▓░░░ 78% del CPM   ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ "Receta fitness 30s"         ││
│  │ Campaña: FitLife              ││
│  │ 8.5K vistas · $32.00         ││
│  │ ▓▓▓▓▓▓▓▓░░░░░ 62% del CPM   ││
│  └──────────────────────────────┘│
│                                  │
│  ── Pagos (tab) ──              │
│  ┌──────────────────────────────┐│
│  │ Mar 2026    $890.00   ✅ Paid ││
│  │ Feb 2026    $357.50   ✅ Paid ││
│  │ Jan 2026    $0.00     ⏳ N/A  ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

---

## 3. Panel de Campaña del Infoproductor

### Purpose
Where content creators (infoproductores) manage their marketing campaigns — create, monitor budget, and track clip performance.

### Layout (Mobile — 375px)

```
┌──────────────────────────────────┐
│ ☰  Cleo          [+ Nueva]      │
├──────────────────────────────────┤
│                                  │
│  Mis Campañas                    │
│  Gestiona tus campañas           │
│                                  │
│  [Todas] [Activas] [Pausadas]    │  ← Filter tabs
│                                  │
│  ┌──────────────────────────────┐│
│  │  Marketing Digital 2026      ││
│  │  [Activa ●]                  ││  ← Green status badge
│  │                              ││
│  │  Presupuesto    Gastado      ││
│  │  $500.00        $234.50      ││
│  │  ▓▓▓▓▓▓▓░░░░░░ 47%          ││  ← Progress bar
│  │                              ││
│  │  👁 12.5K vistas · 5 clips   ││
│  │                           →  ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │  Fitness Q1                  ││
│  │  [Pausada ●]                 ││
│  │  ...                         ││
│  └──────────────────────────────┘│
│                                  │
├──────────────────────────────────┤
│  🏠  📊  ✂️  💰                   │
└──────────────────────────────────┘
```

### Campaign Detail Page

```
┌──────────────────────────────────┐
│ ← Campañas    [Editar] [Pausar] │
├──────────────────────────────────┤
│                                  │
│  Marketing Digital 2026          │  ← h1
│  [Activa ●]  Creada: 1 mar 2026 │
│                                  │
│  ┌──────────┐ ┌──────────┐      │
│  │ $500     │ │ $234.50  │      │  ← Stat cards
│  │ Budget   │ │ Gastado  │      │
│  └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐      │
│  │ 12.5K    │ │ $1.80    │      │
│  │ Vistas   │ │ CPM prom │      │
│  └──────────┘ └──────────┘      │
│                                  │
│  ▓▓▓▓▓▓▓░░░░░░ 47% presupuesto │  ← Full-width progress
│                                  │
│  ── Rendimiento (30d) ──        │
│  ┌──────────────────────────────┐│
│  │  📈 Line chart               ││  ← Views over time
│  │  Views / Spend / Claims      ││
│  └──────────────────────────────┘│
│                                  │
│  ── Clips en campaña (5) ──     │
│  ┌──────────────────────────────┐│
│  │ 📷 "5 tips React"            ││
│  │ 8.2K views · $18.50 gastado  ││
│  │ 3 clippers                   ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ 📷 "Intro a TypeScript"      ││
│  │ 4.3K views · $9.20 gastado   ││
│  │ 2 clippers                   ││
│  └──────────────────────────────┘│
│                                  │
│  [+ Añadir clips a campaña]     │
│                                  │
└──────────────────────────────────┘
```

### Create Campaign Flow

```
Step 1 — Básicos
┌──────────────────────────────────┐
│ ← Campañas    Nueva Campaña     │
├──────────────────────────────────┤
│                                  │
│  ── Paso 1 de 3 ──              │
│  ▓▓▓▓▓░░░░░░░░░░               │
│                                  │
│  Nombre de la campaña            │
│  ┌──────────────────────────────┐│
│  │ Marketing Digital 2026       ││
│  └──────────────────────────────┘│
│                                  │
│  Descripción                     │
│  ┌──────────────────────────────┐│
│  │ Campaña para promover curso  ││
│  │ de marketing digital...      ││
│  └──────────────────────────────┘│
│                                  │
│  Categoría                       │
│  [TECH ▼]                        │
│                                  │
│  [Siguiente →]                   │
└──────────────────────────────────┘

Step 2 — Presupuesto
┌──────────────────────────────────┐
│  ── Paso 2 de 3 ──              │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░               │
│                                  │
│  Presupuesto total ($)           │
│  ┌──────────────────────────────┐│
│  │ 500.00                       ││
│  └──────────────────────────────┘│
│                                  │
│  CPM Rate ($)                    │
│  ┌──────────────────────────────┐│
│  │ 2.50                         ││
│  └──────────────────────────────┘│
│                                  │
│  💡 Con $500 y $2.50 CPM puedes  │
│  alcanzar ~200K impresiones      │  ← Live calculation
│                                  │
│  Plataformas objetivo            │
│  [✓ Instagram] [✓ TikTok] [YouTube]│
│                                  │
│  [← Anterior]  [Siguiente →]    │
└──────────────────────────────────┘

Step 3 — Seleccionar clips
┌──────────────────────────────────┐
│  ── Paso 3 de 3 ──              │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓               │
│                                  │
│  Selecciona clips de tus proyectos│
│                                  │
│  [✓] "5 tips de React" (0:45)   │
│  [✓] "Intro TypeScript" (0:32)  │
│  [ ] "CSS Grid mastery" (1:05)  │
│  [✓] "React Hooks" (0:28)      │
│                                  │
│  3 clips seleccionados           │
│                                  │
│  ── Resumen ──                  │
│  Campaña: Marketing Digital 2026 │
│  Budget: $500 · CPM: $2.50      │
│  Clips: 3 · Plataformas: 2      │
│                                  │
│  [← Anterior]  [🟣 Crear campaña]│
└──────────────────────────────────┘
```

---

## 4. Shared Navigation — AppShell

### Sidebar (Desktop)

```
┌───────────────────┐
│                   │
│  ✂️ Kleo          │  ← Brand mark
│                   │
│  ─── PRINCIPAL ── │
│  🏠 Dashboard     │  ← /dashboard
│  📁 Proyectos     │  ← /projects
│  ⚙️ Configuración │  ← /settings
│                   │
│  ─── CLIPPER ──── │
│  🛒 Marketplace   │  ← /marketplace
│  📋 Mis Claims    │  ← /clipper/claims
│  💰 Ganancias     │  ← /clipper/earnings
│                   │
│  ─── PRODUCTOR ── │
│  📢 Campañas      │  ← /infoproductor/campaigns
│                   │
│  ─────────────── │
│  👤 Mi Cuenta     │
│  🚪 Cerrar sesión │
│                   │
└───────────────────┘
```

### Bottom Tab Bar (Mobile)

```
┌────────────────────────────────────┐
│  🏠       🛒       📋       💰     │
│  Home  Market  Claims   Earn      │
└────────────────────────────────────┘
```

Active tab = purple icon + text, inactive = slate-400.

---

## 5. Component Specifications

### Button Variants (implemented in `/src/components/ui/button.tsx`)

| Variant   | Use Case                          | Example                |
|-----------|-----------------------------------|------------------------|
| primary   | Main CTAs                         | "Crear campaña"        |
| secondary | Secondary actions                 | "Ver todos"            |
| ghost     | Tertiary / nav links              | "Cerrar"               |
| danger    | Destructive actions               | "Eliminar"             |
| outline   | Toggle states, filter options     | "Instagram"            |
| link      | Inline text links                 | "Ver más →"            |

### Card Sizes

| Size     | Padding | Use Case               |
|----------|---------|------------------------|
| compact  | p-4     | List items, claim rows |
| default  | p-5     | Standard content cards |
| spacious | p-6     | Stat cards, KPI blocks |

### Status Badge Colors (unified in `/src/lib/design-tokens.ts`)

All status-to-color mappings now live in `statusStyles`. No more per-page duplication.

---

## Implementation Priority

1. **Phase 1 — Foundation** (this task)
   - [x] Design tokens (`design-tokens.ts`)
   - [x] Tailwind config update
   - [x] Core UI components (Button, Card, Input, StatusBadge, EmptyState, Skeleton, StatCard)
   - [x] UX audit document

2. **Phase 2 — AppShell + Navigation** (next task)
   - [ ] `<AppShell>` layout with sidebar + mobile bottom tabs
   - [ ] `<AuthGuard>` wrapper (replace per-page checks)
   - [ ] Migrate all pages to use shared layout

3. **Phase 3 — Page Refactoring**
   - [ ] Replace inline components with design system
   - [ ] Add Radix UI for modals/toasts/tabs
   - [ ] Form validation with Zod
   - [ ] Accessibility fixes (focus rings, aria-labels, skip link)

4. **Phase 4 — New Screens**
   - [ ] Onboarding flow
   - [ ] Enhanced earnings charts
   - [ ] Campaign creation wizard (3-step)
