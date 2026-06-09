import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getImovel } from '../api'
import { formatPrice } from '../utils'
import Header from '../components/Header'
import Footer from '../components/Footer'

function StatBox({ value, label }) {
  return (
    <div className="bg-warm-50 border border-warm-100 rounded-xl px-5 py-4 text-center min-w-[80px]">
      <p className="text-xl font-bold text-warm-900 tracking-tight">{value}</p>
      <p className="text-xs text-warm-400 mt-0.5 uppercase tracking-widest">{label}</p>
    </div>
  )
}

function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
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
      <div className="min-h-screen bg-warm-50">
        <Header cfg={cfg} />
        <div className="animate-pulse">
          <div className="h-[420px] bg-warm-200 w-full" />
          <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
            <div className="h-8 bg-warm-100 rounded w-1/2" />
            <div className="h-4 bg-warm-100 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22"/>
          </svg>
          <p className="text-warm-500 mb-4 text-sm">Imóvel não encontrado.</p>
          <Link to="/imoveis" className="text-sm font-medium hover:underline" style={{ color: 'var(--color-brand)' }}>
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
  const isAluguel = imovel.Finalidade === 'aluguel'

  return (
    <div className="min-h-screen bg-warm-50">
      <Header cfg={cfg} />

      {/* Gallery */}
      {fotos.length > 0 && (
        <div className="bg-warm-900">
          <div className="max-w-6xl mx-auto">
            <div className="h-[420px] overflow-hidden">
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
                      i === activePhoto ? 'ring-2 ring-offset-2 ring-offset-warm-900 opacity-100' : 'opacity-40 hover:opacity-70'
                    }`}
                    style={i === activePhoto ? { '--tw-ring-color': 'var(--color-brand)' } : {}}
                  >
                    <img src={`/uploads/${f.CaminhoThumb}`} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-warm-400 mb-6 tracking-wide">
          <Link to="/" className="hover:text-warm-700 transition-colors">Início</Link>
          <span className="text-warm-300">/</span>
          <Link to="/imoveis" className="hover:text-warm-700 transition-colors">Imóveis</Link>
          <span className="text-warm-300">/</span>
          <span className="text-warm-600 truncate max-w-[200px]">{imovel.Titulo}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main info */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-md text-white tracking-wide"
                style={{ background: isAluguel ? '#4f4236' : 'var(--color-brand)' }}
              >
                {isAluguel ? 'Aluguel' : 'Venda'}
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-md bg-warm-100 text-warm-600 tracking-wide">
                {imovel.Tipo}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-warm-900 mb-2 tracking-tight">{imovel.Titulo}</h1>
            <p className="text-warm-400 mb-8 flex items-center gap-1.5 text-sm">
              <IconPin />
              {imovel.Bairro}, {imovel.Cidade}
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              {imovel.AreaM2 > 0 && <StatBox value={`${imovel.AreaM2} m²`} label="Área" />}
              {imovel.Quartos > 0 && <StatBox value={imovel.Quartos} label="Quartos" />}
              {imovel.Banheiros > 0 && <StatBox value={imovel.Banheiros} label="Banheiros" />}
              {imovel.VagasGaragem > 0 && <StatBox value={imovel.VagasGaragem} label="Vagas" />}
            </div>

            {imovel.Descricao && (
              <div className="bg-white rounded-xl p-6 border border-warm-100 shadow-sm">
                <h2 className="font-semibold text-warm-900 mb-3 tracking-tight">Sobre o imóvel</h2>
                <p className="text-warm-500 leading-relaxed text-sm whitespace-pre-line">{imovel.Descricao}</p>
              </div>
            )}
          </div>

          {/* Contact card */}
          <div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-warm-200 sticky top-24">
              <p className="text-3xl font-bold text-warm-900 tracking-tight">{price}</p>
              {pricePerM2 && <p className="text-xs text-warm-400 mt-1 mb-6">{pricePerM2}</p>}
              {!pricePerM2 && <div className="mb-6" />}

              <div className="space-y-3 mb-6">
                {wa && (
                  <a
                    href={`https://wa.me/${wa}?text=${waText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-lg font-semibold transition-colors text-sm tracking-wide"
                  >
                    <IconWhatsApp />
                    Chamar no WhatsApp
                  </a>
                )}
                {tel && (
                  <a
                    href={`tel:${tel}`}
                    className="flex items-center justify-center gap-2.5 w-full border border-warm-200 text-warm-700 hover:bg-warm-50 py-3.5 rounded-lg font-medium transition-colors text-sm tracking-wide"
                  >
                    <IconPhone />
                    {tel}
                  </a>
                )}
              </div>

              <p className="text-xs text-warm-400 text-center">Atendimento seg–sáb, 9h às 18h</p>
            </div>
          </div>
        </div>
      </div>

      <Footer cfg={cfg} />
    </div>
  )
}
