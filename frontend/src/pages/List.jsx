import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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

export default function List({ cfg }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [cityInput, setCityInput] = useState(searchParams.get('cidade') || '')

  const filters = {
    finalidade: searchParams.get('finalidade') || '',
    tipo: searchParams.get('tipo') || '',
    cidade: searchParams.get('cidade') || '',
  }

  useEffect(() => {
    setLoading(true)
    getImoveis(filters).then((data) => {
      setImoveis(data || [])
      setLoading(false)
    })
  }, [searchParams.toString()])

  function handlePillChange(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  function handleCitySearch(e) {
    e.preventDefault()
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (cityInput.trim()) next.set('cidade', cityInput.trim())
      else next.delete('cidade')
      return next
    })
  }

  const count = loading ? '…' : imoveis.length

  return (
    <div className="min-h-screen bg-warm-50">
      <Header cfg={cfg} />
      <FilterPills filters={filters} onChange={handlePillChange} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 tracking-tight">Imóveis Disponíveis</h1>
          <p className="text-warm-400 text-sm mt-0.5">{count} imóvel(eis) encontrado(s)</p>
        </div>
        <form onSubmit={handleCitySearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por cidade..."
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            className="border border-warm-200 rounded-lg px-4 py-2.5 text-sm text-warm-700 focus:outline-none focus:border-warm-400 w-52 bg-white"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity tracking-wide"
            style={{ background: 'var(--color-brand)' }}
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} />)}
          </div>
        ) : imoveis.length === 0 ? (
          <div className="text-center py-24 text-warm-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p className="text-sm">Nenhum imóvel encontrado com esses filtros.</p>
            <button
              onClick={() => setSearchParams({})}
              className="mt-4 text-sm font-medium hover:underline"
              style={{ color: 'var(--color-brand)' }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {imoveis.map((im) => <Card key={im.ID} imovel={im} />)}
          </div>
        )}
      </div>

      <Footer cfg={cfg} />
    </div>
  )
}
