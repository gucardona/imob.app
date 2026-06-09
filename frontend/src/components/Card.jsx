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
