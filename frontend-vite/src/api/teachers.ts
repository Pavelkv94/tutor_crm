import { apiClient } from '@/lib/api-client'
import type { Teacher, CreateTeacherInput, UpdateTeacherInput, SalaryDataOutputDto } from '@/types'

export const teachersApi = {
  getAll: async (filter?: 'all' | 'active' | 'deleted'): Promise<Teacher[]> => {
    const params = filter ? { filter } : {}
    const response = await apiClient.get<Teacher[]>('/teachers', { params })
    return response.data
  },
  create: async (data: CreateTeacherInput): Promise<Teacher> => {
    const response = await apiClient.post<Teacher>('/teachers', data)
    return response.data
  },
  update: async (id: number, data: UpdateTeacherInput): Promise<void> => {
    await apiClient.patch(`/teachers/${id}`, data)
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/teachers/${id}`)
  },
	getDataForSalary: async (startDate: string, endDate: string, teacherId: number): Promise<SalaryDataOutputDto> => {
		const response = await apiClient.get<SalaryDataOutputDto>(`/reports/salary`, {
			params: {
				start_date: startDate,
				end_date: endDate,
				teacher_id: teacherId.toString(),
			},
		})
		return response.data
	},
}

