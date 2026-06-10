# Spec: Admin Panel React Migration

**Date:** 2026-06-10  
**Status:** Approved

---

## Overview

Migrate the admin panel from Go/Templ server-rendered pages to a React SPA. The public portal is already React; this brings the admin to the same pattern. All Templ code is deleted. The admin is lazy-loaded into the existing `frontend/` Vite app under `/admin/*` routes.

---

## Goals

- Visit `cardona.com.br/admin` → prompted to login → access all admin features
- Imoveis: list, create, edit, delete, toggle destaque, photo management
- Configuração: name, colors, contact info, social links, hero image, logo upload
- No Templ code remaining in the codebase

---

## Architecture

### Frontend

Admin lives in `frontend/src/admin/`. Lazy-loaded from `App.jsx`:

```jsx
const Admin = React.lazy(() => import('./admin/AdminRouter'))
// <Route path="/admin/*" element={<Suspense><Admin /></Suspense>} />
```

`AdminRouter.jsx` owns all `/admin/*` routes and wraps them in `AuthGuard`. Visiting `/admin` redirects to `/admin/imoveis`.

```
frontend/src/admin/
├── AdminRouter.jsx         — routes + AuthGuard wrapper
├── api.js                  — all /api/admin/* fetch calls
├── AuthContext.jsx         — auth state, login/logout, useAuth hook
├── AuthGuard.jsx           — redirects to /admin/login on 401
├── AdminLayout.jsx         — sidebar + sticky header (Aether design)
├── pages/
│   ├── Login.jsx
│   ├── ImoveisList.jsx
│   ├── ImovelForm.jsx      — new + edit (id param determines mode)
│   └── Configuracao.jsx
└── components/
    ├── StatusBadge.jsx
    └── FotosGrid.jsx       — photo upload, set-principal, delete
```

### Auth flow

1. `AuthContext` calls `GET /api/admin/me` on mount
2. `AuthGuard` shows spinner while loading, redirects to `/admin/login` if 401, renders children if authenticated
3. Login page POSTs `{email, senha}`, on success sets user in context and navigates to `/admin/imoveis`
4. Logout calls `POST /api/admin/logout`, clears context, redirects to `/admin/login`
5. Session cookie is `HttpOnly` — React never reads it directly

### Backend

All existing Go Templ routes (`GET /admin/*` page routes) are removed. `internal/templates/` directory is deleted entirely. `templ` dependency removed from `go.mod`. `templ generate` removed from Makefile.

New JSON endpoints under `/api/admin/*`, all behind `requireAuth` middleware:

**Auth**
```
POST /api/admin/login         {email, senha} → {ok: true}
POST /api/admin/logout        → {ok: true}
GET  /api/admin/me            → {email: string}
```

**Imóveis**
```
GET    /api/admin/imoveis           → []Imovel
POST   /api/admin/imoveis           JSON body → Imovel
GET    /api/admin/imoveis/{id}      → Imovel
PUT    /api/admin/imoveis/{id}      JSON body → Imovel
DELETE /api/admin/imoveis/{id}      → {ok: true}
POST   /api/admin/imoveis/{id}/destaque  → Imovel
```

**Fotos**
```
POST   /api/admin/imoveis/{id}/fotos                     multipart → []Foto
POST   /api/admin/imoveis/{id}/fotos/{fotoID}/principal  → []Foto
DELETE /api/admin/imoveis/{id}/fotos/{fotoID}            → []Foto
```

Foto endpoints return the full updated foto list so React replaces state in one step.

**Configuração**
```
GET /api/admin/configuracao    → Configuracao
PUT /api/admin/configuracao    multipart/form-data → Configuracao
```

---

## Pages

### Login
Standalone page (no AdminLayout). Centered card with logo mark, email + password fields (bottom-border style), crimson submit button. Shows error message on 401.

### ImoveisList
- 4 stat cards computed from list: Total, Disponíveis, Destaques, Vendidos/Alugados
- Table: icon placeholder, Título + Cidade·Bairro + Tipo·Finalidade, Preço, bed/bath/area, StatusBadge, destaque toggle, edit link, delete button
- Delete: calls `DELETE` endpoint, removes row from local state optimistically
- Destaque toggle: calls destaque endpoint, updates row in local state

### ImovelForm
- Used for both new (`/admin/imoveis/novo`) and edit (`/admin/imoveis/:id/editar`)
- Edit mode: fetches `GET /api/admin/imoveis/:id` on mount, pre-fills form
- Two-column card layout: left (basic info + location), right (price/area + characteristics)
- Submit: `POST /api/admin/imoveis` (new) or `PUT /api/admin/imoveis/:id` (edit) with JSON body
- `FotosGrid` section rendered only in edit mode (id exists)

### Configuracao
- Fetches `GET /api/admin/configuracao` on mount
- Two-column card layout: left (identity + texts), right (contact info)
- Logo: shows current image if set, file input for replacement
- Submit: `PUT /api/admin/configuracao` as `multipart/form-data` via `FormData`

---

## Components

**`AdminLayout`** — sidebar with logo mark, Imóveis nav item, Configurações nav item, Sair button (calls logout). Sticky top header with page title and user avatar. Active nav item highlighted with crimson border-right.

**`StatusBadge`** — maps `disponivel → crimson pill`, `vendido/alugado → amber pill`, unknown → gray pill.

**`FotosGrid`** — grid of uploaded photos. Each has set-principal button (star) and delete button. Upload input at top triggers `POST /api/admin/imoveis/:id/fotos`. All actions replace foto list from API response.

---

## Deletion scope

Remove entirely:
- `internal/templates/` (all `.templ` and `_templ.go` files)
- `internal/handlers/admin_auth.go` (form handler → replaced by JSON handlers)
- `internal/handlers/admin_imoveis.go`
- `internal/handlers/admin_fotos.go`
- `internal/handlers/admin_configuracao.go`
- All `GET /admin/*` and `POST /admin/login`, `POST /admin/logout` routes from `handlers.go`
- `templ generate` from Makefile
- `github.com/a-h/templ` from `go.mod`

New files:
- `internal/handlers/admin_api.go` — all `/api/admin/*` handlers
- `frontend/src/admin/` — full subtree above

---

## Design tokens

Same as public portal: `--crimson: #8B1538`, General Sans font, iconify-icon CDN, Aether Estates visual system.
