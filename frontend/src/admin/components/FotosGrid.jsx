import { useRef, useState } from 'react'
import { uploadMediaFiles, setPrincipal, deleteFoto, reorderFotos } from '../api.js'

export default function FotosGrid({ imovelID, fotos, onChange }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [error, setError] = useState('')
  const [failedFiles, setFailedFiles] = useState([])

  async function handleUpload(e) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    setUploadProgress(null)
    setError('')
    await uploadFiles(Array.from(files))
    e.target.value = ''
  }

  async function uploadFiles(files) {
    setUploading(true)
    setUploadProgress(null)
    setError('')
    setFailedFiles([])
    try {
      const result = await uploadMediaFiles(imovelID, files, setUploadProgress, onChange)
      if (result.latest) onChange(result.latest)
      if (result.failed.length > 0) {
        setFailedFiles(result.failed)
        setError(`${result.failed.length} mídia(s) falharam. As outras foram salvas.`)
      }
    } catch (err) {
      setError(err?.message || 'Erro ao enviar mídia.')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  async function retryFailed() {
    if (failedFiles.length === 0) return
    await uploadFiles(failedFiles.map(item => item.file))
  }

  async function handlePrincipal(fotoID) {
    const updated = await setPrincipal(imovelID, fotoID).catch(() => null)
    if (updated) onChange(updated)
  }

  async function handleDelete(fotoID) {
    if (!confirm('Excluir esta foto?')) return
    const updated = await deleteFoto(imovelID, fotoID).catch(() => null)
    if (updated !== null) onChange(updated)
  }

  async function moveMedia(index, direction) {
    const target = index + direction
    if (target < 0 || target >= fotos.length) return
    const next = [...fotos]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    const ids = next.map(f => f.ID || f.id)
    const updated = await reorderFotos(imovelID, ids).catch(() => null)
    if (updated) onChange(updated)
    else setError('Erro ao salvar ordem das mídias.')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500">
          {fotos.length} mídia{fotos.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand)] hover:underline"
        >
          <iconify-icon icon={uploading ? 'lucide:loader-circle' : 'lucide:plus'} class={`text-sm ${uploading ? 'animate-spin' : ''}`}></iconify-icon>
          Adicionar mídias
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {error && <p className="text-xs font-medium text-red-500 mb-3">{error}</p>}
      {failedFiles.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-red-700">
              {failedFiles.length} falha{failedFiles.length !== 1 ? 's' : ''} no envio
            </p>
            <button
              type="button"
              onClick={retryFailed}
              disabled={uploading}
              className="text-xs font-bold text-red-700 hover:underline disabled:opacity-50"
            >
              Tentar falhas novamente
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {failedFiles.map(item => (
              <li key={item.fileName} className="truncate text-xs text-red-600">
                {item.fileName}: {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {uploading && uploadProgress && <UploadProgress value={uploadProgress} />}

      {fotos.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors"
        >
          <iconify-icon icon="lucide:images" class="text-3xl mb-2 block mx-auto"></iconify-icon>
          <span className="text-sm font-medium">Clique para adicionar mídias</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fotos.map((f, index) => {
            // Cobre qualquer formato de JSON que o Go esteja a cuspir (PascalCase ou snake_case)
            const id = f.ID || f.id;
            const isPrincipal = f.Principal || f.principal;
            const mediaType = f.MediaType || f.media_type || 'image';
            const thumbPath = f.CaminhoThumb || f.caminho_thumb || '';
            const originalPath = f.CaminhoOriginal || f.caminho_original || '';

            return (
              <div key={id} className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-video">
                {mediaType === 'video' ? (
                  <>
                    <video src={`/uploads/${originalPath}`} className="w-full h-full object-cover" muted playsInline />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-10 h-10 rounded-full bg-black/45 text-white flex items-center justify-center">
                        <iconify-icon icon="lucide:play" class="text-lg"></iconify-icon>
                      </span>
                    </div>
                  </>
                ) : (
                  <img
                    src={`/uploads/${thumbPath}`}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/400x225/eeeeee/999999?text=Falha+no+Caminho';
                    }}
                  />
                )}
                
                {isPrincipal && (
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-widest font-bold bg-[var(--color-brand)] text-white px-2 py-0.5 rounded-sm">
                    Principal
                  </span>
                )}

                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveMedia(index, -1)}
                    disabled={index === 0}
                    className="w-7 h-7 bg-white/90 text-gray-700 rounded-lg flex items-center justify-center disabled:opacity-40"
                    title="Mover para esquerda"
                  >
                    <iconify-icon icon="lucide:chevron-left" class="text-sm"></iconify-icon>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMedia(index, 1)}
                    disabled={index === fotos.length - 1}
                    className="w-7 h-7 bg-white/90 text-gray-700 rounded-lg flex items-center justify-center disabled:opacity-40"
                    title="Mover para direita"
                  >
                    <iconify-icon icon="lucide:chevron-right" class="text-sm"></iconify-icon>
                  </button>
                </div>
                
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  {!isPrincipal && (
                    <button
                      type="button"
                      onClick={() => handlePrincipal(id)}
                      className="text-[10px] uppercase tracking-widest font-bold bg-white text-[var(--color-brand)] px-3 py-1.5 rounded-lg"
                    >
                      Principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(id)}
                    className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center"
                  >
                    <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                  </button>
                </div>
              </div>
            )
          })}
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
    <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
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
