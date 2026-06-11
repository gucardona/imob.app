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
      className={`px-5 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
        active
          ? 'bg-[var(--color-brand)] text-white'
          : 'bg-[#F5F5F5] text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

export default function FilterPills({ filters, onChange }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-20 z-40">
      <div className="max-w-7xl mx-auto px-8 lg:px-16 py-4 flex flex-wrap gap-3 overflow-x-auto">
        {FINALIDADES.map(([v, l]) => (
          <Pill key={v} active={filters.finalidade === v} onClick={() => onChange('finalidade', v)}>{l}</Pill>
        ))}
        <span className="w-px bg-gray-200 self-stretch mx-1 flex-shrink-0" />
        {TIPOS.map(([v, l]) => (
          <Pill key={v} active={filters.tipo === v} onClick={() => onChange('tipo', v)}>{l}</Pill>
        ))}
      </div>
    </div>
  )
}
