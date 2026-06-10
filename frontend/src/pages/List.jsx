import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getImoveis } from '../api'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Card from '../components/Card'
import FilterPills from '../components/FilterPills'

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
    const cidade = searchParams.get('cidade') || ''
    setCityInput(cidade)
  }, [searchParams.get('cidade')])

  useEffect(() => {
    setLoading(true)
    getImoveis(filters).then(data => {
      setImoveis(data || [])
      setLoading(false)
    })
  }, [searchParams.toString()])

  function handlePillChange(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  function handleCitySearch(e) {
    e.preventDefault()
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (cityInput.trim()) next.set('cidade', cityInput.trim())
      else next.delete('cidade')
      return next
    })
  }

  const count = loading ? '…' : imoveis.length

  return (
    <div className="min-h-screen flex flex-col">
      <Header cfg={cfg} />

      <main className="flex-1 pt-20">
        <FilterPills filters={filters} onChange={handlePillChange} />

        <div className="max-w-7xl mx-auto px-8 lg:px-16 py-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Imóveis Disponíveis</h1>
            <p className="text-gray-500">{count} imóvel(eis) encontrado(s)</p>
          </div>
          <form onSubmit={handleCitySearch} className="flex gap-3">
            <input
              type="text"
              placeholder="Buscar por cidade..."
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 w-56 placeholder-gray-300"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[#8B1538] hover:bg-[#6D112B] text-white rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="max-w-7xl mx-auto px-8 lg:px-16 pb-24">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} />)}
            </div>
          ) : imoveis.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <iconify-icon icon="lucide:building-2" className="text-5xl mb-4 block mx-auto"></iconify-icon>
              <p className="text-sm mb-4">Nenhum imóvel encontrado com esses filtros.</p>
              <button
                onClick={() => setSearchParams({})}
                className="text-sm font-bold text-[#8B1538] hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {imoveis.map(im => <Card key={im.ID} imovel={im} />)}
            </div>
          )}
        </div>
      </main>

      <Footer cfg={cfg} />
    </div>
  )
}
