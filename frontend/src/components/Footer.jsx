export default function Footer({ cfg }) {
  const name = cfg?.NomeImobiliaria || 'Imóveis'
  const initial = name.charAt(0).toUpperCase()

  return (
    <footer className="bg-warm-900 text-warm-400 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: 'var(--color-brand)' }}
            >
              <span className="text-white font-bold text-sm tracking-tight">{initial}</span>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">{name}</span>
          </div>
          <p className="text-sm leading-relaxed text-warm-500 max-w-xs">
            Encontramos o imóvel ideal para você com rapidez, segurança e transparência.
          </p>
        </div>
        <div>
          <p className="text-white font-semibold mb-4 text-xs uppercase tracking-widest">Contato</p>
          {cfg?.Telefone && <p className="text-sm mb-1.5">{cfg.Telefone}</p>}
          {cfg?.Email && (
            <p className="text-sm mb-1.5">
              <a href={`mailto:${cfg.Email}`} className="hover:text-white transition-colors">
                {cfg.Email}
              </a>
            </p>
          )}
          {cfg?.Endereco && <p className="text-sm text-warm-500">{cfg.Endereco}</p>}
        </div>
        <div>
          <p className="text-white font-semibold mb-4 text-xs uppercase tracking-widest">Imóveis</p>
          <p className="text-sm mb-1.5">
            <a href="/imoveis?finalidade=venda" className="hover:text-white transition-colors">À Venda</a>
          </p>
          <p className="text-sm mb-1.5">
            <a href="/imoveis?finalidade=aluguel" className="hover:text-white transition-colors">Para Alugar</a>
          </p>
          <p className="text-sm">
            <a href="/imoveis?tipo=comercial" className="hover:text-white transition-colors">Comercial</a>
          </p>
        </div>
      </div>
      <div className="border-t border-warm-800 py-5 text-center text-xs text-warm-600 tracking-wide">
        © {new Date().getFullYear()} {name}. Todos os direitos reservados.
      </div>
    </footer>
  )
}
