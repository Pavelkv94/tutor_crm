import { apiClient } from '@/lib/api-client'
import type { LoginInput, LoginOutput } from '@/types'

export const authApi = {
  login: async (credentials: LoginInput): Promise<LoginOutput> => {
    const response = await apiClient.post<LoginOutput>('/auth/login', credentials)
    return response.data
  },
  refreshToken: async (): Promise<LoginOutput> => {
    const response = await apiClient.post<LoginOutput>('/auth/refresh-token', {})
    return response.data
  },
}

