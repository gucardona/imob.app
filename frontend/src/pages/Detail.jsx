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
