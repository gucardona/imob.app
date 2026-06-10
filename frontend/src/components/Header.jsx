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
            href={`https://wa.me/${wa.replace(/\D/g, '')}`}
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
            <a href={`https://wa.me/${wa.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#8B1538]">
              Falar com Corretor
            </a>
          )}
          {!wa && tel && <a href={`tel:${tel}`} className="text-sm text-gray-600">{tel}</a>}
        </div>
      )}
    </nav>
  )
}
