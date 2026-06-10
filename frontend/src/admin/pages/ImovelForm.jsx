import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getImovel, createImovel, updateImovel } from '../api.js'
import FotosGrid from '../components/FotosGrid.jsx'

const EMPTY = {
  Titulo: '', Descricao: '', Tipo: 'casa', Finalidade: 'venda',
  Cidade: '', Bairro: '', Endereco: '',
  Preco: '', AreaM2: '', Quartos: '', Banheiros: '', VagasGaragem: '',
  Status: 'disponivel', Destaque: false,
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-1/3" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  )
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
      if (isEdit) await updateImovel(id, body)
      else await createImovel(body)
      navigate('/admin/imoveis')
    } catch {
      setError('Erro ao salvar imóvel.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton />

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/admin/imoveis"
          className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#8B1538] transition-colors custom-shadow"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-base"></iconify-icon>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? 'Editar Imóvel' : 'Novo Imóvel'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Informações básicas */}
        <Section title="Informações">
          <Field label="Título">
            <input
              value={form.Titulo}
              onChange={e => set('Titulo', e.target.value)}
              required
              placeholder="Ex: Casa de praia em Jurerê"
              className={inp}
            />
          </Field>

          <Field label="Descrição">
            <textarea
              value={form.Descricao}
              onChange={e => set('Descricao', e.target.value)}
              rows={4}
              placeholder="Descreva o imóvel…"
              className={inp}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tipo">
              <select value={form.Tipo} onChange={e => set('Tipo', e.target.value)} className={inp}>
                <option value="casa">Casa</option>
                <option value="apartamento">Apartamento</option>
                <option value="terreno">Terreno</option>
                <option value="comercial">Comercial</option>
              </select>
            </Field>
            <Field label="Finalidade">
              <select value={form.Finalidade} onChange={e => set('Finalidade', e.target.value)} className={inp}>
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Cidade">
              <input value={form.Cidade} onChange={e => set('Cidade', e.target.value)} className={inp} placeholder="Ex: Florianópolis" />
            </Field>
            <Field label="Bairro">
              <input value={form.Bairro} onChange={e => set('Bairro', e.target.value)} className={inp} placeholder="Ex: Jurerê" />
            </Field>
            <Field label="Endereço">
              <input value={form.Endereco} onChange={e => set('Endereco', e.target.value)} className={inp} placeholder="Ex: Av. Beira Mar, 100" />
            </Field>
          </div>
        </Section>

        {/* Detalhes */}
        <Section title="Detalhes">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Preço (R$)">
              <input type="number" step="1" min="0" value={form.Preco} onChange={e => set('Preco', e.target.value)} className={inp} placeholder="0" />
            </Field>
            <Field label="Área (m²)">
              <input type="number" step="0.01" min="0" value={form.AreaM2} onChange={e => set('AreaM2', e.target.value)} className={inp} placeholder="0" />
            </Field>
            <Field label="Quartos">
              <input type="number" min="0" value={form.Quartos} onChange={e => set('Quartos', e.target.value)} className={inp} placeholder="0" />
            </Field>
            <Field label="Banheiros">
              <input type="number" min="0" value={form.Banheiros} onChange={e => set('Banheiros', e.target.value)} className={inp} placeholder="0" />
            </Field>
            <Field label="Vagas">
              <input type="number" min="0" value={form.VagasGaragem} onChange={e => set('VagasGaragem', e.target.value)} className={inp} placeholder="0" />
            </Field>
            <Field label="Status">
              <select value={form.Status} onChange={e => set('Status', e.target.value)} className={inp}>
                <option value="disponivel">Disponível</option>
                <option value="vendido">Vendido</option>
                <option value="alugado">Alugado</option>
                <option value="inativo">Inativo</option>
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => set('Destaque', !form.Destaque)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
                form.Destaque ? 'bg-[#8B1538]' : 'bg-gray-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.Destaque ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Destaque na página inicial</span>
          </label>
        </Section>

        {/* Fotos — apenas no modo edição */}
        {isEdit && (
          <Section title="Fotos">
            <FotosGrid imovelID={parseInt(id)} fotos={fotos} onChange={setFotos} />
          </Section>
        )}

        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}

        <div className="flex items-center gap-3 pb-10">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#8B1538] hover:bg-[#6D112B] text-white px-8 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/imoveis')}
            className="px-6 py-3 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 transition-colors bg-white placeholder-gray-300'

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 custom-shadow space-y-5">
      <h2 className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
