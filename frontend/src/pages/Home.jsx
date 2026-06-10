import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImoveis } from '../api'
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
  const [cidade, setCidade] = useState('')
  const [tipo, setTipo] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const navigate = useNavigate()

  const heroImage = cfg?.HeroImageURL || HERO_DEFAULT
  const wa = cfg?.Whatsapp
  const tel = cfg?.Telefone
  const waText = encodeURIComponent('Olá! Gostaria de mais informações sobre os imóveis.')

  useEffect(() => {
    getImoveis({ destaque: true }).then(data => {
      setImoveis(data || [])
      setLoading(false)
    })
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (cidade.trim()) params.set('cidade', cidade.trim())
    if (tipo) params.set('tipo', tipo)
    if (finalidade) params.set('finalidade', finalidade)
    navigate(`/imoveis?${params}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header cfg={cfg} />

      <main className="flex-1 pt-20">
        {/* HERO */}
        <section className="relative h-[75vh] w-full overflow-hidden">
          <img
            src={heroImage}
            alt="Imóvel de luxo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute bottom-24 left-8 lg:left-16 max-w-2xl">
            <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] uppercase tracking-[0.2em] font-bold mb-6 border border-white/20">
              Coleção Exclusiva
            </span>
            <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[0.9] mb-4">
              Espaços extraordinários para uma vida bem vivida.
            </h1>
          </div>
        </section>

        {/* SEARCH BAR */}
        <div className="max-w-6xl mx-auto px-8 lg:px-0 relative z-10 -mt-12">
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl p-4 custom-shadow border border-gray-100 flex flex-col md:flex-row items-center gap-4"
          >
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="px-6 py-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Localização</label>
                <input
                  type="text"
                  placeholder="Cidade ou bairro"
                  value={cidade}
                  onChange={e => setCidade(e.target.value)}
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
              className="w-full md:w-auto bg-[#8B1538] hover:bg-[#6D112B] text-white px-10 py-5 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2"
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
            <div className="flex gap-4">
              <button className="px-6 py-3 bg-[#F5F5F5] rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">
                Destaques
              </button>
              <a href="/imoveis" className="px-6 py-3 text-sm font-bold text-[#8B1538] hover:underline">
                Ver Todos
              </a>
            </div>
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
              <a href="/imoveis" className="text-sm font-bold text-[#8B1538] hover:underline">
                Ver todos os imóveis
              </a>
            </div>
          )}
        </section>

        {/* CTA SECTION */}
        <section className="px-8 lg:px-16 pb-32">
          <div className="bg-[#8B1538] rounded-3xl p-16 flex flex-col items-center text-center overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 max-w-2xl leading-tight relative z-10">
              Sua jornada para o lar perfeito começa com uma conversa.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              {wa ? (
                <a
                  href={`https://wa.me/${wa.replace(/\D/g, '')}?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-10 py-5 bg-white text-[#8B1538] font-bold rounded-xl hover:bg-gray-100 transition-all"
                >
                  Falar com Corretor
                </a>
              ) : tel ? (
                <a
                  href={`tel:${tel}`}
                  className="px-10 py-5 bg-white text-[#8B1538] font-bold rounded-xl hover:bg-gray-100 transition-all"
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
