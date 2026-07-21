import { Link } from 'react-router-dom'
import { formatPrice } from '../utils'

export default function Card({ imovel }) {
  const price = formatPrice(imovel.Preco, imovel.Finalidade)
  const label = imovel.Finalidade === 'aluguel' ? 'Aluguel' : 'Disponível'
  const area = imovel.AreaTotalM2 || imovel.AreaM2 || 0

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

        <div className="absolute bottom-4 left-4">
          <span className="px-3 py-1 bg-[var(--color-brand)] text-white text-[10px] font-bold uppercase tracking-widest rounded-sm">
            {label}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-xl font-bold tracking-tight line-clamp-1">{imovel.Titulo}</h3>
          <span className="text-[var(--color-brand)] font-bold flex-shrink-0">{price}</span>
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
          {area > 0 && (
            <div className="flex items-center gap-2 text-gray-500">
              <iconify-icon icon="lucide:maximize" className="text-lg"></iconify-icon>
              <span className="text-xs font-semibold">{area} m²</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
