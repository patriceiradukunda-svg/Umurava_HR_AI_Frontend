'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Cookies from 'js-cookie'
import { authAPI } from '@/lib/api'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'recruiter' | 'admin' | 'applicant'
  department?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; role: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; role: string }>
  logout: () => void
  isHR: boolean
  isApplicant: boolean
}

interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  role?: string
  department?: string
  organization?: string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = Cookies.get('token')
    const savedUser  = Cookies.get('user')
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res  = await authAPI.login({ email, password })
    const { token: t, user: u } = res.data
    Cookies.set('token', t, { expires: 7 })
    Cookies.set('user',  JSON.stringify(u), { expires: 7 })
    setToken(t)
    setUser(u)
    return { success: true, role: u.role }
  }

  const register = async (data: RegisterData) => {
    const res  = await authAPI.register(data)
    const { token: t, user: u } = res.data
    Cookies.set('token', t, { expires: 7 })
    Cookies.set('user',  JSON.stringify(u), { expires: 7 })
    setToken(t)
    setUser(u)
    return { success: true, role: u.role }
  }

  const logout = () => {
    Cookies.remove('token')
    Cookies.remove('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout,
      isHR:        user?.role === 'recruiter' || user?.role === 'admin',
      isApplicant: user?.role === 'applicant',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
