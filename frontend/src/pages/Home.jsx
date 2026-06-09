import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImoveis } from '../api'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Card from '../components/Card'
import FilterPills from '../components/FilterPills'

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div style={{ aspectRatio: '4/3' }} className="bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  )
}

export default function Home({ cfg }) {
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ finalidade: '', tipo: '' })
  const [searchCity, setSearchCity] = useState('')
  const navigate = useNavigate()

  const hasFilter = !!(filters.finalidade || filters.tipo)

  useEffect(() => {
    setLoading(true)
    const params = hasFilter ? { ...filters } : { destaque: true }
    getImoveis(params).then((data) => {
      setImoveis(data || [])
      setLoading(false)
    })
  }, [filters.finalidade, filters.tipo])

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (filters.finalidade) params.set('finalidade', filters.finalidade)
    if (filters.tipo) params.set('tipo', filters.tipo)
    if (searchCity.trim()) params.set('cidade', searchCity.trim())
    navigate(`/imoveis?${params}`)
  }

  function handleFilterChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const nome = cfg?.NomeImobiliaria || ''
  const gridTitle = hasFilter
    ? `${loading ? '…' : imoveis.length} imóvel(eis) encontrado(s)`
    : 'Imóveis em Destaque'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cfg={cfg} />

      {/* Hero */}
      <section className="bg-white pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 max-w-xl leading-tight">
            Os melhores imóveis<br />da sua região.
          </h1>
          <p className="text-gray-500 mb-8 max-w-md text-sm">
            {cfg?.TextoHome || 'Encontre o imóvel ideal para comprar ou alugar.'}
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <input
              type="text"
              placeholder="🔍  Cidade ou bairro..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="flex-1 border border-gray-200 rounded-full px-5 py-3 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-full text-sm font-semibold text-white whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-brand)' }}
            >
              Buscar
            </button>
          </form>
        </div>
      </section>

      {/* Pill filters */}
      <FilterPills filters={filters} onChange={handleFilterChange} />

      {/* Card grid */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{gridTitle}</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} />)}
          </div>
        ) : imoveis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {imoveis.map((im) => <Card key={im.ID} imovel={im} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">🏡</p>
            <p className="text-sm">Nenhum imóvel encontrado.</p>
          </div>
        )}

        {!hasFilter && imoveis.length > 0 && (
          <div className="text-center mt-10">
            <a
              href="/imoveis"
              className="inline-flex items-center gap-2 px-6 py-3 border rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }}
            >
              Ver todos os imóveis →
            </a>
          </div>
        )}
      </section>

      {/* Why us */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Por que escolher{nome ? ` a ${nome}` : ' a gente'}?
          </h2>
          <p className="text-gray-400 text-sm mb-10">Sua confiança é nossa maior conquista</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              ['🏆', 'Expertise', 'Mais de 10 anos de experiência no mercado imobiliário regional.'],
              ['🤝', 'Atendimento', 'Corretores dedicados para encontrar o imóvel certo para você.'],
              ['🔒', 'Segurança', 'Toda documentação verificada e processo 100% transparente.'],
            ].map(([emoji, title, desc]) => (
              <div key={title} className="p-7 rounded-2xl bg-gray-50 text-left">
                <p className="text-3xl mb-3">{emoji}</p>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer cfg={cfg} />
    </div>
  )
}
