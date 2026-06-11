const DEFAULT_MSG_PADRAO = 'Olá! Vim pelo site e gostaria de receber ajuda para encontrar um imóvel. Poderia me auxiliar?'
const DEFAULT_MSG_IMOVEL = 'Olá! Vim pelo site e gostaria de receber mais informações sobre este imóvel.\n\nImóvel: {property_title}\nCódigo: {property_code}\nLink: {property_url}'

export function buildWhatsappURL(number, template, vars = {}) {
  if (!number) return null
  let msg = template || DEFAULT_MSG_PADRAO
  for (const [key, val] of Object.entries(vars)) {
    msg = msg.replaceAll(`{${key}}`, val ?? '')
  }
  const num = number.replace(/\D/g, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

export function getWAGenericURL(cfg) {
  return buildWhatsappURL(
    cfg?.Whatsapp,
    cfg?.MsgWhatsappPadrao || DEFAULT_MSG_PADRAO,
  )
}

export function getWAImovelURL(cfg, imovel) {
  const template = cfg?.MsgWhatsappImovel || DEFAULT_MSG_IMOVEL
  return buildWhatsappURL(cfg?.Whatsapp, template, {
    property_title: imovel?.Titulo ?? '',
    property_code: imovel?.Slug ?? '',
    property_url: typeof window !== 'undefined' ? window.location.href : '',
  })
}

export function formatPrice(preco, finalidade) {
  const formatted = Number(preco).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return finalidade === 'aluguel' ? `R$ ${formatted}/mês` : `R$ ${formatted}`
}

export function photoURL(path) {
  if (!path) return null
  return `/uploads/${path}`
}

export function darkenHex(hex, pct) {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  l = Math.max(0, l - pct / 100)
  let r2, g2, b2
  if (s === 0) {
    r2 = g2 = b2 = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r2 = hue2rgb(p, q, h + 1 / 3)
    g2 = hue2rgb(p, q, h)
    b2 = hue2rgb(p, q, h - 1 / 3)
  }
  return '#' + [r2, g2, b2].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

export function setTheme(cfg) {
  const brand = cfg?.CorPrimaria || '#8B1538'
  document.documentElement.style.setProperty('--color-brand', brand)
  document.documentElement.style.setProperty('--color-brand-dark', darkenHex(brand, 12))
  const r = parseInt(brand.slice(1, 3), 16)
  const g = parseInt(brand.slice(3, 5), 16)
  const b = parseInt(brand.slice(5, 7), 16)
  document.documentElement.style.setProperty('--color-brand-light', `rgba(${r}, ${g}, ${b}, 0.1)`)
  document.documentElement.style.setProperty('--color-secondary', cfg?.CorSecundaria || '#1A1A1A')
}
