import { useState, useEffect, useCallback } from 'react'
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

function mediaType(item) {
  return item?.MediaType || item?.media_type || 'image'
}

function mediaPath(item, variant = 'grande') {
  if (!item) return ''
  if (mediaType(item) === 'video') return item.CaminhoOriginal || item.caminho_original || ''
  if (variant === 'thumb') return item.CaminhoThumb || item.caminho_thumb || ''
  return item.CaminhoGrande || item.caminho_grande || item.CaminhoOriginal || item.caminho_original || ''
}

function formatMeasure(value) {
  const n = Number(value) || 0
  return Number.isInteger(n) ? n.toString() : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export default function Detail({ cfg }) {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
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

  const fotos = data?.fotos ?? []
  const activeMedia = fotos[activePhoto]

  const prev = useCallback(() => setActivePhoto(i => (i - 1 + fotos.length) % fotos.length), [fotos.length])
  const next = useCallback(() => setActivePhoto(i => (i + 1) % fotos.length), [fotos.length])

  useEffect(() => {
    if (!lightbox) return
    function onKey(e) {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, prev, next])

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

  const { imovel } = data
  const email = cfg?.Email
  const price = formatPrice(imovel.Preco, imovel.Finalidade)
  const waURL = getWAImovelURL(cfg, imovel)
  const emailURL = getEmailImovelURL(cfg?.Email, cfg, imovel)
  const isAluguel = imovel.Finalidade === 'aluguel'
  const isTerreno = imovel.Tipo === 'terreno'
  const isApartamento = imovel.Tipo === 'apartamento'
  const areaTotal = imovel.AreaTotalM2 || imovel.AreaM2 || 0

  function scrollToGallery() {
    document.getElementById('property-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header cfg={cfg} />

      <main className="flex-1 pt-16 sm:pt-20">
        {/* GALLERY */}
        {fotos.length > 0 && (
          <div id="property-gallery" className="bg-[#1A1A1A] scroll-mt-16 sm:scroll-mt-20">
            <div className="max-w-6xl mx-auto">
              <div className="relative h-[480px] overflow-hidden group cursor-zoom-in" onClick={() => setLightbox(true)}>
                {mediaType(activeMedia) === 'video' ? (
                  <video
                    src={`/uploads/${mediaPath(activeMedia)}`}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <img
                    src={`/uploads/${mediaPath(activeMedia)}`}
                    alt={imovel.Titulo}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/40 rounded-full p-3">
                    <iconify-icon icon="lucide:expand" className="text-white text-2xl"></iconify-icon>
                  </div>
                </div>
                {fotos.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {activePhoto + 1} / {fotos.length}
                  </div>
                )}
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
                      {mediaType(f) === 'video' ? (
                        <div className="relative w-full h-full bg-black">
                          <video src={`/uploads/${mediaPath(f)}`} className="w-full h-full object-cover" muted playsInline />
                          <span className="absolute inset-0 flex items-center justify-center text-white">
                            <iconify-icon icon="lucide:play" className="text-lg"></iconify-icon>
                          </span>
                        </div>
                      ) : (
                        <img src={`/uploads/${mediaPath(f, 'thumb')}`} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIGHTBOX */}
        {lightbox && fotos.length > 0 && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightbox(false)}
          >
            <button
              onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <iconify-icon icon="lucide:x" className="text-2xl"></iconify-icon>
            </button>

            {fotos.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); prev() }}
                  className="absolute left-4 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <iconify-icon icon="lucide:chevron-left" className="text-3xl"></iconify-icon>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); next() }}
                  className="absolute right-4 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <iconify-icon icon="lucide:chevron-right" className="text-3xl"></iconify-icon>
                </button>
              </>
            )}

            {mediaType(activeMedia) === 'video' ? (
              <video
                src={`/uploads/${mediaPath(activeMedia)}`}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                playsInline
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <img
                src={`/uploads/${mediaPath(activeMedia)}`}
                alt={imovel.Titulo}
                className="max-w-full max-h-full object-contain select-none"
                onClick={e => e.stopPropagation()}
              />
            )}

            {fotos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
                {activePhoto + 1} / {fotos.length}
              </div>
            )}
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
                {areaTotal > 0 && <StatBox value={`${formatMeasure(areaTotal)} m²`} label="Área total" />}
                {!isTerreno && imovel.AreaConstruidaM2 > 0 && <StatBox value={`${formatMeasure(imovel.AreaConstruidaM2)} m²`} label="Construída" />}
                {!isTerreno && imovel.AreaUtilM2 > 0 && <StatBox value={`${formatMeasure(imovel.AreaUtilM2)} m²`} label="Área útil" />}
                {!isApartamento && imovel.FrenteM > 0 && <StatBox value={`${formatMeasure(imovel.FrenteM)} m`} label="Frente" />}
                {!isApartamento && imovel.LadoM > 0 && <StatBox value={`${formatMeasure(imovel.LadoM)} m`} label="Lado" />}
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
                <p className="text-3xl font-bold tracking-tight text-[var(--color-brand)] mb-8">{price}</p>

                <div className="space-y-3 mb-6">
                  {fotos.length > 0 && (
                    <button
                      type="button"
                      onClick={scrollToGallery}
                      className="flex items-center justify-center gap-3 w-full border border-gray-200 text-gray-700 hover:bg-gray-50 py-4 rounded-xl font-medium transition-colors"
                    >
                      <iconify-icon icon="lucide:images" className="text-xl"></iconify-icon>
                      Ver fotos e vídeos
                    </button>
                  )}
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
