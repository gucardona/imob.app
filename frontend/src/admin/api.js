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

export async function uploadMediaFiles(imovelID, files, onProgress, onBatchUpdate) {
  let latest = null
  const totalFiles = files.length
  const failed = []
  for (let i = 0; i < totalFiles; i++) {
    const raw = files[i]
    try {
      reportUploadProgress(onProgress, {
        phase: 'preparing',
        fileIndex: i + 1,
        totalFiles,
        fileName: raw.name,
        percent: 0,
      })
      const file = await prepareMediaFile(raw)
      const fd = new FormData()
      fd.append('midias', file)
      latest = await uploadFotosWithProgress(imovelID, fd, progress => {
        reportUploadProgress(onProgress, {
          phase: progress.percent >= 100 ? 'processing' : 'uploading',
          fileIndex: i + 1,
          totalFiles,
          fileName: raw.name,
          percent: progress.percent,
        })
      })
      onBatchUpdate?.(latest)
      reportUploadProgress(onProgress, {
        phase: 'done',
        fileIndex: i + 1,
        totalFiles,
        fileName: raw.name,
        percent: 100,
      })
    } catch (err) {
      failed.push({
        file: raw,
        fileName: raw.name,
        message: err?.message || 'Erro ao enviar mídia.',
      })
      reportUploadProgress(onProgress, {
        phase: 'failed',
        fileIndex: i + 1,
        totalFiles,
        fileName: raw.name,
        percent: 100,
      })
    }
  }
  reportUploadProgress(onProgress, {
    phase: 'done',
    fileIndex: totalFiles,
    totalFiles,
    fileName: '',
    percent: 100,
  })
  return { latest, failed }
}

function uploadFotosWithProgress(imovelID, formData, onUploadProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/admin/imoveis/${imovelID}/fotos`)
    xhr.upload.onprogress = event => {
      if (!event.lengthComputable) return
      onUploadProgress?.({ percent: Math.round((event.loaded / event.total) * 100) })
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const ct = xhr.getResponseHeader('Content-Type') ?? ''
        resolve(ct.includes('application/json') ? JSON.parse(xhr.responseText) : null)
        return
      }
      if (xhr.status === 401) {
        window.location.replace('/admin/login')
        return
      }
      reject(new Error(readAPIError(xhr)))
    }
    xhr.onerror = () => reject(new Error('Falha de rede durante envio.'))
    xhr.send(formData)
  })
}

function readAPIError(xhr) {
  try {
    const data = JSON.parse(xhr.responseText)
    if (data?.error) return mediaErrorMessage(data.error)
  } catch {}
  return `Erro ${xhr.status} ao enviar mídia.`
}

function mediaErrorMessage(message) {
  const known = {
    'bad image': 'Imagem inválida ou formato não suportado. Use JPG, PNG ou WebP.',
    'bad video': 'Vídeo inválido ou formato não suportado. Use MP4, WebM ou MOV.',
    'image too large': 'Imagem muito grande. Reduza a resolução e tente novamente.',
    'video too large': 'Vídeo muito grande. Limite: 90 MB.',
    'files too large': 'Arquivo muito grande para envio.',
    'unsupported media type': 'Formato não suportado. Use JPG, PNG, WebP, MP4, WebM ou MOV.',
  }
  return known[message] || message
}

function reportUploadProgress(onProgress, progress) {
  if (!onProgress) return
  const { fileIndex, totalFiles, percent } = progress
  const completedBefore = Math.max(0, fileIndex - 1)
  const overallPercent = totalFiles > 0
    ? Math.round(((completedBefore + percent / 100) / totalFiles) * 100)
    : percent
  onProgress({ ...progress, overallPercent })
}

async function prepareMediaFile(file) {
  if (file.type.startsWith('video/')) {
    if (file.size > 90 * 1024 * 1024) throw new Error('Vídeo muito grande. Limite: 90 MB.')
    return file
  }
  if (!file.type.startsWith('image/')) throw new Error('Formato não suportado. Use JPG, PNG, WebP, MP4, WebM ou MOV.')
  return compressImage(file)
}

async function compressImage(file) {
  const img = await loadImage(file)
  const maxEdge = 1280
  const scale = Math.min(maxEdge / img.naturalWidth, maxEdge / img.naturalHeight, 1)
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  if (scale === 1 && file.size <= 2 * 1024 * 1024 && file.type === 'image/jpeg') {
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Falha ao comprimir imagem.')), 'image/jpeg', 0.72)
  })
  const name = file.name.replace(/\.[^.]+$/, '') || 'imagem'
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Imagem inválida ou formato não suportado. Use JPG, PNG ou WebP.'))
    }
    img.src = url
  })
}

export function setPrincipal(imovelID, fotoID) {
  return apiFetch(`/api/admin/imoveis/${imovelID}/fotos/${fotoID}/principal`, {
    method: 'POST',
  })
}

export function reorderFotos(imovelID, ids) {
  return apiFetch(`/api/admin/imoveis/${imovelID}/fotos/ordem`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
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
