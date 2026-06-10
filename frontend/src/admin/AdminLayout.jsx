import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { logout } from './api.js'

export default function AdminLayout() {
  const { setAdmin } = useAuth()

  async function handleLogout() {
    await logout().catch(() => {})
    setAdmin(null)
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-56 bg-white shadow-sm flex flex-col">
        <div className="p-4 border-b font-bold text-gray-800">Admin</div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/admin/imoveis"
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm font-medium ${
                isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            Imóveis
          </NavLink>
          <NavLink
            to="/admin/configuracao"
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm font-medium ${
                isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            Configurações
          </NavLink>
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-500 hover:text-gray-800"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
