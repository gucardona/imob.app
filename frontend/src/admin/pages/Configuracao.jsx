import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '../api.js'

export default function Configuracao() {
  const [fields, setFields] = useState({
    nome_imobiliaria: '', cor_primaria: '', cor_secundaria: '',
    endereco: '', telefone: '', whatsapp: '', email: '',
    instagram_url: '', texto_sobre: '', texto_home: '', hero_image_url: '',
  })
  const [logo, setLogo] = useState(null)
  const [logoPath, setLogoPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getConfig()
      .then(cfg => {
        setFields({
          nome_imobiliaria: cfg.NomeImobiliaria ?? '',
          cor_primaria: cfg.CorPrimaria ?? '',
          cor_secundaria: cfg.CorSecundaria ?? '',
          endereco: cfg.Endereco ?? '',
          telefone: cfg.Telefone ?? '',
          whatsapp: cfg.Whatsapp ?? '',
          email: cfg.Email ?? '',
          instagram_url: cfg.InstagramURL ?? '',
          texto_sobre: cfg.TextoSobre ?? '',
          texto_home: cfg.TextoHome ?? '',
          hero_image_url: cfg.HeroImageURL ?? '',
        })
        setLogoPath(cfg.LogoPath ?? '')
      })
      .catch(() => setError('Erro ao carregar configurações.'))
      .finally(() => setLoading(false))
  }, [])

  function set(key, value) {
    setFields(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError('')
    const fd = new FormData()
    for (const [k, v] of Object.entries(fields)) fd.append(k, v)
    if (logo) fd.append('logo', logo)
    try {
      const cfg = await updateConfig(fd)
      setLogoPath(cfg.LogoPath ?? '')
      setLogo(null)
      setSuccess(true)
    } catch {
      setError('Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Carregando…</p>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configurações</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Identidade</h2>

          <Field label="Nome da Imobiliária">
            <input value={fields.nome_imobiliaria} onChange={e => set('nome_imobiliaria', e.target.value)} className={input} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cor Primária">
              <div className="flex gap-2 items-center">
                <input type="color" value={fields.cor_primaria || '#000000'} onChange={e => set('cor_primaria', e.target.value)} className="h-9 w-12 border border-gray-300 rounded cursor-pointer" />
                <input value={fields.cor_primaria} onChange={e => set('cor_primaria', e.target.value)} className={`${input} flex-1`} placeholder="#000000" />
              </div>
            </Field>
            <Field label="Cor Secundária">
              <div className="flex gap-2 items-center">
                <input type="color" value={fields.cor_secundaria || '#000000'} onChange={e => set('cor_secundaria', e.target.value)} className="h-9 w-12 border border-gray-300 rounded cursor-pointer" />
                <input value={fields.cor_secundaria} onChange={e => set('cor_secundaria', e.target.value)} className={`${input} flex-1`} placeholder="#000000" />
              </div>
            </Field>
          </div>

          <Field label="Logo">
            {logoPath && (
              <img src={`/uploads/${logoPath}`} alt="Logo atual" className="h-12 mb-2 object-contain" />
            )}
            <input type="file" accept="image/*" onChange={e => setLogo(e.target.files[0] ?? null)} className="text-sm text-gray-600" />
          </Field>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contato</h2>

          <Field label="Endereço">
            <input value={fields.endereco} onChange={e => set('endereco', e.target.value)} className={input} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefone">
              <input value={fields.telefone} onChange={e => set('telefone', e.target.value)} className={input} />
            </Field>
            <Field label="WhatsApp">
              <input value={fields.whatsapp} onChange={e => set('whatsapp', e.target.value)} className={input} />
            </Field>
            <Field label="E-mail">
              <input type="email" value={fields.email} onChange={e => set('email', e.target.value)} className={input} />
            </Field>
            <Field label="Instagram URL">
              <input value={fields.instagram_url} onChange={e => set('instagram_url', e.target.value)} className={input} />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Conteúdo</h2>

          <Field label="Texto da Home">
            <textarea value={fields.texto_home} onChange={e => set('texto_home', e.target.value)} rows={3} className={input} />
          </Field>
          <Field label="Texto Sobre">
            <textarea value={fields.texto_sobre} onChange={e => set('texto_sobre', e.target.value)} rows={4} className={input} />
          </Field>
          <Field label="URL da Imagem Hero">
            <input value={fields.hero_image_url} onChange={e => set('hero_image_url', e.target.value)} className={input} />
          </Field>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Configurações salvas!</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-gray-800 text-white text-sm font-medium px-6 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
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
