import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImoveis } from '../api'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Card from '../components/Card'
import FilterPills from '../components/FilterPills'

function Skeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-warm-200 animate-pulse">
      <div className="h-52 bg-warm-100" />
      <div className="p-5 space-y-2">
        <div className="h-2.5 bg-warm-100 rounded w-1/2" />
        <div className="h-4 bg-warm-100 rounded w-3/4" />
        <div className="h-2.5 bg-warm-100 rounded w-1/3" />
      </div>
    </div>
  )
}

function IconTrophy() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

const WHY_US = [
  { Icon: IconTrophy, title: 'Expertise', desc: 'Mais de 10 anos de experiência no mercado imobiliário regional.' },
  { Icon: IconUsers, title: 'Atendimento', desc: 'Corretores dedicados para encontrar o imóvel certo para você.' },
  { Icon: IconShield, title: 'Segurança', desc: 'Toda documentação verificada e processo 100% transparente.' },
]

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

  const nome = cfg?.NomeImobiliaria || ''
  const gridTitle = hasFilter
    ? `${loading ? '…' : imoveis.length} imóvel(eis) encontrado(s)`
    : 'Imóveis em Destaque'

  return (
    <div className="min-h-screen bg-warm-50">
      <Header cfg={cfg} />

      {/* Hero */}
      <section
        className="text-white py-24"
        style={{ background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-dark) 60%, #1a150f 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Imobiliária de Confiança
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight tracking-tight">
            Encontre seu próximo<br />
            <span className="text-gold-400">lar ideal</span>
          </h1>
          <p className="text-white/60 text-base mb-12 max-w-lg mx-auto leading-relaxed">
            {cfg?.TextoHome || 'Imóveis selecionados com excelência para realizar o seu sonho.'}
          </p>
          <form onSubmit={handleSearch} className="bg-white rounded-xl p-2 flex flex-wrap gap-2 shadow-2xl max-w-3xl mx-auto">
            <select
              value={filters.finalidade}
              onChange={(e) => setFilters(f => ({ ...f, finalidade: e.target.value }))}
              className="flex-1 min-w-[130px] px-4 py-3 text-warm-700 text-sm rounded-lg bg-warm-50 focus:outline-none border-0"
            >
              <option value="">Finalidade</option>
              <option value="venda">Venda</option>
              <option value="aluguel">Aluguel</option>
            </select>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters(f => ({ ...f, tipo: e.target.value }))}
              className="flex-1 min-w-[130px] px-4 py-3 text-warm-700 text-sm rounded-lg bg-warm-50 focus:outline-none border-0"
            >
              <option value="">Tipo</option>
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
              <option value="terreno">Terreno</option>
              <option value="comercial">Comercial</option>
              <option value="rural">Rural</option>
            </select>
            <input
              type="text"
              placeholder="Cidade ou bairro..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="flex-1 min-w-[160px] px-4 py-3 text-warm-700 text-sm rounded-lg bg-warm-50 focus:outline-none border-0"
            />
            <button
              type="submit"
              className="px-7 py-3 rounded-lg text-sm font-semibold text-white tracking-wide hover:opacity-90 transition-opacity whitespace-nowrap"
              style={{ background: 'var(--color-brand)' }}
            >
              Buscar
            </button>
          </form>
        </div>
      </section>

      {/* Pill filters */}
      <FilterPills filters={filters} onChange={(key, val) => setFilters(f => ({ ...f, [key]: val }))} />

      {/* Card grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-brand)' }}>
              Selecionados para você
            </p>
            <h2 className="text-2xl font-bold text-warm-900 tracking-tight">{gridTitle}</h2>
          </div>
          {!hasFilter && (
            <a
              href="/imoveis"
              className="text-sm font-semibold flex items-center gap-1.5 hover:opacity-75 transition-opacity"
              style={{ color: 'var(--color-brand)' }}
            >
              Ver todos
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} />)}
          </div>
        ) : imoveis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {imoveis.map((im) => <Card key={im.ID} imovel={im} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-warm-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p className="text-sm">Nenhum imóvel encontrado.</p>
          </div>
        )}
      </section>

      {/* Why us */}
      <section className="bg-white py-20 border-t border-warm-100">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-brand)' }}>
            Nossa proposta
          </p>
          <h2 className="text-2xl font-bold text-warm-900 mb-3 tracking-tight">
            Por que escolher{nome ? ` a ${nome}` : ' a gente'}?
          </h2>
          <p className="text-warm-400 text-sm mb-14">Sua confiança é nossa maior conquista</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHY_US.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="p-8 rounded-xl bg-warm-50 border border-warm-100 text-left hover:border-warm-200 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                  style={{ background: 'var(--color-brand-light, #fbe8e8)', color: 'var(--color-brand)' }}
                >
                  <Icon />
                </div>
                <h3 className="font-semibold text-warm-900 mb-2 tracking-tight">{title}</h3>
                <p className="text-warm-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer cfg={cfg} />
    </div>
  )
}
