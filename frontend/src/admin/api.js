async function apiFetch(path, options = {}) {
  const res = await fetch(path, options)
  if (!res.ok) {
    if (res.status === 401 && path !== '/api/admin/login' && path !== '/api/admin/me') {
      window.location.replace('/admin/login')
      return
    }
    const err = new Error(`${res.status}`)
    err.status = res.status
    throw err
  }
  const ct = res.headers.get('Content-Type') ?? ''
  if (ct.includes('application/json')) return res.json()
  return null
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function getMe() {
  return apiFetch('/api/admin/me')
}

export function login(email, senha) {
  return apiFetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  })
}

export function logout() {
  return apiFetch('/api/admin/logout', { method: 'POST' })
}

// ── Imóveis ───────────────────────────────────────────────────────────────────

export function listImoveis() {
  return apiFetch('/api/admin/imoveis')
}

export function getImovel(id) {
  return apiFetch(`/api/admin/imoveis/${id}`)
}

export function createImovel(body) {
  return apiFetch('/api/admin/imoveis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function updateImovel(id, body) {
  return apiFetch(`/api/admin/imoveis/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function deleteImovel(id) {
  return apiFetch(`/api/admin/imoveis/${id}`, { method: 'DELETE' })
}

export function toggleDestaque(id) {
  return apiFetch(`/api/admin/imoveis/${id}/destaque`, { method: 'POST' })
}

// ── Fotos ─────────────────────────────────────────────────────────────────────

export function uploadFotos(imovelID, formData) {
  return apiFetch(`/api/admin/imoveis/${imovelID}/fotos`, {
    method: 'POST',
    body: formData,
  })
}

export function setPrincipal(imovelID, fotoID) {
  return apiFetch(`/api/admin/imoveis/${imovelID}/fotos/${fotoID}/principal`, {
    method: 'POST',
  })
}

export function deleteFoto(imovelID, fotoID) {
  return apiFetch(`/api/admin/imoveis/${imovelID}/fotos/${fotoID}`, {
    method: 'DELETE',
  })
}

// ── Configuração ──────────────────────────────────────────────────────────────

export function getConfig() {
  return apiFetch('/api/admin/configuracao')
}

export function updateConfig(formData) {
  return apiFetch('/api/admin/configuracao', {
    method: 'PUT',
    body: formData,
  })
}

export function resetBranding() {
  return apiFetch('/api/admin/configuracao/reset-branding', { method: 'POST' })
}

export function removeLogo() {
  return apiFetch('/api/admin/configuracao/remove-logo', { method: 'POST' })
}

export function uploadHeroImage(formData) {
  return apiFetch('/api/admin/configuracao/hero-image', {
    method: 'POST',
    body: formData,
  })
}

export function removeHeroImage() {
  return apiFetch('/api/admin/configuracao/remove-hero-image', { method: 'POST' })
}
