import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect } from 'react'
import { getConfiguracao } from './api'
import { setTheme } from './utils'
import Home from './pages/Home'
import List from './pages/List'
import Detail from './pages/Detail'

const AdminApp = lazy(() => import('./admin/AdminRouter'))

export default function App() {
  const [cfg, setCfg] = useState(null)

  useEffect(() => {
    getConfiguracao().then(data => {
      setCfg(data)
      setTheme(data)
    })
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home cfg={cfg} />} />
        <Route path="/imoveis" element={<List cfg={cfg} />} />
        <Route path="/imoveis/:slug" element={<Detail cfg={cfg} />} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <p className="text-gray-500 mb-6">Página não encontrada.</p>
        <a href="/" className="font-medium hover:underline" style={{ color: 'var(--color-brand)' }}>
          Voltar ao início
        </a>
      </div>
    </div>
  )
}
