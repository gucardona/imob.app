import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImoveis } from '../api'
import { getWAGenericURL } from '../utils'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Card from '../components/Card'

const HERO_DEFAULT = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop'

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] bg-gray-100 rounded-2xl mb-6" />
      <div className="space-y-3">
        <div className="h-5 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  )
}

export default function Home({ cfg }) {
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const navigate = useNavigate()

  const heroImage = cfg?.HeroImagePath
    ? `/uploads/${cfg.HeroImagePath}`
    : (cfg?.HeroImageURL || HERO_DEFAULT)
  const heroMode = cfg?.HeroMode || 'image'
  const tel = cfg?.Telefone
  const waURL = getWAGenericURL(cfg)
  const heroTitulo = cfg?.HeroTitulo || 'Espaços extraordinários para uma vida bem vivida.'
  const heroSubtitulo = cfg?.HeroSubtitulo || ''
  const ctaTexto = cfg?.CtaTexto || 'Ver Imóveis'
  const ctaLink = cfg?.CtaLink || '/imoveis'

  useEffect(() => {
    getImoveis({ destaque: true }).then(data => {
      setImoveis(data || [])
      setLoading(false)
    })
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (tipo) params.set('tipo', tipo)
    if (finalidade) params.set('finalidade', finalidade)
    navigate(`/imoveis?${params}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header cfg={cfg} />

      <main className="flex-1 pt-16 sm:pt-20">
        {/* HERO */}
        {heroMode === 'clean' ? (
          <section className="relative w-full pt-20 pb-24 lg:pt-28 lg:pb-32 px-8 flex flex-col items-center justify-center text-center bg-[var(--color-brand)] overflow-hidden">
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/25 pointer-events-none" />

            <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">

              {/* Headline with custom letter drop-shadow */}
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                {heroTitulo}
              </h1>

              {heroSubtitulo ? (
                <p className="text-lg lg:text-xl text-white/90 font-medium max-w-2xl mb-10 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                  {heroSubtitulo}
                </p>
              ) : (
                <p className="text-lg lg:text-xl text-white/90 font-medium max-w-2xl mb-10 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                  Navegue por nossa seleção exclusiva de propriedades selecionadas em localizações privilegiadas.
                </p>
              )}

              <a
                href={ctaLink}
                className="inline-flex items-center gap-2 bg-white text-[var(--color-brand)] font-bold text-sm sm:text-base px-10 py-4 rounded-xl hover:bg-gray-100 transition-all active:scale-95 shadow-xl shadow-black/20"
              >
                {ctaTexto}
                <iconify-icon icon="lucide:arrow-right" className="text-base"></iconify-icon>
              </a>
            </div>
          </section>
        ) : (
          <section className="relative h-[75vh] w-full overflow-hidden">
            <img
              src={heroImage}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 hero-gradient" />
            <div className="absolute bottom-20 left-8 lg:left-16 max-w-2xl">
              <h1
                className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[0.9] mb-4"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.65), 0 1px 4px rgba(0,0,0,0.5)' }}
              >
                {heroTitulo}
              </h1>
              {heroSubtitulo && (
                <p
                  className="text-lg text-white/85 font-medium mb-6 leading-snug"
                  style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}
                >
                  {heroSubtitulo}
                </p>
              )}
              <a
                href={ctaLink}
                className="inline-flex items-center gap-2 bg-white text-[var(--color-brand)] font-bold text-sm px-6 py-3 rounded-xl hover:bg-gray-100 transition-all active:scale-95"
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
              >
                {ctaTexto}
                <iconify-icon icon="lucide:arrow-right" className="text-base"></iconify-icon>
              </a>
            </div>
          </section>
        )}

        {/* SEARCH BAR */}
        <div className={`mx-auto px-8 lg:px-0 relative z-10 ${heroMode === 'clean' ? 'max-w-4xl mt-8' : 'max-w-6xl -mt-12'}`}>
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl p-4 custom-shadow border border-gray-100 flex flex-col md:flex-row items-center gap-4"
          >
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="px-6 py-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Busca</label>
                <input
                  type="text"
                  placeholder="Cidade, bairro, tipo, descrição…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  className="w-full text-sm font-medium focus:outline-none placeholder-gray-300"
                />
              </div>
              <div className="px-6 py-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Tipo de Imóvel</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full text-sm font-medium focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="">Todos os tipos</option>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="terreno">Terreno</option>
                  <option value="comercial">Comercial</option>
                  <option value="rural">Rural</option>
                </select>
              </div>
              <div className="px-6 py-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Finalidade</label>
                <select
                  value={finalidade}
                  onChange={e => setFinalidade(e.target.value)}
                  className="w-full text-sm font-medium focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="">Venda e Aluguel</option>
                  <option value="venda">Venda</option>
                  <option value="aluguel">Aluguel</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full md:w-auto bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white px-10 py-5 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <iconify-icon icon="lucide:sliders-horizontal" className="text-lg"></iconify-icon>
              Ver Imóveis
            </button>
          </form>
        </div>

        {/* PROPERTY SHOWCASE */}
        <section className="max-w-7xl mx-auto px-8 lg:px-16 py-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-4">Imóveis Selecionados</h2>
              <p className="text-gray-500 max-w-md">
                Imóveis cuidadosamente selecionados em localizações privilegiadas para você.
              </p>
            </div>
            <a href="/imoveis" className="px-6 py-3 text-sm font-bold text-[var(--color-brand)] hover:underline">
              Ver Todos
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {[1, 2, 3].map(i => <Skeleton key={i} />)}
            </div>
          ) : imoveis.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {imoveis.map(im => <Card key={im.ID} imovel={im} />)}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <iconify-icon icon="lucide:building-2" className="text-5xl mb-4 mx-auto block"></iconify-icon>
              <p className="text-sm mb-4">Nenhum imóvel em destaque no momento.</p>
              <a href="/imoveis" className="text-sm font-bold text-[var(--color-brand)] hover:underline">
                Ver todos os imóveis
              </a>
            </div>
          )}
        </section>

        {/* CTA SECTION */}
        <section className="px-8 lg:px-16 pb-32">
          <div className="bg-[var(--color-brand)] rounded-3xl p-16 flex flex-col items-center text-center overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 max-w-2xl leading-tight relative z-10">
              Sua jornada para o lar perfeito começa com uma conversa.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              {waURL ? (
                <a
                  href={waURL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-10 py-5 bg-white text-[var(--color-brand)] font-bold rounded-xl hover:bg-gray-100 transition-all"
                >
                  Falar com Corretor
                </a>
              ) : tel ? (
                <a
                  href={`tel:${tel.replace(/\D/g, '')}`}
                  className="px-10 py-5 bg-white text-[var(--color-brand)] font-bold rounded-xl hover:bg-gray-100 transition-all"
                >
                  {tel}
                </a>
              ) : null}
              <a
                href="/imoveis"
                className="px-10 py-5 border border-white text-white font-bold rounded-xl hover:bg-white/10 transition-all"
              >
                Ver Todos os Imóveis
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer cfg={cfg} />
    </div>
  )
}
