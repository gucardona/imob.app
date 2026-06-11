# Hero Background Mode — Design Spec

**Date:** 2026-06-11  
**Status:** Approved

## Overview

Add a toggle to the admin configuration panel that controls the hero section behavior on the public homepage. Default is image mode (current behavior). When disabled, the hero switches to a clean gradient layout optimized for search-first UX.

---

## Database

**Migration:** `internal/db/migrations/0005_hero_mode.sql`

```sql
ALTER TABLE configuracao ADD COLUMN hero_mode TEXT NOT NULL DEFAULT 'image';
ALTER TABLE configuracao ADD COLUMN hero_image_path TEXT NOT NULL DEFAULT '';
```

- `hero_mode`: `'image'` | `'clean'`. Default `'image'` preserves existing behavior for all installations.
- `hero_image_path`: relative path under `/uploads/` for a user-uploaded hero image. Empty string means use Unsplash fallback.

---

## Backend

### Struct (`internal/repo/configuracao.go`)

Add two fields to `Configuracao`:

```go
HeroMode      string
HeroImagePath string
```

Include in `SELECT`, `UPDATE`, and scan positions — same pattern as existing fields.

### API endpoints

**Existing** `PUT /api/admin/configuracao` — already handles updates; just wire the two new fields.

**New** `POST /api/admin/configuracao/hero-image`  
- Accepts `multipart/form-data` with field `hero_image`
- Max 5 MB (larger than logo limit since hero is full-bleed)
- Resizes/saves to `uploads/hero-<hash>.<ext>`, deletes previous file if any
- Updates `hero_image_path` in DB
- Returns `{ "HeroImagePath": "hero-abc123.jpg" }`

**New** `POST /api/admin/configuracao/remove-hero-image`  
- Deletes the file at `hero_image_path` from disk
- Clears `hero_image_path` in DB
- Returns `{}`

Both routes: `requireAuth` middleware.

---

## Admin UI (`frontend/src/admin/pages/Configuracao.jsx`)

New **"Hero"** section, placed between the existing color/branding section and the text content section.

### Controls

**Toggle** — "Imagem de fundo"  
- ON (default): image mode  
- OFF: gradiente limpo

**When ON:**
- Upload area (dashed border, click to open file picker)
- If `heroImagePath` set: show thumbnail + "Remover" button
- If empty: show a small preview thumbnail of the Unsplash fallback image as a hint (`HERO_DEFAULT` URL)
- Hint text: `"PNG, JPG ou WebP · máx. 5 MB"`

**When OFF:**
- Static preview swatch: small rectangle showing the white→gray gradient + brand color dot — just to confirm how it will look

### Save behavior

`hero_mode` is saved as part of the main `PUT /api/admin/configuracao` call (same as all other fields). Hero image upload/remove are separate calls (same pattern as logo).

---

## Public Frontend (`frontend/src/pages/Home.jsx`)

Hero section renders conditionally based on `cfg?.HeroMode` (default `'image'` when field absent for backwards compat).

### Mode `'image'` (unchanged)

```
┌────────────────────────────────────────────┐  75vh
│  [hero image, object-cover]                │
│  [dark gradient overlay]                   │
│                                            │
│  Headline (bottom-left, large, bold)       │
│  Subtitle                                  │
│  [CTA button]                              │
└────────────────────────────────────────────┘
        ↑ search bar overlaps (-mt-12)
```

Image priority: `cfg.HeroImagePath` (uploaded) → `cfg.HeroImageURL` (existing URL field) → `HERO_DEFAULT` (hardcoded Unsplash).

### Mode `'clean'`

```
┌────────────────────────────────────────────┐  auto height (py-32)
│  background: white → #f5f5f5 (linear)      │
│  brand glow: radial, opacity 8%, top-right │
│                                            │
│         [small brand accent line/dot]      │
│         Headline (centered, large)         │
│         Subtitle (centered, gray-500)      │
│         [CTA button, centered]             │
│                                            │
└────────────────────────────────────────────┘
   ↓ search bar below, no overlap, full width, more vertical padding
```

Details:
- Wrapper: `py-28 sm:py-36 px-8 lg:px-16` — enough breathing room
- Background: `style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f5f5f5 100%)' }}`
- Brand glow: absolute `div`, `w-96 h-96`, `bg-[var(--color-brand)]`, `opacity-[0.08]`, `rounded-full`, `blur-3xl`, top-right corner
- Small accent: `2px` horizontal rule, `w-12`, `bg-[var(--color-brand)]`, `mx-auto mb-6`
- Headline: `text-center`, `text-5xl lg:text-6xl`, `font-bold`, `tracking-tight`, `text-gray-900`
- Subtitle: `text-center`, `text-lg`, `text-gray-500`
- CTA: centered, same button style as image mode but text color inverted for light bg (brand bg, white text)
- Search bar: removed `-mt-12` overlap; rendered below hero with `mt-8` padding; full width up to `max-w-4xl mx-auto`

---

## Backwards Compatibility

- Existing installations: `hero_mode` defaults to `'image'` via SQL DEFAULT — no visible change
- `HeroImageURL` field is preserved as-is in DB and struct; still used as fallback in image mode
- The URL input in admin UI for `HeroImageURL` (existing field "URL da Imagem Hero" or similar) is moved into the new Hero section, visible only when mode = `'image'`, below the file upload area. Label: "Ou cole uma URL de imagem"

---

## Out of Scope

- Animated/video hero backgrounds
- Per-page hero overrides
- Mobile-specific hero mode
