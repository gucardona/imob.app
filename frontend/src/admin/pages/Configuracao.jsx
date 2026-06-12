import { useState, useEffect } from 'react'
import { getConfig, updateConfig, resetBranding, removeLogo, uploadHeroImage, removeHeroImage } from '../api.js'
import { setTheme } from '../../utils.js'

const DEFAULTS = {
  cor_primaria: '#8B1538',
  cor_secundaria: '',
}

const EMPTY = {
  nome_imobiliaria: '', cor_primaria: '', cor_secundaria: '',
  endereco: '', telefone: '', whatsapp: '', email: '',
  instagram_url: '', facebook_url: '', linkedin_url: '', x_url: '',
  tiktok_url: '', youtube_url: '', pinterest_url: '', whatsapp_url: '', telegram_url: '',
  texto_sobre: '', hero_image_url: '',
  hero_titulo: '', hero_subtitulo: '', cta_texto: '', cta_link: '',
  msg_whatsapp_padrao: '', msg_whatsapp_imovel: '',
  hero_mode: 'image',
}

export default function Configuracao() {
  const [fields, setFields] = useState(EMPTY)
  const [logo, setLogo] = useState(null)
  const [logoPath, setLogoPath] = useState('')
  const [heroImage, setHeroImage] = useState(null)
  const [heroImagePath, setHeroImagePath] = useState('')
  const [uploadingHero, setUploadingHero] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const [showRemoveLogoModal, setShowRemoveLogoModal] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)

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
          facebook_url: cfg.FacebookURL ?? '',
          linkedin_url: cfg.LinkedinURL ?? '',
          x_url: cfg.XURL ?? '',
          tiktok_url: cfg.TiktokURL ?? '',
          youtube_url: cfg.YoutubeURL ?? '',
          pinterest_url: cfg.PinterestURL ?? '',
          whatsapp_url: cfg.WhatsappURL ?? '',
          telegram_url: cfg.TelegramURL ?? '',
          texto_sobre: cfg.TextoSobre ?? '',
          hero_image_url: cfg.HeroImageURL ?? '',
          hero_titulo: cfg.HeroTitulo ?? '',
          hero_subtitulo: cfg.HeroSubtitulo ?? '',
          cta_texto: cfg.CtaTexto ?? '',
          cta_link: cfg.CtaLink ?? '',
          msg_whatsapp_padrao: cfg.MsgWhatsappPadrao ?? '',
          msg_whatsapp_imovel: cfg.MsgWhatsappImovel ?? '',
          hero_mode: cfg.HeroMode ?? 'image',
        })
        setLogoPath(cfg.LogoPath ?? '')
        setHeroImagePath(cfg.HeroImagePath ?? '')
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
      setTheme(cfg)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetColors() {
    setResetting(true)
    try {
      const cfg = await resetBranding()
      setFields(f => ({
        ...f,
        cor_primaria: cfg.CorPrimaria ?? DEFAULTS.cor_primaria,
        cor_secundaria: cfg.CorSecundaria ?? DEFAULTS.cor_secundaria,
      }))
      setTheme(cfg)
      setShowResetModal(false)
      setResetSuccess(true)
      setTimeout(() => setResetSuccess(false), 3000)
    } catch {
      setError('Erro ao restaurar cores.')
      setShowResetModal(false)
    } finally {
      setResetting(false)
    }
  }

  async function handleUploadHeroImage(file) {
    if (!file) return
    setUploadingHero(true)
    const fd = new FormData()
    fd.append('hero_image', file)
    try {
      const res = await uploadHeroImage(fd)
      setHeroImagePath(res.HeroImagePath ?? '')
      setHeroImage(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Erro ao enviar imagem hero.')
    } finally {
      setUploadingHero(false)
    }
  }

  async function handleRemoveHeroImage() {
    setUploadingHero(true)
    try {
      await removeHeroImage()
      setHeroImagePath('')
      setHeroImage(null)
    } catch {
      setError('Erro ao remover imagem hero.')
    } finally {
      setUploadingHero(false)
    }
  }

  async function handleRemoveLogo() {
    setRemovingLogo(true)
    try {
      await removeLogo()
      setLogoPath('')
      setLogo(null)
      setShowRemoveLogoModal(false)
      const link = document.querySelector("link[rel~='icon']")
      if (link) link.href = '/favicon.ico'
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Erro ao remover logo.')
      setShowRemoveLogoModal(false)
    } finally {
      setRemovingLogo(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        {/* title */}
        <div className="h-9 bg-gray-100 rounded-xl w-48" />

        {/* Identidade */}
        <SkCard>
          <div className="h-2.5 bg-gray-100 rounded-full w-20" />
          <SkField wide />
          <div className="grid grid-cols-2 gap-4">
            <SkField />
            <SkField />
          </div>
          <div className="h-3 bg-gray-100 rounded-full w-36" />
          <div className="h-24 bg-gray-100 rounded-xl" />
        </SkCard>

        {/* Contato */}
        <SkCard>
          <div className="h-2.5 bg-gray-100 rounded-full w-16" />
          <SkField wide />
          <div className="grid grid-cols-2 gap-4">
            <SkField /><SkField /><SkField /><SkField />
          </div>
        </SkCard>

        {/* Página Inicial */}
        <SkCard>
          <div className="h-2.5 bg-gray-100 rounded-full w-28" />
          <SkField wide />
          <SkField wide />
          <div className="grid grid-cols-2 gap-4">
            <SkField /><SkField />
          </div>
          <SkField wide />
        </SkCard>

        {/* Sobre + WhatsApp */}
        <SkCard>
          <div className="h-2.5 bg-gray-100 rounded-full w-12" />
          <div className="h-24 bg-gray-100 rounded-xl" />
        </SkCard>
        <SkCard>
          <div className="h-2.5 bg-gray-100 rounded-full w-40" />
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-28 bg-gray-100 rounded-xl" />
        </SkCard>

        {/* Save button */}
        <div className="h-11 bg-gray-200 rounded-xl w-28" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Configurações</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Cores */}
          <div className="space-y-3">
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
                    value={fields.cor_secundaria || '#1A1A1A'}
                    onChange={e => set('cor_secundaria', e.target.value)}
                    className={`${inp} flex-1`}
                    placeholder="#1A1A1A"
                  />
                </div>
              </Field>
            </div>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              <iconify-icon icon="lucide:rotate-ccw" class="text-sm"></iconify-icon>
              Restaurar cores padrão
            </button>
          </div>

          {/* Logo */}
          <Field label="Logo">
            {logoPath ? (
              <div className="space-y-3">
                <div className="inline-block p-3 border border-gray-100 rounded-xl bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#ffffff_0%_50%)_0_0/16px_16px]">
                  <img
                    src={`/uploads/${logoPath}`}
                    alt="Logo atual"
                    className="h-20 w-auto max-w-[280px] object-contain"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 bg-white hover:border-gray-400 transition-colors">
                      <iconify-icon icon="lucide:upload" class="text-gray-400 text-base"></iconify-icon>
                      <span className="text-sm text-gray-500">
                        {logo ? logo.name : 'Substituir logo'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setLogo(e.target.files[0] ?? null)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRemoveLogoModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-red-100 rounded-xl text-sm text-red-400 hover:border-red-300 hover:text-red-600 transition-colors bg-white"
                  >
                    <iconify-icon icon="lucide:trash-2" class="text-base"></iconify-icon>
                    Remover Logo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-full border border-dashed border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-300">
                  Nenhuma logo configurada
                </div>
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
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1.5">PNG, JPG, GIF ou WebP · máx. 2 MB</p>
          </Field>
        </Section>

        {/* Contato */}
        <Section title="Contato">
          <Field label="Endereço">
            <input value={fields.endereco} onChange={e => set('endereco', e.target.value)} className={inp} placeholder="Rua, número, cidade" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Telefone">
              <input value={fields.telefone} onChange={e => set('telefone', e.target.value)} className={inp} placeholder="5199999999" />
            </Field>
            <Field label="WhatsApp">
              <input value={fields.whatsapp} onChange={e => set('whatsapp', e.target.value)} className={inp} placeholder="5551999999999" />
            </Field>
            <Field label="E-mail">
              <input type="email" value={fields.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="contato@imobiliaria.com" />
            </Field>
          </div>
        </Section>

        {/* Redes Sociais */}
        <Section title="Redes Sociais">
          <p className="text-xs text-gray-400 -mt-1">Preencha apenas as redes que sua imobiliária utiliza. Links em branco ficam ocultos no site.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SocialField label="Instagram" icon="mdi:instagram" field="instagram_url" placeholder="https://instagram.com/suaimobiliaria" fields={fields} set={set} />
            <SocialField label="Facebook" icon="mdi:facebook" field="facebook_url" placeholder="https://facebook.com/suaimobiliaria" fields={fields} set={set} />
            <SocialField label="LinkedIn" icon="mdi:linkedin" field="linkedin_url" placeholder="https://linkedin.com/company/suaimobiliaria" fields={fields} set={set} />
            <SocialField label="X (Twitter)" icon="mdi:twitter" field="x_url" placeholder="https://x.com/suaimobiliaria" fields={fields} set={set} />
            <SocialField label="TikTok" icon="mdi:tiktok" field="tiktok_url" placeholder="https://tiktok.com/@suaimobiliaria" fields={fields} set={set} />
            <SocialField label="YouTube" icon="mdi:youtube" field="youtube_url" placeholder="https://youtube.com/@suaimobiliaria" fields={fields} set={set} />
            <SocialField label="Pinterest" icon="mdi:pinterest" field="pinterest_url" placeholder="https://pinterest.com/suaimobiliaria" fields={fields} set={set} />
            <SocialField label="WhatsApp" icon="mdi:whatsapp" field="whatsapp_url" placeholder="https://wa.me/5551999999999" fields={fields} set={set} />
            <SocialField label="Telegram" icon="mdi:telegram" field="telegram_url" placeholder="https://t.me/suaimobiliaria" fields={fields} set={set} />
          </div>
        </Section>

        {/* Página Inicial */}
        <Section title="Página Inicial">
          <Field label="Título do Hero">
            <input
              value={fields.hero_titulo}
              onChange={e => set('hero_titulo', e.target.value)}
              className={inp}
              placeholder="Espaços extraordinários para uma vida bem vivida."
            />
          </Field>
          <Field label="Subtítulo do Hero">
            <input
              value={fields.hero_subtitulo}
              onChange={e => set('hero_subtitulo', e.target.value)}
              className={inp}
              placeholder="Compra, venda e locação com atendimento especializado."
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Texto do Botão CTA">
              <input
                value={fields.cta_texto}
                onChange={e => set('cta_texto', e.target.value)}
                className={inp}
                placeholder="Ver Imóveis"
              />
            </Field>
            <Field label="Link do Botão CTA">
              <input
                value={fields.cta_link}
                onChange={e => set('cta_link', e.target.value)}
                className={inp}
                placeholder="/imoveis"
              />
            </Field>
          </div>
        </Section>

        {/* Fundo do Hero */}
        <Section title="Fundo do Hero">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Imagem de fundo</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fields.hero_mode === 'image' ? 'Exibe imagem cobrindo o hero' : 'Gradiente limpo com foco na busca'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('hero_mode', fields.hero_mode === 'image' ? 'clean' : 'image')}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0 ${
                fields.hero_mode === 'image' ? 'bg-[var(--color-brand)]' : 'bg-gray-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                fields.hero_mode === 'image' ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {fields.hero_mode === 'image' ? (
            <div className="space-y-4">
              {heroImagePath ? (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden aspect-video max-w-sm">
                    <img src={`/uploads/${heroImagePath}`} alt="Hero atual" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 bg-white hover:border-gray-400 transition-colors">
                        <iconify-icon icon="lucide:upload" class="text-gray-400 text-base"></iconify-icon>
                        <span className="text-sm text-gray-500">Substituir imagem</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files[0]
                          if (f) handleUploadHeroImage(f)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveHeroImage}
                      disabled={uploadingHero}
                      className="flex items-center gap-1.5 px-4 py-2.5 border border-red-100 rounded-xl text-sm text-red-400 hover:border-red-300 hover:text-red-600 transition-colors bg-white disabled:opacity-50"
                    >
                      <iconify-icon icon="lucide:trash-2" class="text-base"></iconify-icon>
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden aspect-video max-w-sm relative">
                    <img
                      src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=40&w=600&auto=format&fit=crop"
                      alt="Imagem padrão"
                      className="w-full h-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-full">Imagem padrão (Unsplash)</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 bg-white hover:border-gray-400 transition-colors">
                      <iconify-icon icon="lucide:upload" class="text-gray-400 text-base"></iconify-icon>
                      <span className="text-sm text-gray-500">
                        {uploadingHero ? 'Enviando…' : 'Escolher imagem personalizada'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingHero}
                      onChange={e => {
                        const f = e.target.files[0]
                        if (f) handleUploadHeroImage(f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              )}
              <p className="text-[10px] text-gray-400">PNG, JPG ou WebP · máx. 5 MB</p>

              <Field label="Ou cole uma URL de imagem">
                <input
                  value={fields.hero_image_url}
                  onChange={e => set('hero_image_url', e.target.value)}
                  className={inp}
                  placeholder="https://…"
                />
              </Field>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-gray-100 max-w-sm aspect-video relative"
                 style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f5f5f5 100%)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-[0.12] pointer-events-none"
                   style={{ backgroundColor: 'var(--color-brand)' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: 'var(--color-brand)' }} />
                <div className="h-3 bg-gray-200 rounded w-36" />
                <div className="h-2.5 bg-gray-100 rounded w-24" />
                <div className="h-6 w-20 rounded-lg mt-1" style={{ backgroundColor: 'var(--color-brand)', opacity: 0.8 }} />
              </div>
            </div>
          )}
        </Section>

        {/* Sobre */}
        <Section title="Sobre">
          <Field label="Descrição da Empresa">
            <textarea
              value={fields.texto_sobre}
              onChange={e => set('texto_sobre', e.target.value)}
              rows={4}
              className={inp}
              placeholder="Descrição exibida no rodapé do site…"
            />
          </Field>
        </Section>

        {/* Mensagens WhatsApp */}
        <Section title="Mensagens WhatsApp">
          <Field label="Mensagem Padrão">
            <textarea
              value={fields.msg_whatsapp_padrao}
              onChange={e => set('msg_whatsapp_padrao', e.target.value)}
              rows={3}
              className={inp}
              placeholder="Olá! Vim pelo site e gostaria de receber ajuda para encontrar um imóvel. Poderia me auxiliar?"
            />
            <p className="text-[10px] text-gray-400 mt-1.5">Usada no header, rodapé e página inicial. Deixe em branco para usar o padrão.</p>
          </Field>
          <Field label="Mensagem de Imóvel">
            <textarea
              value={fields.msg_whatsapp_imovel}
              onChange={e => set('msg_whatsapp_imovel', e.target.value)}
              rows={5}
              className={inp}
              placeholder={'Olá! Vim pelo site e gostaria de receber mais informações sobre este imóvel.\n\nImóvel: {property_title}\nCódigo: {property_code}\nLink: {property_url}'}
            />
            <p className="text-[10px] text-gray-400 mt-1.5">
              Usada na página do imóvel. Variáveis disponíveis: <code className="bg-gray-100 px-1 rounded">{'{property_title}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{property_code}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{property_url}'}</code>
            </p>
          </Field>
        </Section>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <div className="flex items-center gap-4 pb-10">
          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white px-8 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          {(success || resetSuccess) && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
              <iconify-icon icon="lucide:check-circle" class="text-base"></iconify-icon>
              {resetSuccess ? 'Cores restauradas!' : 'Salvo!'}
            </span>
          )}
        </div>
      </form>

      {showResetModal && (
        <ResetColorsModal
          onConfirm={handleResetColors}
          onCancel={() => setShowResetModal(false)}
          loading={resetting}
        />
      )}

      {showRemoveLogoModal && (
        <RemoveLogoModal
          onConfirm={handleRemoveLogo}
          onCancel={() => setShowRemoveLogoModal(false)}
          loading={removingLogo}
        />
      )}
    </div>
  )
}

function ResetColorsModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!loading ? onCancel : undefined} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full custom-shadow border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <iconify-icon icon="lucide:palette" class="text-amber-600 text-lg"></iconify-icon>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Restaurar cores padrão?</h2>
        </div>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Esta ação irá restaurar apenas as cores primária e secundária para os valores padrão. Nenhuma outra configuração será alterada.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Restaurando…' : 'Restaurar Cores'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RemoveLogoModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!loading ? onCancel : undefined} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full custom-shadow border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <iconify-icon icon="lucide:image-off" class="text-red-500 text-lg"></iconify-icon>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Remover logo?</h2>
        </div>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Tem certeza que deseja remover a logo personalizada? A plataforma voltará a utilizar a identidade visual padrão.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Removendo…' : 'Remover Logo'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 transition-colors bg-white placeholder-gray-400'

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

function SkCard({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 custom-shadow space-y-5">
      {children}
    </div>
  )
}

function SocialField({ label, icon, field, placeholder, fields, set }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <div className="w-10 h-11 flex-shrink-0 flex items-center justify-center border border-gray-200 rounded-xl bg-gray-50">
          <iconify-icon icon={icon} class="text-gray-400 text-lg"></iconify-icon>
        </div>
        <input
          value={fields[field]}
          onChange={e => set(field, e.target.value)}
          className={`${inp} flex-1`}
          placeholder={placeholder}
          type="url"
        />
      </div>
    </Field>
  )
}

function SkField({ wide }) {
  return (
    <div className="space-y-2">
      <div className={`h-2.5 bg-gray-100 rounded-full ${wide ? 'w-36' : 'w-24'}`} />
      <div className="h-11 bg-gray-100 rounded-xl" />
    </div>
  )
}
