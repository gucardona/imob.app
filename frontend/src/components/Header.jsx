import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getWAGenericURL } from '../utils'

function LogoBrand({ cfg }) {
  const nome = cfg?.NomeImobiliaria || 'Imóveis'
  const logoPath = cfg?.LogoPath

  if (logoPath) {
    return (
      <>
        <img
          src={`/uploads/${logoPath}`}
          alt={nome}
          className="h-12 w-auto max-w-[220px] object-contain flex-shrink-0"
        />
        <span className="hidden sm:block font-semibold text-sm lg:text-base leading-tight max-w-[200px] lg:max-w-xs">
          {nome}
        </span>
      </>
    )
  }

  return (
    <>
      <div className="w-8 h-8 bg-[var(--color-brand)] flex items-center justify-center rounded-sm flex-shrink-0">
        <iconify-icon icon="lucide:home" className="text-white text-lg"></iconify-icon>
      </div>
      <span className="font-semibold text-xs sm:text-sm lg:text-base leading-tight max-w-[160px] sm:max-w-[220px] lg:max-w-none">
        {nome}
      </span>
    </>
  )
}

export default function Header({ cfg }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wa = cfg?.Whatsapp
  const tel = cfg?.Telefone
  const waURL = getWAGenericURL(cfg)

  return (
    <nav className="fixed top-0 left-0 w-full h-16 sm:h-20 bg-white z-50 border-b border-gray-100 px-4 sm:px-8 lg:px-16 flex items-center justify-between">
      <div className="flex items-center gap-3 sm:gap-10 min-w-0 flex-1">
        <Link to="/" className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <LogoBrand cfg={cfg} />
        </Link>
        <div className="hidden md:flex items-center gap-8 flex-shrink-0">
          <Link to="/imoveis?finalidade=venda" className="text-sm font-medium text-gray-500 hover:text-[var(--color-brand)] transition-colors whitespace-nowrap">
            Comprar
          </Link>
          <Link to="/imoveis?finalidade=aluguel" className="text-sm font-medium text-gray-500 hover:text-[var(--color-brand)] transition-colors whitespace-nowrap">
            Alugar
          </Link>
          <Link to="/imoveis" className="text-sm font-medium text-gray-500 hover:text-[var(--color-brand)] transition-colors whitespace-nowrap">
            Todos
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-2">
        <Link to="/imoveis" className="p-2 text-gray-400 hover:text-[var(--color-brand)] transition-colors">
          <iconify-icon icon="lucide:search" className="text-xl"></iconify-icon>
        </Link>
        <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
        {waURL ? (
          <a
            href={waURL}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-2.5 group"
          >
            <span className="hidden lg:block text-sm font-semibold group-hover:text-[var(--color-brand)] transition-colors whitespace-nowrap">
              Falar com Corretor
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 group-hover:border-[var(--color-brand)] group-hover:text-[var(--color-brand)] transition-all">
              <iconify-icon icon="mdi:whatsapp" className="text-lg"></iconify-icon>
            </div>
          </a>
        ) : tel ? (
          <a href={`tel:${tel}`} className="hidden sm:block text-sm font-semibold text-gray-600 hover:text-[var(--color-brand)] transition-colors whitespace-nowrap">
            {tel}
          </a>
        ) : null}

        <button
          className="md:hidden p-2 text-gray-400 hover:text-[var(--color-brand)] transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
        >
          <iconify-icon icon={menuOpen ? 'lucide:x' : 'lucide:menu'} className="text-xl"></iconify-icon>
        </button>
      </div>

      {menuOpen && (
        <div className="absolute top-16 sm:top-20 left-0 w-full bg-white border-b border-gray-100 px-6 py-6 flex flex-col gap-5 md:hidden shadow-sm">
          <Link to="/imoveis?finalidade=venda" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[var(--color-brand)]">Comprar</Link>
          <Link to="/imoveis?finalidade=aluguel" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[var(--color-brand)]">Alugar</Link>
          <Link to="/imoveis" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[var(--color-brand)]">Todos os Imóveis</Link>
          {waURL && (
            <a href={waURL} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-[var(--color-brand)]">
              <iconify-icon icon="mdi:whatsapp" className="text-base"></iconify-icon>
              Falar com Corretor
            </a>
          )}
          {!waURL && tel && <a href={`tel:${tel}`} className="text-sm text-gray-600">{tel}</a>}
        </div>
      )}
    </nav>
  )
}
