import { Link } from 'react-router-dom'
import { formatPrice } from '../utils'

function IconBed() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 9V5a2 2 0 012-2h16a2 2 0 012 2v4M2 9h20M2 9v9a2 2 0 002 2h16a2 2 0 002-2V9"/>
      <path d="M6 9V7h3v2M15 9V7h3v2"/>
    </svg>
  )
}

function IconBath() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h16M4 12a2 2 0 01-2-2V7a1 1 0 011-1h2"/>
      <path d="M4 12v5a2 2 0 002 2h12a2 2 0 002-2v-5"/>
      <path d="M10 7V5"/>
    </svg>
  )
}

function IconCar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="11" width="20" height="9" rx="2"/>
      <path d="M5 11l2-5h10l2 5"/>
      <circle cx="7.5" cy="17.5" r="1.5"/>
      <circle cx="16.5" cy="17.5" r="1.5"/>
    </svg>
  )
}

function IconArea() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="1"/>
    </svg>
  )
}

export default function Card({ imovel }) {
  const price = formatPrice(imovel.Preco, imovel.Finalidade)
  const isAluguel = imovel.Finalidade === 'aluguel'

  return (
    <Link
      to={`/imoveis/${imovel.Slug}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg border border-warm-200 transition-all duration-300"
    >
      <div className="relative overflow-hidden h-52">
        {imovel.ThumbURL ? (
          <img
            src={imovel.ThumbURL}
            alt={imovel.Titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-warm-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        )}

        <div className="absolute top-3 left-3 flex gap-1.5">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-md text-white tracking-wide"
            style={{ background: isAluguel ? '#4f4236' : 'var(--color-brand)' }}
          >
            {isAluguel ? 'Aluguel' : 'Venda'}
          </span>
          {imovel.Destaque && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gold-500 text-white tracking-wide">
              Destaque
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs text-warm-400 uppercase tracking-widest mb-1.5 font-medium">
          {imovel.Tipo} · {imovel.Bairro}, {imovel.Cidade}
        </p>
        <h3 className="font-semibold text-warm-900 text-sm leading-snug line-clamp-2 mb-3 group-hover:opacity-75 transition-opacity tracking-tight">
          {imovel.Titulo}
        </h3>
        <div className="flex flex-wrap gap-4 text-warm-500 text-xs mb-4">
          {imovel.AreaM2 > 0 && (
            <span className="flex items-center gap-1.5"><IconArea /> {imovel.AreaM2} m²</span>
          )}
          {imovel.Quartos > 0 && (
            <span className="flex items-center gap-1.5"><IconBed /> {imovel.Quartos} {imovel.Quartos === 1 ? 'quarto' : 'quartos'}</span>
          )}
          {imovel.Banheiros > 0 && (
            <span className="flex items-center gap-1.5"><IconBath /> {imovel.Banheiros} {imovel.Banheiros === 1 ? 'banheiro' : 'banheiros'}</span>
          )}
          {imovel.VagasGaragem > 0 && (
            <span className="flex items-center gap-1.5"><IconCar /> {imovel.VagasGaragem} {imovel.VagasGaragem === 1 ? 'vaga' : 'vagas'}</span>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-warm-100 pt-3">
          <p className="font-bold text-lg tracking-tight" style={{ color: 'var(--color-brand)' }}>
            {price}
          </p>
          <span className="text-xs text-warm-400 font-medium group-hover:opacity-100 opacity-60 transition-opacity flex items-center gap-1">
            Ver detalhes
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}
