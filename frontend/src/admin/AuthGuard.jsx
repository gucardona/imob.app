import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function AuthGuard({ children }) {
  const { admin } = useAuth()

  if (admin === undefined) return null // loading
  if (admin === null) return <Navigate to="/admin/login" replace />

  return children
}
