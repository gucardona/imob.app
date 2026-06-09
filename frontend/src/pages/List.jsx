import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
    <div className="min-h-screen bg-gray-50">
      <Header cfg={cfg} />

      {/* Pill filter strip */}
      <FilterPills filters={filters} onChange={handlePillChange} />

      {/* City search + count */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-gray-500 text-sm font-medium">
          {count} imóvel(eis) encontrado(s)
        </p>
        <form onSubmit={handleCitySearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por cidade..."
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            className="border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-52"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-brand)' }}
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} />)}
          </div>
        ) : imoveis.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-5xl mb-4">🏚</p>
            <p className="text-sm">Nenhum imóvel encontrado com esses filtros.</p>
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
