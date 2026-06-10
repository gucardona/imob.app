export default function Footer({ cfg }) {
  const name = cfg?.NomeImobiliaria || 'Imóveis'
  const instagramURL = cfg?.InstagramURL

  return (
    <footer className="bg-[#1A1A1A] text-white pt-24 pb-12 px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
        {/* Brand */}
        <div className="col-span-1">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-6 h-6 bg-[#8B1538] flex items-center justify-center rounded-sm">
              <iconify-icon icon="lucide:home" className="text-white text-sm"></iconify-icon>
            </div>
            <span className="text-lg font-bold tracking-tight uppercase">{name}</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            {cfg?.TextoSobre || 'Encontramos o imóvel ideal para você com rapidez, segurança e transparência.'}
          </p>
          <div className="flex gap-4">
            <a
              href={instagramURL || '#'}
              target={instagramURL ? '_blank' : undefined}
              rel="noreferrer"
              className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all"
            >
              <iconify-icon icon="lucide:instagram"></iconify-icon>
            </a>
            <a href="#" className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all">
              <iconify-icon icon="lucide:twitter"></iconify-icon>
            </a>
            <a href="#" className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all">
              <iconify-icon icon="lucide:linkedin"></iconify-icon>
            </a>
          </div>
        </div>

        {/* A Empresa */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">A Empresa</h4>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Sobre Nós</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Corretores</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Imprensa</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Carreiras</a>
        </div>

        {/* Serviços */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">Serviços</h4>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Avaliação de Imóvel</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Gestão de Imóveis</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Assessoria Jurídica</a>
          <a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Investimentos</a>
        </div>

        {/* Newsletter */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">Newsletter</h4>
          <p className="text-sm text-gray-400 mb-4">Receba imóveis selecionados e tendências do mercado.</p>
          <div className="relative">
            <input
              type="email"
              placeholder="Seu e-mail"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#8B1538] transition-colors text-white placeholder-gray-500"
            />
            <button className="absolute right-2 top-2 w-8 h-8 bg-[#8B1538] rounded-md flex items-center justify-center">
              <iconify-icon icon="lucide:chevron-right" className="text-white"></iconify-icon>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">
          &copy; {new Date().getFullYear()} {name}. Todos os Direitos Reservados.
        </p>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a href="#" className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Privacidade</a>
          <a href="#" className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Termos</a>
          <a href="#" className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Cookies</a>
        </div>
      </div>
    </footer>
  )
}
