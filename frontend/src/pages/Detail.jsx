import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getImovel } from '../api'
import { formatPrice, getWAImovelURL, getEmailImovelURL } from '../utils'
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
    }).catch(() => {
      setData(null)
      setLoading(false)
    })
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header cfg={cfg} />
        <div className="pt-16 sm:pt-20 animate-pulse">
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
        <div className="flex-1 pt-16 sm:pt-20 flex items-center justify-center">
          <div className="text-center">
            <iconify-icon icon="lucide:building-2" className="text-6xl text-gray-200 mb-4 block mx-auto"></iconify-icon>
            <p className="text-gray-400 mb-4">Imóvel não encontrado.</p>
            <Link to="/imoveis" className="text-sm font-bold text-[var(--color-brand)] hover:underline">
              Ver todos os imóveis
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { imovel, fotos } = data
  const email = cfg?.Email
  const price = formatPrice(imovel.Preco, imovel.Finalidade)
  const pricePerM2 =
    imovel.AreaM2 > 0 && imovel.Finalidade === 'venda'
      ? `R$ ${Math.round(imovel.Preco / imovel.AreaM2).toLocaleString('pt-BR')}/m²`
      : null
  const waURL = getWAImovelURL(cfg, imovel)
  const emailURL = getEmailImovelURL(cfg?.Email, cfg, imovel)
  const isAluguel = imovel.Finalidade === 'aluguel'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header cfg={cfg} />

      <main className="flex-1 pt-16 sm:pt-20">
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
                        i === activePhoto ? 'opacity-100 ring-2 ring-[var(--color-brand)] ring-offset-2 ring-offset-[#1A1A1A]' : 'opacity-40 hover:opacity-70'
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
                  style={{ background: isAluguel ? '#555' : 'var(--color-brand)' }}
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
              <div className="bg-white rounded-2xl p-8 border border-gray-100 sticky top-20 custom-shadow">
                <p className="text-3xl font-bold tracking-tight text-[var(--color-brand)] mb-1">{price}</p>
                {pricePerM2 && <p className="text-sm text-gray-400 mb-8">{pricePerM2}</p>}
                {!pricePerM2 && <div className="mb-8" />}

                <div className="space-y-3 mb-6">
                  {waURL && (
                    <a
                      href={waURL}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-3 w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white py-4 rounded-xl font-bold transition-all active:scale-95"
                    >
                      <iconify-icon icon="lucide:message-circle" className="text-xl"></iconify-icon>
                      Chamar no WhatsApp
                    </a>
                  )}
                  {emailURL && (
                    <a
                      href={emailURL}
                      className="flex items-center justify-center gap-3 w-full border border-gray-200 text-gray-700 hover:bg-gray-50 py-4 rounded-xl font-medium transition-colors"
                    >
                      <iconify-icon icon="lucide:mail" className="text-xl"></iconify-icon>
                      Enviar E-mail
                    </a>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer cfg={cfg} />
    </div>
  )
}
