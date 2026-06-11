import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getImovel, createImovel, updateImovel, uploadFotos } from '../api.js'
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
  const [pendingPhotos, setPendingPhotos] = useState([])
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
        navigate('/admin/imoveis')
      } else {
        const created = await createImovel(body)
        if (pendingPhotos.length > 0) {
          const fd = new FormData()
          for (const f of pendingPhotos) fd.append('fotos', f)
          await uploadFotos(created.ID, fd).catch(() => {})
        }
        navigate(`/admin/imoveis/${created.ID}/editar`)
      }
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
          className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[var(--color-brand)] transition-colors custom-shadow"
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
                form.Destaque ? 'bg-[var(--color-brand)]' : 'bg-gray-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.Destaque ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Destaque na página inicial</span>
          </label>
        </Section>

        {/* Fotos */}
        <Section title="Fotos">
          {isEdit
            ? <FotosGrid imovelID={parseInt(id)} fotos={fotos} onChange={setFotos} />
            : <PendingFotos files={pendingPhotos} onChange={setPendingPhotos} />
          }
        </Section>

        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}

        <div className="flex items-center gap-3 pb-10">
          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white px-8 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {saving
              ? (pendingPhotos.length > 0 ? 'Salvando e enviando fotos…' : 'Salvando…')
              : 'Salvar'}
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

function PendingFotos({ files, onChange }) {
  const fileRef = useRef(null)

  const previews = useMemo(
    () => files.map(f => URL.createObjectURL(f)),
    [files],
  )

  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url))
  }, [previews])

  function handleAdd(e) {
    const added = Array.from(e.target.files || [])
    if (added.length) onChange(prev => [...prev, ...added])
    e.target.value = ''
  }

  function handleRemove(idx) {
    onChange(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500">
          {files.length} foto{files.length !== 1 ? 's' : ''} selecionada{files.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand)] hover:underline"
        >
          <iconify-icon icon="lucide:plus" class="text-sm"></iconify-icon>
          Adicionar fotos
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />
      </div>

      {files.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors"
        >
          <iconify-icon icon="lucide:image-plus" class="text-3xl mb-2 block mx-auto"></iconify-icon>
          <span className="text-sm font-medium">Clique para adicionar fotos</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {previews.map((url, idx) => (
            <div key={idx} className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-video">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center"
                >
                  <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
