import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { getImovel, createImovel, updateImovel, uploadMediaFiles } from '../api.js'
import FotosGrid from '../components/FotosGrid.jsx'

const EMPTY = {
  Titulo: '', Descricao: '', Tipo: 'casa', Finalidade: 'venda',
  Estado: '', Cidade: '', Bairro: '', Endereco: '', Numero: '',
  Preco: 0, AreaM2: 0, AreaTotalM2: '', AreaConstruidaM2: '', AreaUtilM2: '',
  FrenteM: '', LadoM: '', Quartos: '', Banheiros: '', VagasGaragem: '',
  Status: 'disponivel', Destaque: false,
}

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

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
  const location = useLocation()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [fotos, setFotos] = useState([])
  const [pendingMedia, setPendingMedia] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [error, setError] = useState('')
  const [cep, setCep] = useState('')
  const [cepStatus, setCepStatus] = useState('')

  useEffect(() => {
    if (location.state?.mediaUploadError) {
      setError(location.state.mediaUploadError)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!isEdit) return
    getImovel(id)
      .then(({ Imovel, Fotos }) => {
        setForm({
          Titulo: Imovel.Titulo ?? '',
          Descricao: Imovel.Descricao ?? '',
          Tipo: Imovel.Tipo ?? 'casa',
          Finalidade: Imovel.Finalidade ?? 'venda',
          Estado: Imovel.Estado ?? '',
          Cidade: Imovel.Cidade ?? '',
          Bairro: Imovel.Bairro ?? '',
          Endereco: Imovel.Endereco ?? '',
          Numero: Imovel.Numero ?? '',
          Preco: Imovel.Preco ?? '',
          AreaM2: Imovel.AreaM2 ?? '',
          AreaTotalM2: Imovel.AreaTotalM2 || Imovel.AreaM2 || '',
          AreaConstruidaM2: Imovel.AreaConstruidaM2 ?? '',
          AreaUtilM2: Imovel.AreaUtilM2 ?? '',
          FrenteM: Imovel.FrenteM ?? '',
          LadoM: Imovel.LadoM ?? '',
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

  async function handleCep(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    const masked = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits
    setCep(masked)
    if (digits.length < 8) {
      setCepStatus('')
      return
    }
    setCepStatus('loading')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        setCepStatus('notfound')
        return
      }
      setForm(f => ({
        ...f,
        Estado: data.uf ?? f.Estado,
        Cidade: data.localidade ?? f.Cidade,
        Bairro: data.bairro ?? f.Bairro,
        Endereco: data.logradouro ?? f.Endereco,
      }))
      setCepStatus('ok')
    } catch {
      setCepStatus('error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setUploadProgress(null)
    setError('')
    const body = {
      ...form,
      Preco: parseFloat(form.Preco) || 0,
      AreaTotalM2: parseFloat(form.AreaTotalM2) || 0,
      AreaConstruidaM2: form.Tipo === 'terreno' ? 0 : (parseFloat(form.AreaConstruidaM2) || 0),
      AreaUtilM2: form.Tipo === 'terreno' ? 0 : (parseFloat(form.AreaUtilM2) || 0),
      FrenteM: form.Tipo === 'apartamento' ? 0 : (parseFloat(form.FrenteM) || 0),
      LadoM: form.Tipo === 'apartamento' ? 0 : (parseFloat(form.LadoM) || 0),
      AreaM2: parseFloat(form.AreaTotalM2) || parseFloat(form.AreaM2) || 0,
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
        if (pendingMedia.length > 0) {
          const result = await uploadMediaFiles(created.ID, pendingMedia, setUploadProgress)
          if (result.failed.length > 0) {
            navigate(`/admin/imoveis/${created.ID}/editar`, {
              state: { mediaUploadError: `${result.failed.length} mídia(s) falharam. Tente enviar novamente na edição.` },
            })
            return
          }
        }
        navigate('/admin/imoveis')
      }
    } catch (err) {
      setError(err?.message || 'Erro ao salvar imóvel.')
    } finally {
      setSaving(false)
      setUploadProgress(null)
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações básicas */}
        <Section title="Informações">
          <Field label="Título *">
            <input
              required
              value={form.Titulo}
              onChange={e => set('Titulo', e.target.value)}
              placeholder="Ex: Casa no centro de Montenegro"
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="CEP">
              <div className="relative">
                <input
                  value={cep}
                  onChange={e => handleCep(e.target.value)}
                  className={inp}
                  placeholder="00000-000"
                  maxLength={9}
                  inputMode="numeric"
                />
                {cepStatus === 'loading' && (
                  <iconify-icon icon="lucide:loader-circle" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-base animate-spin"></iconify-icon>
                )}
                {cepStatus === 'ok' && (
                  <iconify-icon icon="lucide:check" class="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-base"></iconify-icon>
                )}
                {(cepStatus === 'notfound' || cepStatus === 'error') && (
                  <iconify-icon icon="lucide:x" class="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-base"></iconify-icon>
                )}
              </div>
              {cepStatus === 'notfound'
                ? <p className="text-[10px] text-red-400 mt-1">CEP não encontrado.</p>
                : <p className="text-[10px] text-gray-400 mt-1">Preencherá o endereço automaticamente.</p>
              }
            </Field>
            <Field label="Estado *">
              <select required value={form.Estado} onChange={e => set('Estado', e.target.value)} className={inp}>
                <option value="">UF</option>
                {BR_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </Field>
            <Field label="Cidade *">
              <input required value={form.Cidade} onChange={e => set('Cidade', e.target.value)} className={inp} placeholder="Ex: Montenegro" />
            </Field>
            <Field label="Bairro *">
              <input required value={form.Bairro} onChange={e => set('Bairro', e.target.value)} className={inp} placeholder="Ex: Centro" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Endereço *" >
              <input required value={form.Endereco} onChange={e => set('Endereco', e.target.value)} className={`${inp} sm:col-span-3`} placeholder="Ex: Rua das Flores" />
            </Field>
            <Field label="Número">
              <input value={form.Numero} onChange={e => set('Numero', e.target.value)} className={inp} placeholder="Ex: 100" />
            </Field>
          </div>
        </Section>

        {/* Detalhes */}
        <Section title="Detalhes">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Preço (R$)">
              <CentavosInput value={form.Preco} onChange={v => set('Preco', v)} className={inp} />
            </Field>
            <Field label="Área total (m²)">
              <CentavosInput value={form.AreaTotalM2} onChange={v => set('AreaTotalM2', v)} className={inp} />
            </Field>
            {form.Tipo !== 'terreno' && (
              <>
                <Field label="Área construída (m²)">
                  <CentavosInput value={form.AreaConstruidaM2} onChange={v => set('AreaConstruidaM2', v)} className={inp} />
                </Field>
                <Field label="Área útil (m²)">
                  <CentavosInput value={form.AreaUtilM2} onChange={v => set('AreaUtilM2', v)} className={inp} />
                </Field>
              </>
            )}
            {form.Tipo !== 'apartamento' && (
              <>
                <Field label="Frente do terreno (m)">
                  <CentavosInput value={form.FrenteM} onChange={v => set('FrenteM', v)} className={inp} />
                </Field>
                <Field label="Lado do terreno (m)">
                  <CentavosInput value={form.LadoM} onChange={v => set('LadoM', v)} className={inp} />
                </Field>
              </>
            )}
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

        {/* Mídias */}
        <Section title="Mídias">
          {isEdit
            ? <FotosGrid imovelID={parseInt(id)} fotos={fotos} onChange={setFotos} />
            : <PendingFotos files={pendingMedia} onChange={setPendingMedia} />
          }
        </Section>

        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}
        {saving && uploadProgress && <UploadProgress value={uploadProgress} />}

        <div className="flex items-center gap-3 pb-10">
          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white px-8 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {saving
              ? (pendingMedia.length > 0 ? 'Salvando e enviando mídias…' : 'Salvando…')
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

  function moveFile(idx, direction) {
    const target = idx + direction
    onChange(prev => {
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500">
          {files.length} mídia{files.length !== 1 ? 's' : ''} selecionada{files.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand)] hover:underline"
        >
          <iconify-icon icon="lucide:plus" class="text-sm"></iconify-icon>
          Adicionar mídias
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={handleAdd} />
      </div>

      {files.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors"
        >
          <iconify-icon icon="lucide:images" class="text-3xl mb-2 block mx-auto"></iconify-icon>
          <span className="text-sm font-medium">Clique para adicionar mídias</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {previews.map((url, idx) => (
            <div key={idx} className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-video">
              {files[idx].type.startsWith('video/') ? (
                <video src={url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => moveFile(idx, -1)}
                  disabled={idx === 0}
                  className="absolute top-2 left-2 w-8 h-8 bg-white text-gray-700 rounded-lg flex items-center justify-center disabled:opacity-40"
                >
                  <iconify-icon icon="lucide:chevron-left" class="text-sm"></iconify-icon>
                </button>
                <button
                  type="button"
                  onClick={() => moveFile(idx, 1)}
                  disabled={idx === files.length - 1}
                  className="absolute top-2 right-2 w-8 h-8 bg-white text-gray-700 rounded-lg flex items-center justify-center disabled:opacity-40"
                >
                  <iconify-icon icon="lucide:chevron-right" class="text-sm"></iconify-icon>
                </button>
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

function UploadProgress({ value }) {
  const phaseLabels = {
    preparing: 'Preparando',
    uploading: 'Enviando',
    processing: 'Processando',
    done: 'Concluído',
    failed: 'Falhou',
  }
  const percent = value.overallPercent ?? 0

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-gray-500">
        <span className="truncate">
          {phaseLabels[value.phase] || 'Enviando'} {value.fileIndex}/{value.totalFiles}: {value.fileName}
        </span>
        <span className="shrink-0 text-[var(--color-brand)]">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-[var(--color-brand)] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function CentavosInput({ value, onChange, className }) {
  const [digits, setDigits] = useState(() => {
    const n = parseFloat(value)
    return isNaN(n) ? '' : Math.round(n * 100).toString()
  })

  function format(d) {
    if (!d) return ''
    const padded = d.padStart(3, '0')
    const intPart = padded.slice(0, -2)
    const decPart = padded.slice(-2)
    return (parseInt(intPart) || 0).toLocaleString('pt-BR') + ',' + decPart
  }

  function handleKeyDown(e) {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const next = (digits + e.key).replace(/^0+/, '') || '0'
      if (next.length > 13) return
      setDigits(next)
      onChange(parseInt(next) / 100)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const next = digits.slice(0, -1)
      setDigits(next)
      onChange(next ? parseInt(next) / 100 : 0)
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={format(digits)}
      placeholder="0,00"
      onChange={() => {}}
      onKeyDown={handleKeyDown}
      className={className}
    />
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
