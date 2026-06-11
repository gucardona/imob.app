import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, getMe } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { getConfiguracao } from '../../api.js'

export default function Login() {
  const { admin, setAdmin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cfg, setCfg] = useState(null)

  useEffect(() => {
    if (admin) navigate('/admin/imoveis', { replace: true })
  }, [admin, navigate])

  useEffect(() => {
    getConfiguracao().then(data => setCfg(data))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, senha)
      const me = await getMe()
      setAdmin(me)
      navigate('/admin/imoveis', { replace: true })
    } catch (err) {
      setError(err.status === 401 ? 'Credenciais inválidas.' : 'Erro ao fazer login.')
    } finally {
      setLoading(false)
    }
  }

  if (admin === undefined) return null

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          {cfg?.LogoPath ? (
            <img src={`/uploads/${cfg.LogoPath}`} alt={cfg.NomeImobiliaria || 'Logo'} className="h-10 w-auto object-contain" />
          ) : (
            <>
              <div className="w-8 h-8 bg-[var(--color-brand)] flex items-center justify-center rounded-sm">
                <iconify-icon icon="lucide:layout-dashboard" class="text-white text-base"></iconify-icon>
              </div>
              <span className="text-xl font-bold tracking-tight uppercase">
                {cfg?.NomeImobiliaria || 'Admin'}
              </span>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl p-8 custom-shadow border border-gray-100">
          <h1 className="text-2xl font-bold tracking-tight mb-6">Entrar</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
