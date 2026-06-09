# Airbnb/Zillow UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current generic teal-gradient public frontend with a property-first, Airbnb/Zillow-inspired design driven by the admin's `CorPrimaria` brand color.

**Architecture:** React SPA only — no Go backend changes. CSS custom properties (`--color-brand`, `--color-brand-dark`) are set on `<html>` from `cfg.CorPrimaria` at app load; all brand-colored elements use `style={{ color/background: 'var(--color-brand)' }}`. Tailwind handles layout/spacing/grays.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, React Router v6. No new npm deps.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `frontend/src/utils.js` | Modify | Add `darkenHex`, `setTheme` |
| `frontend/src/App.jsx` | Modify | Call `setTheme(cfg)` after fetch |
| `frontend/src/components/FilterPills.jsx` | **Create** | Shared horizontal pill filters |
| `frontend/src/components/Card.jsx` | Rewrite | 4:3 photo, overlay price, brand badges |
| `frontend/src/components/Header.jsx` | Rewrite | White sticky, logo left, nav center, WA right |
| `frontend/src/components/Footer.jsx` | Minor | Remove teal, keep dark gray |
| `frontend/src/pages/Home.jsx` | Rewrite | Thin hero + FilterPills + card grid |
| `frontend/src/pages/List.jsx` | Rewrite | No sidebar, FilterPills + grid |
| `frontend/src/pages/Detail.jsx` | Rewrite | Full-width gallery, 2-col layout |

---

## Task 1: Add `darkenHex` and `setTheme` to utils.js

**Files:**
- Modify: `frontend/src/utils.js`

- [ ] **Step 1: Add utilities**

Replace entire `frontend/src/utils.js` with:

```js
export function formatPrice(preco, finalidade) {
  const formatted = Number(preco).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return finalidade === 'aluguel' ? `R$ ${formatted}/mês` : `R$ ${formatted}`
}

export function photoURL(path) {
  if (!path) return null
  return `/uploads/${path}`
}

export function darkenHex(hex, pct) {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  l = Math.max(0, l - pct / 100)
  let r2, g2, b2
  if (s === 0) {
    r2 = g2 = b2 = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r2 = hue2rgb(p, q, h + 1 / 3)
    g2 = hue2rgb(p, q, h)
    b2 = hue2rgb(p, q, h - 1 / 3)
  }
  return '#' + [r2, g2, b2].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

export function setTheme(cfg) {
  const brand = cfg?.CorPrimaria || '#FF5A5F'
  document.documentElement.style.setProperty('--color-brand', brand)
  document.documentElement.style.setProperty('--color-brand-dark', darkenHex(brand, 12))
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in` line, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils.js
git commit -m "feat: add darkenHex and setTheme color utilities"
```

---

## Task 2: Wire `setTheme` in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Update App.jsx**

Replace entire `frontend/src/App.jsx` with:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getConfiguracao } from './api'
import { setTheme } from './utils'
import Home from './pages/Home'
import List from './pages/List'
import Detail from './pages/Detail'

export default function App() {
  const [cfg, setCfg] = useState(null)

  useEffect(() => {
    getConfiguracao().then(data => {
      setCfg(data)
      setTheme(data)
    })
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home cfg={cfg} />} />
        <Route path="/imoveis" element={<List cfg={cfg} />} />
        <Route path="/imoveis/:slug" element={<Detail cfg={cfg} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <p className="text-gray-500 mb-6">Página não encontrada.</p>
        <a href="/" className="font-medium hover:underline" style={{ color: 'var(--color-brand)' }}>
          Voltar ao início
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in` line, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: apply dynamic brand color theme from admin config"
```

---

## Task 3: Create `FilterPills` component

**Files:**
- Create: `frontend/src/components/FilterPills.jsx`

- [ ] **Step 1: Create component**

Create `frontend/src/components/FilterPills.jsx`:

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
      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
        active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
      }`}
      style={active ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : {}}
    >
      {children}
    </button>
  )
}

export default function FilterPills({ filters, onChange }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-2 overflow-x-auto">
        {FINALIDADES.map(([v, l]) => (
          <Pill key={v} active={filters.finalidade === v} onClick={() => onChange('finalidade', v)}>
            {l}
          </Pill>
        ))}
        <span className="w-px h-6 bg-gray-200 self-center mx-1 flex-shrink-0" />
        {TIPOS.map(([v, l]) => (
          <Pill key={v} active={filters.tipo === v} onClick={() => onChange('tipo', v)}>
            {l}
          </Pill>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in` line, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/FilterPills.jsx
git commit -m "feat: FilterPills — shared horizontal pill filter strip"
```

---

## Task 4: Rewrite `Card` component

**Files:**
- Modify: `frontend/src/components/Card.jsx`

- [ ] **Step 1: Rewrite Card**

Replace entire `frontend/src/components/Card.jsx`:

```jsx
import { Link } from 'react-router-dom'
import { formatPrice } from '../utils'

export default function Card({ imovel }) {
  const price = formatPrice(imovel.Preco, imovel.Finalidade)

  return (
    <Link
      to={`/imoveis/${imovel.Slug}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
    >
      {/* Photo — 4:3 */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {imovel.ThumbURL ? (
          <img
            src={imovel.ThumbURL}
            alt={imovel.Titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center opacity-80"
            style={{ background: 'var(--color-brand)' }}
          >
            <svg className="w-16 h-16 text-white opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 22V12h6v10" />
            </svg>
          </div>
        )}

        {/* Finalidade badge — top left */}
        <div className="absolute top-3 left-3">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
            style={{ background: imovel.Finalidade === 'venda' ? 'var(--color-brand)' : '#F97316' }}
          >
            {imovel.Finalidade === 'venda' ? 'Venda' : 'Aluguel'}
          </span>
        </div>

        {/* Destaque badge — top right */}
        {imovel.Destaque && (
          <div className="absolute top-3 right-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-400 text-yellow-900">
              ★ Destaque
            </span>
          </div>
        )}

        {/* Price overlay — bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
          <p className="text-white font-bold text-lg leading-none">{price}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          {imovel.Tipo} · {imovel.Bairro}, {imovel.Cidade}
        </p>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-3 group-hover:opacity-80 transition-opacity">
          {imovel.Titulo}
        </h3>
        <div className="flex flex-wrap gap-3 text-gray-500 text-sm">
          {imovel.AreaM2 > 0 && <span>◻ {imovel.AreaM2}m²</span>}
          {imovel.Quartos > 0 && <span>🛏 {imovel.Quartos}</span>}
          {imovel.Banheiros > 0 && <span>🚿 {imovel.Banheiros}</span>}
          {imovel.VagasGaragem > 0 && <span>🚗 {imovel.VagasGaragem}</span>}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in` line, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Card.jsx
git commit -m "feat: Card — 4:3 photo, price overlay, brand-colored badges"
```

---

## Task 5: Rewrite `Header` component

**Files:**
- Modify: `frontend/src/components/Header.jsx`

- [ ] **Step 1: Rewrite Header**

Replace entire `frontend/src/components/Header.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function Header({ cfg }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const nome = cfg?.NomeImobiliaria || 'Imóveis'
  const wa = cfg?.Whatsapp
  const tel = cfg?.Telefone

  const activeStyle = { color: 'var(--color-brand)', borderColor: 'var(--color-brand)' }

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow ${
        scrolled ? 'shadow-md' : 'border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          {cfg?.LogoPath ? (
            <img src={`/uploads/${cfg.LogoPath}`} alt={nome} className="h-9 w-auto" />
          ) : (
            <span className="font-bold text-xl" style={{ color: 'var(--color-brand)' }}>
              {nome}
            </span>
          )}
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm font-medium transition-colors pb-0.5 ${
                isActive ? 'border-b-2' : 'text-gray-600 hover:text-gray-900'
              }`
            }
            style={({ isActive }) => (isActive ? activeStyle : {})}
          >
            Início
          </NavLink>
          <NavLink
            to="/imoveis"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors pb-0.5 ${
                isActive ? 'border-b-2' : 'text-gray-600 hover:text-gray-900'
              }`
            }
            style={({ isActive }) => (isActive ? activeStyle : {})}
          >
            Imóveis
          </NavLink>
        </nav>

        {/* Right: CTA */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-brand)' }}
            >
              💬 WhatsApp
            </a>
          ) : tel ? (
            <a href={`tel:${tel}`} className="hidden sm:block text-sm text-gray-600 font-medium">
              {tel}
            </a>
          ) : null}

          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-50"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 py-4 px-6 flex flex-col gap-4 bg-white">
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700">
            Início
          </Link>
          <Link to="/imoveis" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700">
            Imóveis
          </Link>
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold"
              style={{ color: 'var(--color-brand)' }}
            >
              💬 WhatsApp
            </a>
          )}
          {!wa && tel && (
            <a href={`tel:${tel}`} className="text-sm text-gray-600">
              {tel}
            </a>
          )}
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in` line, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Header.jsx
git commit -m "feat: Header — white sticky, centered nav, brand WA CTA, mobile menu"
```

---

## Task 6: Rewrite `Home` page

**Files:**
- Modify: `frontend/src/pages/Home.jsx`

- [ ] **Step 1: Rewrite Home.jsx**

Replace entire `frontend/src/pages/Home.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImoveis } from '../api'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Card from '../components/Card'
import FilterPills from '../components/FilterPills'

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div style={{ aspectRatio: '4/3' }} className="bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  )
}

export default function Home({ cfg }) {
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ finalidade: '', tipo: '' })
  const [searchCity, setSearchCity] = useState('')
  const navigate = useNavigate()

  const hasFilter = !!(filters.finalidade || filters.tipo)

  useEffect(() => {
    setLoading(true)
    const params = hasFilter ? { ...filters } : { destaque: true }
    getImoveis(params).then((data) => {
      setImoveis(data || [])
      setLoading(false)
    })
  }, [filters.finalidade, filters.tipo])

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (filters.finalidade) params.set('finalidade', filters.finalidade)
    if (filters.tipo) params.set('tipo', filters.tipo)
    if (searchCity.trim()) params.set('cidade', searchCity.trim())
    navigate(`/imoveis?${params}`)
  }

  function handleFilterChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const nome = cfg?.NomeImobiliaria || ''
  const gridTitle = hasFilter
    ? `${loading ? '…' : imoveis.length} imóvel(eis) encontrado(s)`
    : 'Imóveis em Destaque'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cfg={cfg} />

      {/* Hero */}
      <section className="bg-white pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 max-w-xl leading-tight">
            Os melhores imóveis<br />da sua região.
          </h1>
          <p className="text-gray-500 mb-8 max-w-md text-sm">
            {cfg?.TextoHome || 'Encontre o imóvel ideal para comprar ou alugar.'}
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <input
              type="text"
              placeholder="🔍  Cidade ou bairro..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="flex-1 border border-gray-200 rounded-full px-5 py-3 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-full text-sm font-semibold text-white whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-brand)' }}
            >
              Buscar
            </button>
          </form>
        </div>
      </section>

      {/* Pill filters */}
      <FilterPills filters={filters} onChange={handleFilterChange} />

      {/* Card grid */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{gridTitle}</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} />)}
          </div>
        ) : imoveis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {imoveis.map((im) => <Card key={im.ID} imovel={im} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">🏡</p>
            <p className="text-sm">Nenhum imóvel encontrado.</p>
          </div>
        )}

        {!hasFilter && imoveis.length > 0 && (
          <div className="text-center mt-10">
            <a
              href="/imoveis"
              className="inline-flex items-center gap-2 px-6 py-3 border rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }}
            >
              Ver todos os imóveis →
            </a>
          </div>
        )}
      </section>

      {/* Why us */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Por que escolher{nome ? ` a ${nome}` : ' a gente'}?
          </h2>
          <p className="text-gray-400 text-sm mb-10">Sua confiança é nossa maior conquista</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              ['🏆', 'Expertise', 'Mais de 10 anos de experiência no mercado imobiliário regional.'],
              ['🤝', 'Atendimento', 'Corretores dedicados para encontrar o imóvel certo para você.'],
              ['🔒', 'Segurança', 'Toda documentação verificada e processo 100% transparente.'],
            ].map(([emoji, title, desc]) => (
              <div key={title} className="p-7 rounded-2xl bg-gray-50 text-left">
                <p className="text-3xl mb-3">{emoji}</p>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer cfg={cfg} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in` line, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Home.jsx
git commit -m "feat: Home — thin hero, pill filters, property-first card grid"
```

---

## Task 7: Rewrite `List` page (remove sidebar)

**Files:**
- Modify: `frontend/src/pages/List.jsx`

- [ ] **Step 1: Rewrite List.jsx**

Replace entire `frontend/src/pages/List.jsx`:

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
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div style={{ aspectRatio: '4/3' }} className="bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
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
    getImoveis(filters).then((data) => {
      setImoveis(data || [])
      setLoading(false)
    })
  }, [searchParams.toString()])

  function handlePillChange(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  function handleCitySearch(e) {
    e.preventDefault()
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (cityInput.trim()) next.set('cidade', cityInput.trim())
      else next.delete('cidade')
      return next
    })
  }

  const count = loading ? '…' : imoveis.length

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cfg={cfg} />

      {/* Pill filter strip */}
      <FilterPills filters={filters} onChange={handlePillChange} />

      {/* City search + count */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-gray-500 text-sm font-medium">
          {count} imóvel(eis) encontrado(s)
        </p>
        <form onSubmit={handleCitySearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por cidade..."
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            className="border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-52"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-brand)' }}
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} />)}
          </div>
        ) : imoveis.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-5xl mb-4">🏚</p>
            <p className="text-sm">Nenhum imóvel encontrado com esses filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {imoveis.map((im) => <Card key={im.ID} imovel={im} />)}
          </div>
        )}
      </div>

      <Footer cfg={cfg} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in` line, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/List.jsx
git commit -m "feat: List — no sidebar, pill filters + city search, full-width grid"
```

---

## Task 8: Rewrite `Detail` page

**Files:**
- Modify: `frontend/src/pages/Detail.jsx`

- [ ] **Step 1: Rewrite Detail.jsx**

Replace entire `frontend/src/pages/Detail.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getImovel } from '../api'
import { formatPrice } from '../utils'
import Header from '../components/Header'
import Footer from '../components/Footer'

function Badge({ children, color = 'brand' }) {
  if (color === 'orange') {
    return (
      <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-100 text-orange-700">
        {children}
      </span>
    )
  }
  return (
    <span
      className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
      style={{ background: 'var(--color-brand)' }}
    >
      {children}
    </span>
  )
}

function StatBox({ value, label }) {
  return (
    <div className="bg-gray-50 rounded-xl px-5 py-4 text-center min-w-[80px]">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
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
    getImovel(slug).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header cfg={cfg} />
        <div className="animate-pulse">
          <div className="h-[500px] bg-gray-200 w-full" />
          <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🏚</p>
          <p className="text-gray-500 mb-4">Imóvel não encontrado.</p>
          <Link to="/imoveis" className="font-medium hover:underline" style={{ color: 'var(--color-brand)' }}>
            Ver todos os imóveis
          </Link>
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

  return (
    <div className="min-h-screen bg-white">
      <Header cfg={cfg} />

      {/* Full-width gallery */}
      {fotos.length > 0 && (
        <div className="bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <div className="h-[500px] overflow-hidden">
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
                      i === activePhoto ? 'ring-2 ring-offset-2 ring-offset-gray-900 opacity-100' : 'opacity-50 hover:opacity-80'
                    }`}
                    style={i === activePhoto ? { '--tw-ring-color': 'var(--color-brand)' } : {}}
                  >
                    <img
                      src={`/uploads/${f.CaminhoThumb}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600 transition-colors">Início</Link>
          <span>›</span>
          <Link to="/imoveis" className="hover:text-gray-600 transition-colors">Imóveis</Link>
          <span>›</span>
          <span className="text-gray-600 truncate max-w-[200px]">{imovel.Titulo}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main info */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-2 mb-4">
              {imovel.Finalidade === 'venda' ? (
                <Badge color="brand">Venda</Badge>
              ) : (
                <Badge color="orange">Aluguel</Badge>
              )}
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                {imovel.Tipo}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">{imovel.Titulo}</h1>
            <p className="text-gray-500 mb-8">📍 {imovel.Bairro}, {imovel.Cidade}</p>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mb-10">
              {imovel.AreaM2 > 0 && <StatBox value={`${imovel.AreaM2}m²`} label="Área" />}
              {imovel.Quartos > 0 && <StatBox value={imovel.Quartos} label="Quartos" />}
              {imovel.Banheiros > 0 && <StatBox value={imovel.Banheiros} label="Banheiros" />}
              {imovel.VagasGaragem > 0 && <StatBox value={imovel.VagasGaragem} label="Vagas" />}
            </div>

            {imovel.Descricao && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">Sobre o imóvel</h2>
                <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">{imovel.Descricao}</p>
              </div>
            )}
          </div>

          {/* Contact card */}
          <div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 sticky top-24">
              <p className="text-3xl font-bold text-gray-900 mb-1">{price}</p>
              {pricePerM2 && (
                <p className="text-sm text-gray-400 mb-6">{pricePerM2}</p>
              )}
              {!pricePerM2 && <div className="mb-6" />}

              <div className="space-y-3 mb-6">
                {wa && (
                  <a
                    href={`https://wa.me/${wa}?text=${waText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-semibold transition-colors text-sm"
                  >
                    💬 Chamar no WhatsApp
                  </a>
                )}
                {tel && (
                  <a
                    href={`tel:${tel}`}
                    className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-700 hover:bg-gray-50 py-3.5 rounded-xl font-medium transition-colors text-sm"
                  >
                    📞 {tel}
                  </a>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">Atendimento seg–sáb das 9h às 18h</p>
            </div>
          </div>
        </div>
      </div>

      <Footer cfg={cfg} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in` line, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Detail.jsx
git commit -m "feat: Detail — full-width gallery, 2-col layout, sticky contact card"
```

---

## Task 9: Final build and deploy

**Files:** None modified — just build + service restart.

- [ ] **Step 1: Full build**

```bash
cd /home/gustavo/gupa.dev/imob.app && go build -o imob-app ./cmd/imob-app 2>&1
```
Expected: no output (success).

- [ ] **Step 2: Restart service** *(run from real terminal, not Claude Code)*

```bash
sudo systemctl restart imob && sudo systemctl status imob --no-pager
```
Expected: `Active: active (running)`.

- [ ] **Step 3: Verify in browser**

Navigate to the app URL. Check:
- Homepage: white hero, pill filters, card grid loads
- Brand color applied (coral by default, or whatever `CorPrimaria` is set to in admin)
- Cards: 4:3 photo, price overlay, badges
- List page: horizontal pills, no sidebar
- Detail page: full-width gallery, 2-col layout, sticky contact card

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Airbnb/Zillow UI redesign — property-first, brand-color-driven public site"
```
