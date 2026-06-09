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
  const initial = nome.charAt(0).toUpperCase()
  const wa = cfg?.Whatsapp
  const tel = cfg?.Telefone

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow ${
        scrolled ? 'shadow-md' : 'border-b border-warm-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          {cfg?.LogoPath ? (
            <img src={`/uploads/${cfg.LogoPath}`} alt={nome} className="h-9 w-auto" />
          ) : (
            <>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-brand)' }}
              >
                <span className="text-white font-bold text-sm tracking-tight">{initial}</span>
              </div>
              <span className="font-bold text-warm-900 text-lg tracking-tight">{nome}</span>
            </>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm font-medium transition-colors tracking-wide pb-0.5 ${
                isActive ? 'border-b-2' : 'text-warm-500 hover:text-warm-900'
              }`
            }
            style={({ isActive }) => isActive ? { color: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : {}}
          >
            Início
          </NavLink>
          <NavLink
            to="/imoveis"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors tracking-wide pb-0.5 ${
                isActive ? 'border-b-2' : 'text-warm-500 hover:text-warm-900'
              }`
            }
            style={({ isActive }) => isActive ? { color: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : {}}
          >
            Imóveis
          </NavLink>
        </nav>

        <div className="flex items-center gap-3 flex-shrink-0">
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity tracking-wide"
              style={{ background: 'var(--color-brand)' }}
            >
              Falar com Corretor
            </a>
          ) : tel ? (
            <a href={`tel:${tel}`} className="hidden sm:block text-sm text-warm-600 font-medium">
              {tel}
            </a>
          ) : null}

          <button
            className="md:hidden p-2 rounded-lg hover:bg-warm-100"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            <svg className="w-5 h-5 text-warm-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {menuOpen && (
        <div className="md:hidden border-t border-warm-100 py-4 px-6 flex flex-col gap-4 bg-white">
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-warm-700">
            Início
          </Link>
          <Link to="/imoveis" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-warm-700">
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
              Falar com Corretor
            </a>
          )}
          {!wa && tel && (
            <a href={`tel:${tel}`} className="text-sm text-warm-600">{tel}</a>
          )}
        </div>
      )}
    </header>
  )
}
