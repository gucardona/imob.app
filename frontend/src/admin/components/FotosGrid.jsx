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
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500">
          {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand)] hover:underline"
        >
          <iconify-icon icon="lucide:plus" class="text-sm"></iconify-icon>
          Adicionar fotos
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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors"
        >
          <iconify-icon icon="lucide:image-plus" class="text-3xl mb-2 block mx-auto"></iconify-icon>
          <span className="text-sm font-medium">Clique para adicionar fotos</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fotos.map(f => {
            // Cobre qualquer formato de JSON que o Go esteja a cuspir (PascalCase ou snake_case)
            const id = f.ID || f.id;
            const isPrincipal = f.Principal || f.principal;
            const thumbPath = f.CaminhoThumb || f.caminho_thumb || '';

            return (
              <div key={id} className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-video">
                <img
                  src={`/uploads/${thumbPath}`}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("❌ O navegador tentou carregar esta imagem mas falhou:", e.target.src, f);
                    // Coloca uma imagem cinza para o layout não ficar feio enquanto você resolve
                    e.target.src = 'https://placehold.co/400x225/eeeeee/999999?text=Falha+no+Caminho';
                  }}
                />
                
                {isPrincipal && (
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-widest font-bold bg-[var(--color-brand)] text-white px-2 py-0.5 rounded-sm">
                    Principal
                  </span>
                )}
                
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
