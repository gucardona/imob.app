import { createContext, useContext, useEffect, useState } from 'react'
import { getMe } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(undefined) // undefined = loading

  useEffect(() => {
    getMe()
      .then(setAdmin)
      .catch(() => setAdmin(null))
  }, [])

  return (
    <AuthContext.Provider value={{ admin, setAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
