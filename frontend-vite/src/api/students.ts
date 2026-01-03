import { apiClient } from '@/lib/api-client'
import type { Student, StudentExtended, CreateStudentInput } from '@/types'

export const studentsApi = {
  getAll: async (teacherId?: string, filter?: 'all' | 'active' | 'deleted'): Promise<Student[]> => {
    const params: Record<string, string> = {}
    if (teacherId) {
      params.teacher_id = teacherId
    }
    if (filter) {
      params.filter = filter
    }
    const response = await apiClient.get<Student[]>('/students', { params })
    return response.data
  },
  getById: async (id: number): Promise<StudentExtended> => {
    const response = await apiClient.get<StudentExtended>(`/students/${id}`)
    return response.data
  },
  create: async (data: CreateStudentInput): Promise<Student> => {
    const response = await apiClient.post<Student>('/students', data)
    return response.data
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/students/${id}`)
  },
}

