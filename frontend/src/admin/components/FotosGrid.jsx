import { useRef } from 'react'
import { uploadFotos, setPrincipal, deleteFoto } from '../api.js'

export default function FotosGrid({ imovelID, fotos, onChange }) {
  const fileRef = useRef(null)

  async function handleUpload(e) {
    const files = e.target.files
    if (!files?.length) return
    const fd = new FormData()
    for (const f of files) fd.append('fotos', f)
    const updated = await uploadFotos(imovelID, fd).catch(() => null)
    if (updated) onChange(updated)
    e.target.value = ''
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Fotos</h3>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700"
        >
          + Adicionar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {fotos.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhuma foto ainda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {fotos.map(f => (
            <div key={f.ID} className="relative group rounded overflow-hidden bg-gray-100 aspect-video">
              <img
                src={`/uploads/${f.CaminhoThumb}`}
                alt=""
                className="w-full h-full object-cover"
              />
              {f.Principal && (
                <span className="absolute top-1 left-1 text-xs bg-yellow-400 text-yellow-900 px-1 rounded">
                  Principal
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                {!f.Principal && (
                  <button
                    type="button"
                    onClick={() => handlePrincipal(f.ID)}
                    className="text-xs bg-white text-gray-800 px-2 py-1 rounded"
                  >
                    Principal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(f.ID)}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
