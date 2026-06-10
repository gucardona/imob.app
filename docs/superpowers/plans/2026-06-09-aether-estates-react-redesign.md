# Aether Estates React Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the React SPA UI with a faithful implementation of the Superdesign Aether Estates reference design (draft `8738fdb6`), adapted for a Brazilian real estate platform with dynamic data from the Go API.

**Architecture:** React + Vite SPA (unchanged) → Go JSON API (one new field). All public text in Portuguese. Company name from `cfg.NomeImobiliaria`. Hero image from `cfg.HeroImageURL` falling back to a default Unsplash photo. Icons via `iconify-icon` web component CDN. Font via Fontshare General Sans.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, iconify-icon 1.0.7, General Sans (Fontshare), Go 1.22, SQLite (via migrate.go auto-runner)

---

## File Map

**Create:**
- `internal/db/migrations/0002_hero_image_url.sql`

**Modify:**
- `internal/repo/configuracao.go` — add `HeroImageURL` field + update queries
- `internal/handlers/admin_configuracao.go` — parse `hero_image_url` form field
- `internal/templates/admin_configuracao.templ` — add URL input
- `frontend/index.html` — swap fonts, add iconify CDN
- `frontend/src/index.css` — CSS vars + custom shadow/gradient classes
- `frontend/src/components/Header.jsx` — full rewrite
- `frontend/src/components/Card.jsx` — full rewrite
- `frontend/src/components/Footer.jsx` — full rewrite
- `frontend/src/components/FilterPills.jsx` — restyle for List page
- `frontend/src/pages/Home.jsx` — full rewrite
- `frontend/src/pages/List.jsx` — full rewrite
- `frontend/src/pages/Detail.jsx` — full rewrite

---

## Task 1: DB migration + Configuracao backend

**Files:**
- Create: `internal/db/migrations/0002_hero_image_url.sql`
- Modify: `internal/repo/configuracao.go`
- Modify: `internal/handlers/admin_configuracao.go`
- Modify: `internal/templates/admin_configuracao.templ`

- [ ] **Step 1.1 — Create migration**

Create `internal/db/migrations/0002_hero_image_url.sql`:
```sql
ALTER TABLE configuracao ADD COLUMN hero_image_url TEXT NOT NULL DEFAULT '';
```

- [ ] **Step 1.2 — Update Configuracao struct and queries**

Replace `internal/repo/configuracao.go` entirely:
```go
package repo

import (
	"context"
	"database/sql"
	"errors"
)

type Configuracao struct {
	NomeImobiliaria string
	LogoPath        string
	CorPrimaria     string
	CorSecundaria   string
	Endereco        string
	Telefone        string
	Whatsapp        string
	Email           string
	InstagramURL    string
	TextoSobre      string
	TextoHome       string
	HeroImageURL    string
}

type ConfiguracaoRepo struct {
	conn *sql.DB
}

func NewConfiguracaoRepo(conn *sql.DB) ConfiguracaoRepo {
	return ConfiguracaoRepo{conn: conn}
}

func (r ConfiguracaoRepo) Get(ctx context.Context) (Configuracao, error) {
	var c Configuracao
	err := r.conn.QueryRowContext(ctx, `
		SELECT nome_imobiliaria, logo_path, cor_primaria, cor_secundaria,
		       endereco, telefone, whatsapp, email, instagram_url,
		       texto_sobre, texto_home, hero_image_url
		FROM configuracao WHERE id = 1
	`).Scan(
		&c.NomeImobiliaria, &c.LogoPath, &c.CorPrimaria, &c.CorSecundaria,
		&c.Endereco, &c.Telefone, &c.Whatsapp, &c.Email,
		&c.InstagramURL, &c.TextoSobre, &c.TextoHome, &c.HeroImageURL,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Configuracao{}, ErrNotFound
	}
	return c, err
}

func (r ConfiguracaoRepo) Update(ctx context.Context, c Configuracao) error {
	_, err := r.conn.ExecContext(ctx, `
		UPDATE configuracao SET
			nome_imobiliaria = ?, logo_path = ?, cor_primaria = ?, cor_secundaria = ?,
			endereco = ?, telefone = ?, whatsapp = ?, email = ?,
			instagram_url = ?, texto_sobre = ?, texto_home = ?, hero_image_url = ?
		WHERE id = 1
	`,
		c.NomeImobiliaria, c.LogoPath, c.CorPrimaria, c.CorSecundaria,
		c.Endereco, c.Telefone, c.Whatsapp, c.Email,
		c.InstagramURL, c.TextoSobre, c.TextoHome, c.HeroImageURL,
	)
	return err
}
```

- [ ] **Step 1.3 — Add HeroImageURL to form handler**

In `internal/handlers/admin_configuracao.go`, in the `update` function, add `HeroImageURL` to the `cfg` struct literal (after `TextoHome`):
```go
cfg := repo.Configuracao{
    NomeImobiliaria: r.FormValue("nome_imobiliaria"),
    CorPrimaria:     r.FormValue("cor_primaria"),
    CorSecundaria:   r.FormValue("cor_secundaria"),
    Endereco:        r.FormValue("endereco"),
    Telefone:        r.FormValue("telefone"),
    Whatsapp:        r.FormValue("whatsapp"),
    Email:           r.FormValue("email"),
    InstagramURL:    r.FormValue("instagram_url"),
    TextoSobre:      r.FormValue("texto_sobre"),
    TextoHome:       r.FormValue("texto_home"),
    HeroImageURL:    r.FormValue("hero_image_url"),
    LogoPath:        existing.LogoPath,
}
```

- [ ] **Step 1.4 — Add field to admin form**

In `internal/templates/admin_configuracao.templ`, add this block inside the `Textos` fieldset, before the closing `</fieldset>`:
```html
<div>
    <label class="block text-sm font-medium text-slate-700 mb-1">URL da Imagem Hero (página inicial)</label>
    <input type="url" name="hero_image_url" value={ cfg.HeroImageURL } placeholder="https://..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
    <p class="text-xs text-slate-400 mt-1">Imagem exibida no topo da página inicial. Deixe vazio para usar a imagem padrão.</p>
</div>
```

- [ ] **Step 1.5 — Regenerate templ + verify Go build**

```bash
cd /home/gustavo/gupa.dev/imob.app
$(go env GOPATH)/bin/templ generate
go build ./...
```
Expected: no errors.

- [ ] **Step 1.6 — Commit**

```bash
git add internal/db/migrations/0002_hero_image_url.sql \
        internal/repo/configuracao.go \
        internal/handlers/admin_configuracao.go \
        internal/templates/admin_configuracao.templ \
        internal/templates/admin_configuracao_templ.go
git commit -m "feat: add HeroImageURL to Configuracao"
```

---

## Task 2: Frontend foundation (index.html + index.css)

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`

- [ ] **Step 2.1 — Update index.html**

Replace `frontend/index.html` entirely:
```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Imóveis</title>
    <link rel="preconnect" href="https://api.fontshare.com" />
    <link
      href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
      rel="stylesheet"
    />
    <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" defer></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2.2 — Update index.css**

Replace `frontend/src/index.css` entirely:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --crimson: #8B1538;
  --charcoal: #1A1A1A;
  --gray-light: #F5F5F5;
  --color-brand: #8B1538;
  --color-brand-dark: #6D112B;
  --color-brand-light: rgba(139, 21, 56, 0.1);
}

* { box-sizing: border-box; }

body {
  font-family: 'General Sans', system-ui, sans-serif;
  background-color: #fff;
  color: #1A1A1A;
  -webkit-font-smoothing: antialiased;
  margin: 0;
}

.custom-shadow {
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
}

.hero-gradient {
  background: linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%);
}

.property-card:hover .property-img {
  transform: scale(1.05);
}

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #F5F5F5; }
::-webkit-scrollbar-thumb { background: #D1D1D1; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #8B1538; }
```

- [ ] **Step 2.3 — Sanity build**

```bash
cd /home/gustavo/gupa.dev/imob.app/frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in X.XXs`

---

## Task 3: Header component

**Files:**
- Modify: `frontend/src/components/Header.jsx`

- [ ] **Step 3.1 — Rewrite Header.jsx**

Replace `frontend/src/components/Header.jsx` entirely:
```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header({ cfg }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const nome = cfg?.NomeImobiliaria || 'Imóveis'
  const wa = cfg?.Whatsapp
  const tel = cfg?.Telefone

  return (
    <nav className="fixed top-0 left-0 w-full h-20 bg-white z-50 border-b border-gray-100 px-8 lg:px-16 flex items-center justify-between">
      <div className="flex items-center gap-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#8B1538] flex items-center justify-center rounded-sm">
            <iconify-icon icon="lucide:home" className="text-white text-lg"></iconify-icon>
          </div>
          <span className="text-xl font-bold tracking-tight uppercase">{nome}</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/imoveis?finalidade=venda" className="text-sm font-medium text-gray-500 hover:text-[#8B1538] transition-colors">
            Comprar
          </Link>
          <Link to="/imoveis?finalidade=aluguel" className="text-sm font-medium text-gray-500 hover:text-[#8B1538] transition-colors">
            Alugar
          </Link>
          <Link to="/imoveis" className="text-sm font-medium text-gray-500 hover:text-[#8B1538] transition-colors">
            Todos
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <Link to="/imoveis" className="p-2 text-gray-400 hover:text-[#8B1538] transition-colors">
          <iconify-icon icon="lucide:search" className="text-xl"></iconify-icon>
        </Link>
        <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
        {wa ? (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-3 group"
          >
            <span className="hidden md:block text-sm font-semibold group-hover:text-[#8B1538] transition-colors">
              Falar com Corretor
            </span>
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center text-gray-500 group-hover:border-[#8B1538] transition-colors">
              <iconify-icon icon="lucide:phone" className="text-lg"></iconify-icon>
            </div>
          </a>
        ) : tel ? (
          <a href={`tel:${tel}`} className="hidden sm:block text-sm font-semibold text-gray-600 hover:text-[#8B1538] transition-colors">
            {tel}
          </a>
        ) : null}

        <button
          className="md:hidden p-2 text-gray-400 hover:text-[#8B1538] transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
        >
          <iconify-icon icon={menuOpen ? 'lucide:x' : 'lucide:menu'} className="text-xl"></iconify-icon>
        </button>
      </div>

      {menuOpen && (
        <div className="absolute top-20 left-0 w-full bg-white border-b border-gray-100 px-8 py-6 flex flex-col gap-5 md:hidden shadow-sm">
          <Link to="/imoveis?finalidade=venda" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#8B1538]">Comprar</Link>
          <Link to="/imoveis?finalidade=aluguel" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#8B1538]">Alugar</Link>
          <Link to="/imoveis" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#8B1538]">Todos os Imóveis</Link>
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#8B1538]">
              Falar com Corretor
            </a>
          )}
          {!wa && tel && <a href={`tel:${tel}`} className="text-sm text-gray-600">{tel}</a>}
        </div>
      )}
    </nav>
  )
}
```

---

## Task 4: Card component

**Files:**
- Modify: `frontend/src/components/Card.jsx`

- [ ] **Step 4.1 — Rewrite Card.jsx**

Replace `frontend/src/components/Card.jsx` entirely:
```jsx
import { Link } from 'react-router-dom'
import { formatPrice } from '../utils'

export default function Card({ imovel }) {
  const price = formatPrice(imovel.Preco, imovel.Finalidade)
  const label = imovel.Finalidade === 'aluguel' ? 'Aluguel' : 'Disponível'

  return (
    <Link to={`/imoveis/${imovel.Slug}`} className="property-card group cursor-pointer block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-6">
        {imovel.ThumbURL ? (
          <img
            src={imovel.ThumbURL}
            alt={imovel.Titulo}
            className="property-img w-full h-full object-cover transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <iconify-icon icon="lucide:building-2" className="text-5xl text-gray-300"></iconify-icon>
          </div>
        )}

        <div className="absolute top-4 right-4">
          <button
            onClick={e => e.preventDefault()}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 hover:text-[#8B1538] transition-colors"
          >
            <iconify-icon icon="lucide:heart"></iconify-icon>
          </button>
        </div>

        <div className="absolute bottom-4 left-4">
          <span className="px-3 py-1 bg-[#8B1538] text-white text-[10px] font-bold uppercase tracking-widest rounded-sm">
            {label}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-xl font-bold tracking-tight line-clamp-1">{imovel.Titulo}</h3>
          <span className="text-[#8B1538] font-bold flex-shrink-0">{price}</span>
        </div>
        <p className="text-sm text-gray-400 font-medium">
          {imovel.Bairro}, {imovel.Cidade}
        </p>
        <div className="flex items-center gap-6 pt-2">
          {imovel.Quartos > 0 && (
            <div className="flex items-center gap-2 text-gray-500">
              <iconify-icon icon="lucide:bed" className="text-lg"></iconify-icon>
              <span className="text-xs font-semibold">{imovel.Quartos} {imovel.Quartos === 1 ? 'Quarto' : 'Quartos'}</span>
            </div>
          )}
          {imovel.Banheiros > 0 && (
            <div className="flex items-center gap-2 text-gray-500">
              <iconify-icon icon="lucide:bath" className="text-lg"></iconify-icon>
              <span className="text-xs font-semibold">{imovel.Banheiros} {imovel.Banheiros === 1 ? 'Banho' : 'Banhos'}</span>
            </div>
          )}
          {imovel.AreaM2 > 0 && (
            <div className="flex items-center gap-2 text-gray-500">
              <iconify-icon icon="lucide:maximize" className="text-lg"></iconify-icon>
              <span className="text-xs font-semibold">{imovel.AreaM2} m²</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
```

---

## Task 5: Footer component

**Files:**
- Modify: `frontend/src/components/Footer.jsx`

- [ ] **Step 5.1 — Rewrite Footer.jsx**

Replace `frontend/src/components/Footer.jsx` entirely:
```jsx
export default function Footer({ cfg }) {
  const name = cfg?.NomeImobiliaria || 'Imóveis'
  const instagramURL = cfg?.InstagramURL

  return (
    <footer className="bg-[#1A1A1A] text-white pt-24 pb-12 px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
        {/* Brand */}
        <div className="col-span-1">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-6 h-6 bg-[#8B1538] flex items-center justify-center rounded-sm">
              <iconify-icon icon="lucide:home" className="text-white text-sm"></iconify-icon>
            </div>
            <span className="text-lg font-bold tracking-tight uppercase">{name}</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            {cfg?.TextoSobre || 'Encontramos o imóvel ideal para você com rapidez, segurança e transparência.'}
          </p>
          <div className="flex gap-4">
            <a
              href={instagramURL || '#'}
              target={instagramURL ? '_blank' : undefined}
              rel="noreferrer"
              className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all"
            >
              <iconify-icon icon="lucide:instagram"></iconify-icon>
            </a>
            <a href="#" className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all">
              <iconify-icon icon="lucide:twitter"></iconify-icon>
            </a>
            <a href="#" className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all">
              <iconify-icon icon="lucide:linkedin"></iconify-icon>
            </a>
          </div>
        </div>

        {/* A Empresa */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">A Empresa</h4>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Sobre Nós</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Corretores</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Imprensa</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Carreiras</a>
        </div>

        {/* Serviços */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">Serviços</h4>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Avaliação de Imóvel</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Gestão de Imóveis</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Assessoria Jurídica</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Investimentos</a>
        </div>

        {/* Newsletter */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">Newsletter</h4>
          <p className="text-sm text-gray-400 mb-4">Receba imóveis selecionados e tendências do mercado.</p>
          <div className="relative">
            <input
              type="email"
              placeholder="Seu e-mail"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#8B1538] transition-colors text-white placeholder-gray-500"
            />
            <button className="absolute right-2 top-2 w-8 h-8 bg-[#8B1538] rounded-md flex items-center justify-center">
              <iconify-icon icon="lucide:chevron-right" className="text-white"></iconify-icon>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">
          &copy; {new Date().getFullYear()} {name}. Todos os Direitos Reservados.
        </p>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a href="#" className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Privacidade</a>
          <a href="#" className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Termos</a>
          <a href="#" className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Cookies</a>
        </div>
      </div>
    </footer>
  )
}
```

---

## Task 6: FilterPills component (for List page)

**Files:**
- Modify: `frontend/src/components/FilterPills.jsx`

- [ ] **Step 6.1 — Restyle FilterPills.jsx**

Replace `frontend/src/components/FilterPills.jsx` entirely:
```jsx
const FINALIDADES = [
  ['', 'Todos'],
  ['venda', 'Venda'],
  ['aluguel', 'Aluguel'],
]

const TIPOS = [
  ['casa', 'Casa'],
  ['apartamento', 'Apto'],
  ['terreno', 'Terreno'],
  ['comercial', 'Comercial'],
  ['rural', 'Rural'],
]

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
        active
          ? 'bg-[#8B1538] text-white'
          : 'bg-[#F5F5F5] text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

export default function FilterPills({ filters, onChange }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-20 z-40">
      <div className="max-w-7xl mx-auto px-8 lg:px-16 py-4 flex flex-wrap gap-3 overflow-x-auto">
        {FINALIDADES.map(([v, l]) => (
          <Pill key={v} active={filters.finalidade === v} onClick={() => onChange('finalidade', v)}>{l}</Pill>
        ))}
        <span className="w-px bg-gray-200 self-stretch mx-1 flex-shrink-0" />
        {TIPOS.map(([v, l]) => (
          <Pill key={v} active={filters.tipo === v} onClick={() => onChange('tipo', v)}>{l}</Pill>
        ))}
      </div>
    </div>
  )
}
```

---

## Task 7: Home page

**Files:**
- Modify: `frontend/src/pages/Home.jsx`

- [ ] **Step 7.1 — Rewrite Home.jsx**

Replace `frontend/src/pages/Home.jsx` entirely:
```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImoveis } from '../api'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Card from '../components/Card'

const HERO_DEFAULT = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop'

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] bg-gray-100 rounded-2xl mb-6" />
      <div className="space-y-3">
        <div className="h-5 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  )
}

export default function Home({ cfg }) {
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [cidade, setCidade] = useState('')
  const [tipo, setTipo] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const navigate = useNavigate()

  const heroImage = cfg?.HeroImageURL || HERO_DEFAULT
  const wa = cfg?.Whatsapp
  const tel = cfg?.Telefone
  const waText = encodeURIComponent('Olá! Gostaria de mais informações sobre os imóveis.')

  useEffect(() => {
    getImoveis({ destaque: true }).then(data => {
      setImoveis(data || [])
      setLoading(false)
    })
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (cidade.trim()) params.set('cidade', cidade.trim())
    if (tipo) params.set('tipo', tipo)
    if (finalidade) params.set('finalidade', finalidade)
    navigate(`/imoveis?${params}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header cfg={cfg} />

      <main className="flex-1 pt-20">
        {/* HERO */}
        <section className="relative h-[75vh] w-full overflow-hidden">
          <img
            src={heroImage}
            alt="Imóvel de luxo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute bottom-24 left-8 lg:left-16 max-w-2xl">
            <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] uppercase tracking-[0.2em] font-bold mb-6 border border-white/20">
              Coleção Exclusiva
            </span>
            <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[0.9] mb-4">
              Espaços extraordinários para uma vida bem vivida.
            </h1>
          </div>
        </section>

        {/* SEARCH BAR */}
        <div className="max-w-6xl mx-auto px-8 lg:px-0 relative z-10 -mt-12">
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl p-4 custom-shadow border border-gray-100 flex flex-col md:flex-row items-center gap-4"
          >
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="px-6 py-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Localização</label>
                <input
                  type="text"
                  placeholder="Cidade ou bairro"
                  value={cidade}
                  onChange={e => setCidade(e.target.value)}
                  className="w-full text-sm font-medium focus:outline-none placeholder-gray-300"
                />
              </div>
              <div className="px-6 py-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Tipo de Imóvel</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full text-sm font-medium focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="">Todos os tipos</option>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="terreno">Terreno</option>
                  <option value="comercial">Comercial</option>
                  <option value="rural">Rural</option>
                </select>
              </div>
              <div className="px-6 py-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Finalidade</label>
                <select
                  value={finalidade}
                  onChange={e => setFinalidade(e.target.value)}
                  className="w-full text-sm font-medium focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="">Venda e Aluguel</option>
                  <option value="venda">Venda</option>
                  <option value="aluguel">Aluguel</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full md:w-auto bg-[#8B1538] hover:bg-[#6D112B] text-white px-10 py-5 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <iconify-icon icon="lucide:sliders-horizontal" className="text-lg"></iconify-icon>
              Ver Imóveis
            </button>
          </form>
        </div>

        {/* PROPERTY SHOWCASE */}
        <section className="max-w-7xl mx-auto px-8 lg:px-16 py-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-4">Imóveis Selecionados</h2>
              <p className="text-gray-500 max-w-md">
                Imóveis cuidadosamente selecionados em localizações privilegiadas para você.
              </p>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-3 bg-[#F5F5F5] rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">
                Destaques
              </button>
              <a href="/imoveis" className="px-6 py-3 text-sm font-bold text-[#8B1538] hover:underline">
                Ver Todos
              </a>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {[1, 2, 3].map(i => <Skeleton key={i} />)}
            </div>
          ) : imoveis.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {imoveis.map(im => <Card key={im.ID} imovel={im} />)}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <iconify-icon icon="lucide:building-2" className="text-5xl mb-4 mx-auto block"></iconify-icon>
              <p className="text-sm mb-4">Nenhum imóvel em destaque no momento.</p>
              <a href="/imoveis" className="text-sm font-bold text-[#8B1538] hover:underline">
                Ver todos os imóveis
              </a>
            </div>
          )}
        </section>

        {/* CTA SECTION */}
        <section className="px-8 lg:px-16 pb-32">
          <div className="bg-[#8B1538] rounded-3xl p-16 flex flex-col items-center text-center overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 max-w-2xl leading-tight relative z-10">
              Sua jornada para o lar perfeito começa com uma conversa.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              {wa ? (
                <a
                  href={`https://wa.me/${wa}?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-10 py-5 bg-white text-[#8B1538] font-bold rounded-xl hover:bg-gray-100 transition-all"
                >
                  Falar com Corretor
                </a>
              ) : tel ? (
                <a
                  href={`tel:${tel}`}
                  className="px-10 py-5 bg-white text-[#8B1538] font-bold rounded-xl hover:bg-gray-100 transition-all"
                >
                  {tel}
                </a>
              ) : null}
              <a
                href="/imoveis"
                className="px-10 py-5 border border-white text-white font-bold rounded-xl hover:bg-white/10 transition-all"
              >
                Ver Todos os Imóveis
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer cfg={cfg} />
    </div>
  )
}
```

---

## Task 8: List page

**Files:**
- Modify: `frontend/src/pages/List.jsx`

- [ ] **Step 8.1 — Rewrite List.jsx**

Replace `frontend/src/pages/List.jsx` entirely:
```jsx
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getImoveis } from '../api'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Card from '../components/Card'
import FilterPills from '../components/FilterPills'

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] bg-gray-100 rounded-2xl mb-6" />
      <div className="space-y-3">
        <div className="h-5 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  )
}

export default function List({ cfg }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [cityInput, setCityInput] = useState(searchParams.get('cidade') || '')

  const filters = {
    finalidade: searchParams.get('finalidade') || '',
    tipo: searchParams.get('tipo') || '',
    cidade: searchParams.get('cidade') || '',
  }

  useEffect(() => {
    setLoading(true)
    getImoveis(filters).then(data => {
      setImoveis(data || [])
      setLoading(false)
    })
  }, [searchParams.toString()])

  function handlePillChange(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  function handleCitySearch(e) {
    e.preventDefault()
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (cityInput.trim()) next.set('cidade', cityInput.trim())
      else next.delete('cidade')
      return next
    })
  }

  const count = loading ? '…' : imoveis.length

  return (
    <div className="min-h-screen flex flex-col">
      <Header cfg={cfg} />

      <main className="flex-1 pt-20">
        <FilterPills filters={filters} onChange={handlePillChange} />

        <div className="max-w-7xl mx-auto px-8 lg:px-16 py-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Imóveis Disponíveis</h1>
            <p className="text-gray-500">{count} imóvel(eis) encontrado(s)</p>
          </div>
          <form onSubmit={handleCitySearch} className="flex gap-3">
            <input
              type="text"
              placeholder="Buscar por cidade..."
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 w-56 placeholder-gray-300"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[#8B1538] hover:bg-[#6D112B] text-white rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="max-w-7xl mx-auto px-8 lg:px-16 pb-24">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} />)}
            </div>
          ) : imoveis.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <iconify-icon icon="lucide:building-2" className="text-5xl mb-4 block mx-auto"></iconify-icon>
              <p className="text-sm mb-4">Nenhum imóvel encontrado com esses filtros.</p>
              <button
                onClick={() => setSearchParams({})}
                className="text-sm font-bold text-[#8B1538] hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {imoveis.map(im => <Card key={im.ID} imovel={im} />)}
            </div>
          )}
        </div>
      </main>

      <Footer cfg={cfg} />
    </div>
  )
}
```

---

## Task 9: Detail page

**Files:**
- Modify: `frontend/src/pages/Detail.jsx`

- [ ] **Step 9.1 — Rewrite Detail.jsx**

Replace `frontend/src/pages/Detail.jsx` entirely:
```jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getImovel } from '../api'
import { formatPrice } from '../utils'
import Header from '../components/Header'
import Footer from '../components/Footer'

function StatBox({ value, label }) {
  return (
    <div className="bg-[#F5F5F5] rounded-2xl px-5 py-4 text-center min-w-[90px]">
      <p className="text-xl font-bold tracking-tight">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">{label}</p>
    </div>
  )
}

export default function Detail({ cfg }) {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    setLoading(true)
    setActivePhoto(0)
    getImovel(slug).then(d => {
      setData(d)
      setLoading(false)
    })
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header cfg={cfg} />
        <div className="pt-20 animate-pulse">
          <div className="h-[480px] bg-gray-100 w-full" />
          <div className="max-w-6xl mx-auto px-8 lg:px-16 py-12 space-y-4">
            <div className="h-8 bg-gray-100 rounded w-1/2" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header cfg={cfg} />
        <div className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center">
            <iconify-icon icon="lucide:building-2" className="text-6xl text-gray-200 mb-4 block mx-auto"></iconify-icon>
            <p className="text-gray-400 mb-4">Imóvel não encontrado.</p>
            <Link to="/imoveis" className="text-sm font-bold text-[#8B1538] hover:underline">
              Ver todos os imóveis
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { imovel, fotos } = data
  const wa = cfg?.Whatsapp
  const tel = cfg?.Telefone
  const price = formatPrice(imovel.Preco, imovel.Finalidade)
  const pricePerM2 =
    imovel.AreaM2 > 0 && imovel.Finalidade === 'venda'
      ? `R$ ${Math.round(imovel.Preco / imovel.AreaM2).toLocaleString('pt-BR')}/m²`
      : null
  const waText = encodeURIComponent(`Olá! Tenho interesse no imóvel: ${imovel.Titulo}`)
  const isAluguel = imovel.Finalidade === 'aluguel'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header cfg={cfg} />

      <main className="flex-1 pt-20">
        {/* GALLERY */}
        {fotos.length > 0 && (
          <div className="bg-[#1A1A1A]">
            <div className="max-w-6xl mx-auto">
              <div className="h-[480px] overflow-hidden">
                <img
                  src={`/uploads/${fotos[activePhoto].CaminhoGrande}`}
                  alt={imovel.Titulo}
                  className="w-full h-full object-cover"
                />
              </div>
              {fotos.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {fotos.map((f, i) => (
                    <button
                      key={f.ID}
                      onClick={() => setActivePhoto(i)}
                      className={`flex-shrink-0 h-16 w-24 rounded-lg overflow-hidden transition-all ${
                        i === activePhoto ? 'opacity-100 ring-2 ring-[#8B1538] ring-offset-2 ring-offset-[#1A1A1A]' : 'opacity-40 hover:opacity-70'
                      }`}
                    >
                      <img src={`/uploads/${f.CaminhoThumb}`} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-8 lg:px-16 py-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-10 tracking-wide">
            <Link to="/" className="hover:text-gray-700 transition-colors">Início</Link>
            <span>/</span>
            <Link to="/imoveis" className="hover:text-gray-700 transition-colors">Imóveis</Link>
            <span>/</span>
            <span className="text-gray-600 truncate max-w-[200px]">{imovel.Titulo}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main info */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-6">
                <span
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm text-white"
                  style={{ background: isAluguel ? '#555' : '#8B1538' }}
                >
                  {isAluguel ? 'Aluguel' : 'Venda'}
                </span>
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm bg-[#F5F5F5] text-gray-500">
                  {imovel.Tipo}
                </span>
                {imovel.Destaque && (
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm bg-amber-100 text-amber-700">
                    Destaque
                  </span>
                )}
              </div>

              <h1 className="text-4xl font-bold tracking-tight mb-3">{imovel.Titulo}</h1>
              <p className="text-gray-400 mb-10 flex items-center gap-2">
                <iconify-icon icon="lucide:map-pin" className="text-lg flex-shrink-0"></iconify-icon>
                {imovel.Bairro}, {imovel.Cidade}
              </p>

              <div className="flex flex-wrap gap-3 mb-12">
                {imovel.AreaM2 > 0 && <StatBox value={`${imovel.AreaM2} m²`} label="Área" />}
                {imovel.Quartos > 0 && <StatBox value={imovel.Quartos} label="Quartos" />}
                {imovel.Banheiros > 0 && <StatBox value={imovel.Banheiros} label="Banheiros" />}
                {imovel.VagasGaragem > 0 && <StatBox value={imovel.VagasGaragem} label="Vagas" />}
              </div>

              {imovel.Descricao && (
                <div className="bg-[#F5F5F5] rounded-2xl p-8">
                  <h2 className="text-xl font-bold mb-4 tracking-tight">Sobre o imóvel</h2>
                  <p className="text-gray-500 leading-relaxed whitespace-pre-line">{imovel.Descricao}</p>
                </div>
              )}
            </div>

            {/* Contact card */}
            <div>
              <div className="bg-white rounded-2xl p-8 border border-gray-100 sticky top-24 custom-shadow">
                <p className="text-3xl font-bold tracking-tight text-[#8B1538] mb-1">{price}</p>
                {pricePerM2 && <p className="text-sm text-gray-400 mb-8">{pricePerM2}</p>}
                {!pricePerM2 && <div className="mb-8" />}

                <div className="space-y-3 mb-6">
                  {wa && (
                    <a
                      href={`https://wa.me/${wa}?text=${waText}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-3 w-full bg-[#8B1538] hover:bg-[#6D112B] text-white py-4 rounded-xl font-bold transition-all active:scale-95"
                    >
                      <iconify-icon icon="lucide:message-circle" className="text-xl"></iconify-icon>
                      Chamar no WhatsApp
                    </a>
                  )}
                  {tel && (
                    <a
                      href={`tel:${tel}`}
                      className="flex items-center justify-center gap-3 w-full border border-gray-200 text-gray-700 hover:bg-gray-50 py-4 rounded-xl font-medium transition-colors"
                    >
                      <iconify-icon icon="lucide:phone" className="text-xl"></iconify-icon>
                      {tel}
                    </a>
                  )}
                </div>

                <p className="text-xs text-gray-400 text-center">Atendimento seg–sáb, 9h às 18h</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer cfg={cfg} />
    </div>
  )
}
```

---

## Task 10: Final build + commit

- [ ] **Step 10.1 — Build frontend**

```bash
cd /home/gustavo/gupa.dev/imob.app/frontend && npm run build 2>&1
```
Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 10.2 — Build Go binary**

```bash
cd /home/gustavo/gupa.dev/imob.app && go build ./... 2>&1
```
Expected: no output (success).

- [ ] **Step 10.3 — Commit all frontend changes**

```bash
cd /home/gustavo/gupa.dev/imob.app
git add frontend/index.html \
        frontend/src/index.css \
        frontend/src/components/Header.jsx \
        frontend/src/components/Card.jsx \
        frontend/src/components/Footer.jsx \
        frontend/src/components/FilterPills.jsx \
        frontend/src/pages/Home.jsx \
        frontend/src/pages/List.jsx \
        frontend/src/pages/Detail.jsx \
        internal/frontend/dist/
git commit -m "feat: Aether Estates design — React SPA redesign"
```

- [ ] **Step 10.4 — Deploy**

```bash
cd /home/gustavo/gupa.dev/imob.app && ./deploy.sh
```
Expected: service restarts cleanly, `systemctl status imob` shows `active (running)`.
