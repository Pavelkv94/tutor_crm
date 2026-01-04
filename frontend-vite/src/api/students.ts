import { apiClient } from '@/lib/api-client'
import type { Student, StudentExtended, CreateStudentInput, UpdateStudentInput } from '@/types'

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
  update: async (id: number, data: UpdateStudentInput): Promise<void> => {
    await apiClient.patch(`/students/${id}`, data)
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/students/${id}`)
  },
  downloadStudents: async (
    filter: 'all' | 'active' | 'deleted',
    teacherId?: string
  ): Promise<void> => {
    const params: Record<string, string> = {
      filter,
    }
    if (teacherId) {
      params.teacher_id = teacherId
    }
    const response = await apiClient.get('/reports/students/download', {
      params,
      responseType: 'blob',
    })
    
    // Create a blob URL and trigger download
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition']
    let fileName = `students_${filter}.xlsx`
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i)
      if (fileNameMatch) {
        fileName = decodeURIComponent(fileNameMatch[1])
      }
    }
    
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}

