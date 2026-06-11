import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listImoveis, deleteImovel, toggleDestaque } from '../api.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatPrice } from '../../utils.js'

function Skeleton() {
  return (
    <div className="animate-pulse bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex justify-between mb-4">
        <div className="h-5 bg-gray-100 rounded w-1/2" />
        <div className="h-5 bg-gray-100 rounded w-16" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
      <div className="h-4 bg-gray-100 rounded w-1/4" />
    </div>
  )
}

export default function ImoveisList() {
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    listImoveis()
      .then(setImoveis)
      .catch(() => setError('Erro ao carregar imóveis.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    if (!confirm('Excluir este imóvel permanentemente?')) return
    await deleteImovel(id).catch(() => alert('Erro ao excluir.'))
    load()
  }

  async function handleDestaque(id) {
    await toggleDestaque(id).catch(() => alert('Erro ao alterar destaque.'))
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
          {!loading && (
            <p className="text-gray-400 text-sm mt-1">{imoveis.length} imóvel(eis)</p>
          )}
        </div>
        <Link
          to="/admin/imoveis/novo"
          className="flex items-center gap-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
        >
          <iconify-icon icon="lucide:plus" class="text-base"></iconify-icon>
          <span className="hidden sm:inline">Novo Imóvel</span>
          <span className="sm:hidden">Novo</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-sm text-red-500 mb-6">{error}</div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} />)}
        </div>
      ) : imoveis.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <iconify-icon icon="lucide:building-2" class="text-5xl mb-4 block mx-auto"></iconify-icon>
          <p className="text-sm mb-6">Nenhum imóvel cadastrado ainda.</p>
          <Link
            to="/admin/imoveis/novo"
            className="text-sm font-bold text-[var(--color-brand)] hover:underline"
          >
            Cadastrar primeiro imóvel
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {imoveis.map(im => (
            <div
              key={im.ID}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4 custom-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 tracking-tight truncate">{im.Titulo}</h3>
                  <StatusBadge status={im.Status} />
                  {im.Destaque && (
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-brand)] bg-[var(--color-brand-light)] px-2 py-0.5 rounded-full">
                      Destaque
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {[im.Cidade, im.Bairro].filter(Boolean).join(' · ')}
                  {im.Cidade || im.Bairro ? ' · ' : ''}
                  <span className="capitalize">{im.Tipo}</span>
                  {' / '}
                  <span className="capitalize">{im.Finalidade}</span>
                </p>
                <p className="text-[var(--color-brand)] font-bold text-sm mt-1">
                  {formatPrice(im.Preco, im.Finalidade)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDestaque(im.ID)}
                  title={im.Destaque ? 'Remover destaque' : 'Marcar como destaque'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    im.Destaque
                      ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                      : 'bg-gray-100 text-gray-400 hover:text-[var(--color-brand)]'
                  }`}
                >
                  <iconify-icon icon={im.Destaque ? 'lucide:star' : 'lucide:star'} class="text-base"></iconify-icon>
                </button>
                <Link
                  to={`/admin/imoveis/${im.ID}/editar`}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:text-[var(--color-brand)] transition-colors"
                  title="Editar"
                >
                  <iconify-icon icon="lucide:pencil" class="text-base"></iconify-icon>
                </Link>
                <button
                  onClick={() => handleDelete(im.ID)}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                  title="Excluir"
                >
                  <iconify-icon icon="lucide:trash-2" class="text-base"></iconify-icon>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
