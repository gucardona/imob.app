# UI Redesign — Airbnb/Zillow-Inspired Public Site

**Date:** 2026-06-09  
**Scope:** React SPA public frontend only (`frontend/src/`). Admin (`/admin/*`) untouched.

---

## Goals

Replace the current generic teal-gradient UI with a clean, property-first design inspired by Airbnb and Zillow. Properties dominate; the search bar is secondary navigation, not the hero.

---

## Color System

Brand color driven by `cfg.CorPrimaria` from `/api/configuracao`. Default: coral `#FF5A5F`.

On app load in `App.jsx`, after `cfg` is fetched:

```js
const root = document.documentElement
root.style.setProperty('--color-brand', cfg.CorPrimaria || '#FF5A5F')
root.style.setProperty('--color-brand-dark', darkenHex(cfg.CorPrimaria || '#FF5A5F', 12))
```

`darkenHex(hex, pct)` — pure JS utility in `src/utils.js`, no library needed (convert hex → HSL, reduce L, back to hex).

Components use `style={{ color: 'var(--color-brand)' }}` or `style={{ background: 'var(--color-brand)' }}` for brand-colored elements. Tailwind handles all layout/spacing/gray-scale; only brand color goes inline.

---

## Header (`src/components/Header.jsx`)

- White background, sticky top, `box-shadow` on scroll (JS scroll listener adds class).
- **Left:** Logo image if `cfg.LogoPath`, else `cfg.NomeImobiliaria` text in brand color, bold.
- **Center:** Nav links — `Início` (`/`) and `Imóveis` (`/imoveis`). Active link underlined with brand color.
- **Right:** WhatsApp CTA button (brand color bg, white text) — `wa.me/${cfg.Whatsapp}`. If no Whatsapp configured, show phone number plain text.
- Mobile: hamburger collapses center nav; WhatsApp button stays visible.

---

## Homepage (`src/pages/Home.jsx`)

### Hero (thin — ~200px tall)

White background, left-aligned content, max-width container:

```
Os melhores imóveis     ← font-bold text-4xl md:text-5xl text-gray-900
da sua região.

[🔍  Cidade ou bairro...]  [Buscar]   ← single text input + brand-color button
```

Subtext below headline: `cfg.TextoHome` or fallback. No gradient, no full-screen background.

### Pill Filter Strip

Horizontal scrollable row immediately below hero (no gap):

```
[ Todos ] [ Venda ] [ Aluguel ] [ Casa ] [ Apartamento ] [ Terreno ] [ Comercial ] [ Rural ]
```

- Gray outline when inactive; brand color bg + white text when active.
- "Todos" = no filter. Finalidade and tipo are independent pills — both can be active simultaneously.
- Selecting a pill immediately re-fetches and re-renders the card grid below (no page navigate).
- "Buscar" button on search input navigates to `/imoveis?cidade=X`.

### Card Grid

3-col desktop / 2-col tablet / 1-col mobile. Shows all imoveis matching active pill filters (default = destaques when no filter selected on homepage, all when filter selected). Title: "Imóveis em Destaque" → "X imóveis encontrados" when filtered.

---

## Card (`src/components/Card.jsx`)

```
┌──────────────────────────────┐
│ [photo — 4:3 aspect ratio]   │
│ ┌─────┐               ★ Dest │  ← finalidade pill top-left, destaque badge top-right
│ │Venda│                      │
│                              │
│ ████████ dark gradient ████  │
│ R$ 850.000           /imovel │  ← price bold white, bottom-left overlay
└──────────────────────────────┘
  Apartamento · Bairro, Cidade   ← gray text, small
  Título do Imóvel               ← gray-900, font-semibold, 2-line clamp
  🏠 120m²  🛏 3  🚿 2  🚗 1    ← feature icons row
```

- No border. Shadow `shadow-md` → `shadow-xl` on hover.
- Photo zoom `scale-105` on hover (overflow hidden).
- No-photo state: brand-color gradient placeholder with house icon.
- Entire card is a `<Link>` to `/imoveis/${slug}`.

---

## List Page (`src/pages/List.jsx`)

- **Remove sidebar.** Replace with horizontal pill filter strip (same component as homepage, shared `FilterPills`).
- Pills: finalidade row + tipo row (or single combined row on mobile).
- Cidade: inline search input at right of pill strip.
- Result count below strip: "X imóveis encontrados".
- Card grid: 3-col desktop, 2-col tablet, 1-col mobile.
- URL reflects filters: `/imoveis?finalidade=venda&tipo=apartamento`.

---

## Detail Page (`src/pages/Detail.jsx`)

### Gallery

Full-width above the fold. Main photo: `h-[500px]` `object-cover`. Thumbnails below as horizontal strip (scrollable, clickable, active ring in brand color).

### 2-Col Layout

```
┌─────────────────────────┬──────────────────┐
│ [Venda] [Apartamento]   │  R$ 850.000      │ ← sticky contact card
│ Título do imóvel        │                  │
│ 📍 Bairro, Cidade       │  [WhatsApp btn]  │
│                         │  [Ligar btn]     │
│ [120m²] [3 qtos] [2bnh] │                  │
│ [1 vaga]                │  seg–sáb 9–18h   │
│                         │                  │
│ Sobre o imóvel          │                  │
│ Descrição...            │                  │
└─────────────────────────┴──────────────────┘
```

- Contact card: WhatsApp (green), phone (gray outline). Both link to `cfg.Whatsapp` / `cfg.Telefone`.
- WhatsApp message pre-filled: `Olá! Tenho interesse no imóvel: {Titulo} ({slug})`.

---

## Shared Components

| Component | Change |
|---|---|
| `Header.jsx` | Full rewrite |
| `Footer.jsx` | Keep minimal, replace teal bg with dark gray |
| `Card.jsx` | Full rewrite — 4:3, overlay price, pill badge |
| `FilterPills.jsx` | **New** — shared between Home and List |

---

## Utilities

`src/utils.js` additions:
- `darkenHex(hex, pct)` — darkens a hex color by `pct` lightness points (HSL).
- `setTheme(cfg)` — sets `--color-brand` and `--color-brand-dark` on `documentElement`.

---

## What Does NOT Change

- Go backend, API, admin panel.
- `src/api.js`, `src/main.jsx`.
- `App.jsx` structure (cfg fetch, routes) — only adds `setTheme(cfg)` call.
- `internal/frontend/` embed, `vite.config.js`, `deploy.sh`.

---

## Sources

- [7 Best Real Estate Website UX Design Examples](https://www.designmonks.co/blog/real-estate-website-ux-design-examples)
- [24 Best Real Estate Website Examples for 2026](https://www.propphy.com/blog/best-real-estate-website-examples-2026)
