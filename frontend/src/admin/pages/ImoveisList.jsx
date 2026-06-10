import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listImoveis, deleteImovel, toggleDestaque } from '../api.js'
import StatusBadge from '../components/StatusBadge.jsx'

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
    if (!confirm('Excluir este imóvel?')) return
    await deleteImovel(id).catch(() => alert('Erro ao excluir.'))
    load()
  }

  async function handleDestaque(id) {
    await toggleDestaque(id).catch(() => alert('Erro ao alterar destaque.'))
    load()
  }

  if (loading) return <p className="text-sm text-gray-500">Carregando…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Imóveis</h1>
        <Link
          to="/admin/imoveis/novo"
          className="bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-700"
        >
          + Novo
        </Link>
      </div>

      {imoveis.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum imóvel cadastrado.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-left">Tipo / Finalidade</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Preço</th>
                <th className="px-4 py-3 text-left">Destaque</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {imoveis.map(im => (
                <tr key={im.ID} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{im.Titulo}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{im.Tipo} / {im.Finalidade}</td>
                  <td className="px-4 py-3"><StatusBadge status={im.Status} /></td>
                  <td className="px-4 py-3 text-gray-700">
                    {im.Preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDestaque(im.ID)}
                      className={`text-xs px-2 py-1 rounded ${
                        im.Destaque
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {im.Destaque ? '★ Sim' : '☆ Não'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      to={`/admin/imoveis/${im.ID}/editar`}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(im.ID)}
                      className="text-red-500 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
