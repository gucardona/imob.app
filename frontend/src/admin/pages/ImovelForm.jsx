import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getImovel, createImovel, updateImovel } from '../api.js'
import FotosGrid from '../components/FotosGrid.jsx'

const EMPTY = {
  Titulo: '', Descricao: '', Tipo: 'casa', Finalidade: 'venda',
  Cidade: '', Bairro: '', Endereco: '',
  Preco: '', AreaM2: '', Quartos: '', Banheiros: '', VagasGaragem: '',
  Status: 'disponivel', Destaque: false,
}

export default function ImovelForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    getImovel(id)
      .then(({ Imovel, Fotos }) => {
        setForm({
          Titulo: Imovel.Titulo ?? '',
          Descricao: Imovel.Descricao ?? '',
          Tipo: Imovel.Tipo ?? 'casa',
          Finalidade: Imovel.Finalidade ?? 'venda',
          Cidade: Imovel.Cidade ?? '',
          Bairro: Imovel.Bairro ?? '',
          Endereco: Imovel.Endereco ?? '',
          Preco: Imovel.Preco ?? '',
          AreaM2: Imovel.AreaM2 ?? '',
          Quartos: Imovel.Quartos ?? '',
          Banheiros: Imovel.Banheiros ?? '',
          VagasGaragem: Imovel.VagasGaragem ?? '',
          Status: Imovel.Status ?? 'disponivel',
          Destaque: Imovel.Destaque ?? false,
        })
        setFotos(Fotos ?? [])
      })
      .catch(() => setError('Erro ao carregar imóvel.'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body = {
      ...form,
      Preco: parseFloat(form.Preco) || 0,
      AreaM2: parseFloat(form.AreaM2) || 0,
      Quartos: parseInt(form.Quartos) || 0,
      Banheiros: parseInt(form.Banheiros) || 0,
      VagasGaragem: parseInt(form.VagasGaragem) || 0,
    }
    try {
      if (isEdit) {
        await updateImovel(id, body)
      } else {
        await createImovel(body)
      }
      navigate('/admin/imoveis')
    } catch {
      setError('Erro ao salvar imóvel.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Carregando…</p>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Editar Imóvel' : 'Novo Imóvel'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Informações</h2>

          <Field label="Título">
            <input value={form.Titulo} onChange={e => set('Titulo', e.target.value)} required className={input} />
          </Field>

          <Field label="Descrição">
            <textarea value={form.Descricao} onChange={e => set('Descricao', e.target.value)} rows={4} className={input} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <select value={form.Tipo} onChange={e => set('Tipo', e.target.value)} className={input}>
                <option value="casa">Casa</option>
                <option value="apartamento">Apartamento</option>
                <option value="terreno">Terreno</option>
                <option value="comercial">Comercial</option>
              </select>
            </Field>
            <Field label="Finalidade">
              <select value={form.Finalidade} onChange={e => set('Finalidade', e.target.value)} className={input}>
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Cidade">
              <input value={form.Cidade} onChange={e => set('Cidade', e.target.value)} className={input} />
            </Field>
            <Field label="Bairro">
              <input value={form.Bairro} onChange={e => set('Bairro', e.target.value)} className={input} />
            </Field>
            <Field label="Endereço">
              <input value={form.Endereco} onChange={e => set('Endereco', e.target.value)} className={input} />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Detalhes</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Preço (R$)">
              <input type="number" step="0.01" value={form.Preco} onChange={e => set('Preco', e.target.value)} className={input} />
            </Field>
            <Field label="Área (m²)">
              <input type="number" step="0.01" value={form.AreaM2} onChange={e => set('AreaM2', e.target.value)} className={input} />
            </Field>
            <Field label="Quartos">
              <input type="number" value={form.Quartos} onChange={e => set('Quartos', e.target.value)} className={input} />
            </Field>
            <Field label="Banheiros">
              <input type="number" value={form.Banheiros} onChange={e => set('Banheiros', e.target.value)} className={input} />
            </Field>
            <Field label="Vagas de Garagem">
              <input type="number" value={form.VagasGaragem} onChange={e => set('VagasGaragem', e.target.value)} className={input} />
            </Field>
            <Field label="Status">
              <select value={form.Status} onChange={e => set('Status', e.target.value)} className={input}>
                <option value="disponivel">Disponível</option>
                <option value="vendido">Vendido</option>
                <option value="alugado">Alugado</option>
                <option value="inativo">Inativo</option>
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.Destaque}
              onChange={e => set('Destaque', e.target.checked)}
              className="rounded border-gray-300"
            />
            Destaque na página inicial
          </label>
        </section>

        {isEdit && (
          <section className="bg-white rounded-lg shadow p-6">
            <FotosGrid imovelID={parseInt(id)} fotos={fotos} onChange={setFotos} />
          </section>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-gray-800 text-white text-sm font-medium px-6 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/imoveis')}
            className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

const input = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
