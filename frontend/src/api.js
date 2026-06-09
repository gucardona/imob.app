export async function getConfiguracao() {
  try {
    const res = await fetch('/api/configuracao')
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

export async function getImoveis(filter = {}) {
  try {
    const params = new URLSearchParams()
    if (filter.finalidade) params.set('finalidade', filter.finalidade)
    if (filter.tipo) params.set('tipo', filter.tipo)
    if (filter.cidade) params.set('cidade', filter.cidade)
    if (filter.destaque) params.set('destaque', '1')
    const res = await fetch(`/api/imoveis?${params}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function getImovel(slug) {
  try {
    const res = await fetch(`/api/imoveis/${slug}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
