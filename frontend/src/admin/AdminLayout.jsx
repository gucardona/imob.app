import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { logout } from './api.js'

export default function AdminLayout() {
  const { setAdmin } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await logout().catch(() => {})
    setAdmin(null)
  }

  const linkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-[#8B1538]' : 'text-gray-500 hover:text-[#8B1538]'
    }`

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <nav className="fixed top-0 left-0 w-full h-16 bg-white z-50 border-b border-gray-100 px-6 lg:px-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/admin/imoveis" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#8B1538] flex items-center justify-center rounded-sm">
              <iconify-icon icon="lucide:layout-dashboard" class="text-white text-sm"></iconify-icon>
            </div>
            <span className="text-base font-bold tracking-tight uppercase">Admin</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/admin/imoveis" className={linkCls}>Imóveis</NavLink>
            <NavLink to="/admin/configuracao" className={linkCls}>Configurações</NavLink>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="hidden md:block text-sm text-gray-400 hover:text-[#8B1538] transition-colors"
          >
            Sair
          </button>
          <button
            className="md:hidden p-2 text-gray-400 hover:text-[#8B1538] transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            <iconify-icon icon={menuOpen ? 'lucide:x' : 'lucide:menu'} class="text-xl"></iconify-icon>
          </button>
        </div>

        {menuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white border-b border-gray-100 px-6 py-5 flex flex-col gap-4 md:hidden shadow-sm">
            <NavLink to="/admin/imoveis" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#8B1538]">Imóveis</NavLink>
            <NavLink to="/admin/configuracao" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#8B1538]">Configurações</NavLink>
            <button onClick={handleLogout} className="text-left text-sm text-gray-400 hover:text-[#8B1538]">Sair</button>
          </div>
        )}
      </nav>

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
