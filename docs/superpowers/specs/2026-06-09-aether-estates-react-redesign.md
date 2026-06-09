# Aether Estates — React Frontend Redesign

**Date:** 2026-06-09  
**Status:** Approved for implementation

---

## Overview

Full replacement of the existing React SPA UI with a faithful adaptation of the Superdesign reference (draft `8738fdb6`). The backend Go API is unchanged except for one new field on `Configuracao`. Portuguese text throughout public portal.

---

## Design Reference

Superdesign draft: `8738fdb6-5e9e-443a-afe9-005c7957be2b`  
Key tokens: `--crimson: #8B1538` · `--charcoal: #1A1A1A` · font: General Sans (Fontshare)  
Icon system: `iconify-icon` web component via CDN (`lucide:*` icons)

---

## Backend Change (minimal)

Add `HeroImageURL string` to `repo.Configuracao` and the admin form.

- DB: add `hero_image_url TEXT NOT NULL DEFAULT ''` column via migration
- API: field appears automatically in `/api/configuracao` JSON response
- Admin form: one new optional text input "URL da Imagem Hero"
- React: if `cfg.HeroImageURL` is set, use it; else fall back to the Unsplash luxury house photo from the reference design

---

## Frontend Components

### `index.html`
- Remove Inter/Google Fonts
- Add Fontshare General Sans
- Add `iconify-icon` CDN script

### `index.css`
```css
:root {
  --crimson: #8B1538;
  --charcoal: #1A1A1A;
  --gray-light: #F5F5F5;
}
.custom-shadow { box-shadow: 0 4px 30px rgba(0,0,0,0.03); }
.hero-gradient { background: linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%); }
.property-card:hover .property-img { transform: scale(1.05); }
```

### `Header.jsx`
- Fixed `h-20` white nav, `border-b border-gray-100`, `z-50`
- Left: crimson square icon + `cfg.NomeImobiliaria` uppercase bold
- Middle: "Comprar" → `/imoveis?finalidade=venda` · "Alugar" → `/imoveis?finalidade=aluguel` (hidden on mobile)
- Right: search icon (decorative) · divider · WhatsApp CTA button (if `cfg.Whatsapp`), else phone number

### `Card.jsx`
- Wrapper: `group cursor-pointer` — `<Link>` to `/imoveis/:slug`
- Image: `aspect-[4/3] overflow-hidden rounded-2xl`, `property-img` class for hover scale, `duration-700`
- Overlays: heart button top-right (`bg-white/90 backdrop-blur-sm rounded-full`) · "Disponível" badge bottom-left (`bg-[#8B1538]`)
- Info below image: title (left, `font-bold tracking-tight`) + price (right, crimson) · location subtitle · stats row (iconify `lucide:bed`, `lucide:bath`, `lucide:maximize`)

### `Footer.jsx`
- `bg-[#1A1A1A]`, 4-col grid
- Col 1 (span 1): logo mark + brand name + description + 3 social icon circles (Instagram/Twitter/LinkedIn — decorative `href="#"`)
- Col 2: "A Empresa" links — Sobre Nós · Corretores · Imprensa · Carreiras
- Col 3: "Serviços" links — Avaliação · Gestão de Imóveis · Assessoria Jurídica · Investimentos
- Col 4: "Newsletter" — label + email input + crimson submit arrow button
- Bottom bar: copyright with `cfg.NomeImobiliaria` + Privacidade · Termos · Cookies

---

## Pages

### `Home.jsx`

1. `<Header>`
2. **Hero** — `h-[75vh]` full-width image (`cfg.HeroImageURL` or Unsplash default), `hero-gradient` overlay, bottom-left: "The Signature Collection" badge (PT: "Coleção Exclusiva") + headline ("Espaços extraordinários para uma vida bem vivida.")
3. **Search bar** — `max-w-6xl mx-auto -mt-12 relative z-10`, white card `custom-shadow rounded-2xl`, 3 cols divided:
   - "Localização" → text input → `cidade`
   - "Tipo de Imóvel" → select → `tipo` (Casa/Apartamento/Terreno/Comercial/Rural)
   - "Finalidade" → select → `finalidade` (Venda/Aluguel)
   - Crimson "Ver Imóveis" button with `lucide:sliders-horizontal` → navigates to `/imoveis` with params
4. **Property showcase** — `py-32`, heading "Imóveis Selecionados" + description, "Adicionados Recentemente" pill button (decorative) + "Ver Todos" link → `/imoveis`, 3-col grid of `destaque=true` cards from API, skeleton loading state
5. **CTA block** — `bg-[#8B1538] rounded-3xl p-16`, decorative white/5 circles, headline "Sua jornada para o lar perfeito começa com uma conversa.", two buttons: WhatsApp CTA (white bg, crimson text) + "Ver Todos os Imóveis" (white border)
6. `<Footer>`

### `List.jsx`

- `<Header>`
- Compact filter row (sticky `top-20`): pill buttons for Finalidade + Tipo (reuse `FilterPills`)  
- Page heading "Imóveis Disponíveis" + count + city search form
- 3-col grid of all properties matching filters, skeleton states, empty state
- `<Footer>`

### `Detail.jsx`

- `<Header>`
- Full-width gallery (dark bg, main image + thumbnail strip)
- Breadcrumb
- 2/3 + 1/3 grid: left = badges + title + location + stat boxes + description; right = sticky contact card (price in crimson, WhatsApp btn in crimson, phone border btn)
- `<Footer>`

---

## Adaptations from Reference

| Reference | This app |
|---|---|
| "Aether Estates" | `cfg.NomeImobiliaria` |
| User avatar "Alexander Ross" | WhatsApp CTA button |
| Buy / Rent / Sell / Concierge | Comprar / Alugar |
| Price Range search col | Finalidade (Venda/Aluguel) |
| Static Unsplash property photos | `imovel.ThumbURL` from API |
| Static hero photo | `cfg.HeroImageURL` ∥ Unsplash default |
| Footer static links | Decorative (no CMS backing) |
| English text | Portuguese throughout |
| `class=` in HTML | `className=` in JSX |

---

## Out of Scope

- List/Detail page pixel-perfect redesign (reference only shows Home) — follow same design language
- Social media links backed by real URLs (decorative for now)
- "Recently Added" sort order API parameter
- Price range filter (no API support)
