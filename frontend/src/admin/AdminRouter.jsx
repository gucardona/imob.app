import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './AuthContext.jsx'
import AuthGuard from './AuthGuard.jsx'
import AdminLayout from './AdminLayout.jsx'
import Login from './pages/Login.jsx'
import ImoveisList from './pages/ImoveisList.jsx'
import ImovelForm from './pages/ImovelForm.jsx'
import Configuracao from './pages/Configuracao.jsx'

export default function AdminRouter() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          element={
            <AuthGuard>
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="imoveis" replace />} />
          <Route path="imoveis" element={<ImoveisList />} />
          <Route path="imoveis/novo" element={<ImovelForm />} />
          <Route path="imoveis/:id/editar" element={<ImovelForm />} />
          <Route path="configuracao" element={<Configuracao />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
