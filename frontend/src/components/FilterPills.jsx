const FINALIDADES = [
  ['', 'Todos'],
  ['venda', 'Venda'],
  ['aluguel', 'Aluguel'],
]

const TIPOS = [
  ['casa', 'Casa'],
  ['apartamento', 'Apto'],
  ['terreno', 'Terreno'],
  ['comercial', 'Comercial'],
  ['rural', 'Rural'],
]

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
        active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
      }`}
      style={active ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : {}}
    >
      {children}
    </button>
  )
}

export default function FilterPills({ filters, onChange }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-2 overflow-x-auto">
        {FINALIDADES.map(([v, l]) => (
          <Pill key={v} active={filters.finalidade === v} onClick={() => onChange('finalidade', v)}>
            {l}
          </Pill>
        ))}
        <span className="w-px h-6 bg-gray-200 self-center mx-1 flex-shrink-0" />
        {TIPOS.map(([v, l]) => (
          <Pill key={v} active={filters.tipo === v} onClick={() => onChange('tipo', v)}>
            {l}
          </Pill>
        ))}
      </div>
    </div>
  )
}
