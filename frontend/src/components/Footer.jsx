import { getWAGenericURL } from '../utils'

const SOCIAL_LINKS = [
  { key: 'InstagramURL', icon: 'mdi:instagram', label: 'Instagram' },
  { key: 'FacebookURL',  icon: 'mdi:facebook',  label: 'Facebook' },
  { key: 'LinkedinURL',  icon: 'mdi:linkedin',  label: 'LinkedIn' },
  { key: 'XURL',         icon: 'mdi:twitter',   label: 'X' },
  { key: 'TiktokURL',    icon: 'mdi:tiktok',    label: 'TikTok' },
  { key: 'YoutubeURL',   icon: 'mdi:youtube',   label: 'YouTube' },
  { key: 'PinterestURL', icon: 'mdi:pinterest', label: 'Pinterest' },
  { key: 'WhatsappURL',  icon: 'mdi:whatsapp',  label: 'WhatsApp' },
  { key: 'TelegramURL',  icon: 'mdi:telegram',  label: 'Telegram' },
]

export default function Footer({ cfg }) {
  const name = cfg?.NomeImobiliaria || 'Imóveis'
  const logoPath = cfg?.LogoPath
  const descricao = cfg?.TextoSobre
  const telefone = cfg?.Telefone
  const email = cfg?.Email
  const endereco = cfg?.Endereco
  const waURL = getWAGenericURL(cfg)

  const hasContact = telefone || waURL || email || endereco

  const socialLinks = SOCIAL_LINKS.filter(s => cfg?.[s.key])

  return (
    <footer className="text-white pt-12 pb-8 px-8 lg:px-16" style={{ backgroundColor: 'var(--color-secondary)' }}>
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col lg:flex-row lg:justify-between gap-10 pb-10 border-b border-white/5">

          {/* Brand */}
          <div className="lg:max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              {logoPath ? (
                <img
                  src={`/uploads/${logoPath}`}
                  alt={name}
                  className="h-12 w-auto max-w-[200px] object-contain"
                />
              ) : (
                <div className="w-6 h-6 bg-[var(--color-brand)] flex items-center justify-center rounded-sm flex-shrink-0">
                  <iconify-icon icon="lucide:home" className="text-white text-sm"></iconify-icon>
                </div>
              )}
              <span className="text-sm font-bold tracking-tight uppercase text-gray-200 leading-tight">
                {name}
              </span>
            </div>

            {descricao && (
              <p className="text-sm text-gray-400 leading-relaxed mb-5">{descricao}</p>
            )}

            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socialLinks.map(s => (
                  <a
                    key={s.key}
                    href={cfg[s.key]}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="inline-flex w-9 h-9 rounded-full border border-white/10 items-center justify-center text-gray-400 hover:border-white/40 hover:text-white transition-all"
                  >
                    <iconify-icon icon={s.icon} className="text-base"></iconify-icon>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Contact */}
          {hasContact && (
            <div className="flex flex-col gap-3.5">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 mb-1">Contato</h4>
              {telefone && (
                <a href={`tel:${telefone.replace(/\D/g, '')}`} className="flex items-center gap-3 text-sm text-gray-300 hover:text-white transition-colors group">
                  <iconify-icon icon="lucide:phone" className="text-sm text-gray-500 group-hover:text-white flex-shrink-0 transition-colors"></iconify-icon>
                  {telefone.replace(/\D/g, '').replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')}
                </a>
              )}
              {waURL && (
                <a href={waURL} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-gray-300 hover:text-white transition-colors group">
                  <iconify-icon icon="mdi:whatsapp" className="text-sm text-gray-500 group-hover:text-white flex-shrink-0 transition-colors"></iconify-icon>
                  WhatsApp
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-3 text-sm text-gray-300 hover:text-white transition-colors group">
                  <iconify-icon icon="lucide:mail" className="text-sm text-gray-500 group-hover:text-white flex-shrink-0 transition-colors"></iconify-icon>
                  {email}
                </a>
              )}
              {endereco && (
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <iconify-icon icon="lucide:map-pin" className="text-sm text-gray-500 flex-shrink-0 mt-0.5"></iconify-icon>
                  <span>{endereco}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-6">
          <p className="text-[10px] uppercase tracking-widest text-gray-600">
            &copy; {new Date().getFullYear()} {name}. Todos os Direitos Reservados.
          </p>
        </div>

      </div>
    </footer>
  )
}
