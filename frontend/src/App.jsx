import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect } from 'react'
import { getConfiguracao } from './api'
import { setTheme } from './utils'
import Home from './pages/Home'
import List from './pages/List'
import Detail from './pages/Detail'
import PublicSkeleton from './components/PublicSkeleton'

const AdminApp = lazy(() => import('./admin/AdminRouter'))

// Apply theme from server-injected config before first React render
if (window.__CFG__) setTheme(window.__CFG__)

export default function App() {
  const [cfg, setCfg] = useState(window.__CFG__ ?? null)
  const [cfgReady, setCfgReady] = useState(false)

  useEffect(() => {
    getConfiguracao()
      .then(data => {
        setCfg(data)
        setTheme(data)
        document.title = data?.NomeImobiliaria || 'Imóveis'
        if (data?.LogoPath) {
          let link = document.querySelector("link[rel~='icon']")
          if (!link) {
            link = document.createElement('link')
            link.rel = 'icon'
            document.head.appendChild(link)
          }
          link.type = 'image/png'
          link.href = `/uploads/${data.LogoPath}`
        }
      })
      .finally(() => setCfgReady(true))
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={cfgReady ? <Home cfg={cfg} /> : <PublicSkeleton />} />
        <Route path="/imoveis" element={cfgReady ? <List cfg={cfg} /> : <PublicSkeleton />} />
        <Route path="/imoveis/:slug" element={cfgReady ? <Detail cfg={cfg} /> : <PublicSkeleton />} />
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
