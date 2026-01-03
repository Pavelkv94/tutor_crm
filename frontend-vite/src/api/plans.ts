import { apiClient } from '@/lib/api-client'
import type { Plan, CreatePlanInput } from '@/types'

export const plansApi = {
  getAll: async (filter?: 'all' | 'active' | 'deleted'): Promise<Plan[]> => {
    const params = filter ? { filter } : {}
    const response = await apiClient.get<Plan[]>('/plans', { params })
    return response.data
  },
  create: async (data: CreatePlanInput): Promise<Plan> => {
    const response = await apiClient.post<Plan>('/plans', data)
    return response.data
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/plans/${id}`)
  },
}

