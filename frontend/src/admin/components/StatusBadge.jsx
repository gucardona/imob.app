const colors = {
  disponivel: 'bg-green-100 text-green-800',
  vendido: 'bg-gray-100 text-gray-600',
  alugado: 'bg-blue-100 text-blue-800',
  inativo: 'bg-red-100 text-red-700',
}

const labels = {
  disponivel: 'Disponível',
  vendido: 'Vendido',
  alugado: 'Alugado',
  inativo: 'Inativo',
}

export default function StatusBadge({ status }) {
  const cls = colors[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {labels[status] ?? status}
    </span>
  )
}
