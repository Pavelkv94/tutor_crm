import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTokenPayload, setAccessToken, removeAccessToken } from '@/lib/token-utils'
import { authApi } from '@/api/auth'
import type { JwtPayload, LoginInput } from '@/types'

interface AuthContextType {
  user: JwtPayload | null
  isLoading: boolean
  login: (credentials: LoginInput) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const initAuth = () => {
      const payload = getTokenPayload()
      if (payload) {
        setUser(payload)
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const login = async (credentials: LoginInput) => {
    try {
      const response = await authApi.login(credentials)
      setAccessToken(response.accessToken)
      const payload = getTokenPayload()
      if (payload) {
        setUser(payload)
        navigate('/students')
      }
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    removeAccessToken()
    setUser(null)
    navigate('/login')
  }

  const isAuthenticated = !!user
  const isAdmin = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

