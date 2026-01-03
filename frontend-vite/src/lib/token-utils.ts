import { jwtDecode } from 'jwt-decode'
import type { JwtPayload } from '@/types'

const ACCESS_TOKEN_KEY = 'accessToken'

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export const setAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export const removeAccessToken = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export const decodeToken = (token: string): JwtPayload => {
  return jwtDecode<JwtPayload>(token)
}

export const getTokenPayload = (): JwtPayload | null => {
  const token = getAccessToken()
  if (!token) return null
  try {
    return decodeToken(token)
  } catch {
    return null
  }
}

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token)
    if (!decoded.exp) return true
    return Date.now() >= decoded.exp * 1000
  } catch {
    return true
  }
}

