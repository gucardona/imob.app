import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '../api.js'

const EMPTY = {
  nome_imobiliaria: '', cor_primaria: '', cor_secundaria: '',
  endereco: '', telefone: '', whatsapp: '', email: '',
  instagram_url: '', texto_sobre: '', texto_home: '', hero_image_url: '',
}

export default function Configuracao() {
  const [fields, setFields] = useState(EMPTY)
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
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-1/4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            {[1, 2].map(j => <div key={j} className="h-12 bg-gray-100 rounded-xl" />)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-8">Configurações</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Identidade */}
        <Section title="Identidade">
          <Field label="Nome da Imobiliária">
            <input
              value={fields.nome_imobiliaria}
              onChange={e => set('nome_imobiliaria', e.target.value)}
              className={inp}
              placeholder="Ex: Imobiliária Silva"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Cor Primária">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={fields.cor_primaria || '#8B1538'}
                  onChange={e => set('cor_primaria', e.target.value)}
                  className="h-11 w-14 border border-gray-200 rounded-xl cursor-pointer p-1"
                />
                <input
                  value={fields.cor_primaria}
                  onChange={e => set('cor_primaria', e.target.value)}
                  className={`${inp} flex-1`}
                  placeholder="#8B1538"
                />
              </div>
            </Field>
            <Field label="Cor Secundária">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={fields.cor_secundaria || '#1A1A1A'}
                  onChange={e => set('cor_secundaria', e.target.value)}
                  className="h-11 w-14 border border-gray-200 rounded-xl cursor-pointer p-1"
                />
                <input
                  value={fields.cor_secundaria}
                  onChange={e => set('cor_secundaria', e.target.value)}
                  className={`${inp} flex-1`}
                  placeholder="#1A1A1A"
                />
              </div>
            </Field>
          </div>

          <Field label="Logo">
            {logoPath && (
              <img
                src={`/uploads/${logoPath}`}
                alt="Logo atual"
                className="h-12 mb-3 object-contain rounded"
              />
            )}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 bg-white hover:border-gray-400 transition-colors">
                <iconify-icon icon="lucide:upload" class="text-gray-400 text-base"></iconify-icon>
                <span className="text-sm text-gray-500">
                  {logo ? logo.name : 'Escolher arquivo'}
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={e => setLogo(e.target.files[0] ?? null)}
                className="hidden"
              />
            </label>
          </Field>
        </Section>

        {/* Contato */}
        <Section title="Contato">
          <Field label="Endereço">
            <input value={fields.endereco} onChange={e => set('endereco', e.target.value)} className={inp} placeholder="Rua, número, cidade" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Telefone">
              <input value={fields.telefone} onChange={e => set('telefone', e.target.value)} className={inp} placeholder="(48) 9999-9999" />
            </Field>
            <Field label="WhatsApp">
              <input value={fields.whatsapp} onChange={e => set('whatsapp', e.target.value)} className={inp} placeholder="5548999999999" />
            </Field>
            <Field label="E-mail">
              <input type="email" value={fields.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="contato@imobiliaria.com" />
            </Field>
            <Field label="Instagram URL">
              <input value={fields.instagram_url} onChange={e => set('instagram_url', e.target.value)} className={inp} placeholder="https://instagram.com/..." />
            </Field>
          </div>
        </Section>

        {/* Conteúdo */}
        <Section title="Conteúdo">
          <Field label="Texto da Home">
            <textarea
              value={fields.texto_home}
              onChange={e => set('texto_home', e.target.value)}
              rows={3}
              className={inp}
              placeholder="Texto exibido na página inicial…"
            />
          </Field>
          <Field label="Texto Sobre">
            <textarea
              value={fields.texto_sobre}
              onChange={e => set('texto_sobre', e.target.value)}
              rows={4}
              className={inp}
              placeholder="Descrição da imobiliária…"
            />
          </Field>
          <Field label="URL da Imagem Hero">
            <input
              value={fields.hero_image_url}
              onChange={e => set('hero_image_url', e.target.value)}
              className={inp}
              placeholder="https://…"
            />
          </Field>
        </Section>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <div className="flex items-center gap-4 pb-10">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#8B1538] hover:bg-[#6D112B] text-white px-8 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          {success && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
              <iconify-icon icon="lucide:check-circle" class="text-base"></iconify-icon>
              Salvo!
            </span>
          )}
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
