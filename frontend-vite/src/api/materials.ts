import { apiClient } from '@/lib/api-client'
import type {
  Course,
  CreateCourseInput,
  Material,
  UpdateCourseInput,
  UploadInitInput,
  UploadInitResponse,
  ViewUrlResponse,
} from '@/types'

export const materialsApi = {
  getCourses: async (): Promise<Course[]> => {
    const response = await apiClient.get<Course[]>('/materials/courses')
    return response.data
  },

  createCourse: async (data: CreateCourseInput): Promise<Course> => {
    const response = await apiClient.post<Course>('/materials/courses', data)
    return response.data
  },

  updateCourse: async (id: number, data: UpdateCourseInput): Promise<Course> => {
    const response = await apiClient.put<Course>(`/materials/courses/${id}`, data)
    return response.data
  },

  deleteCourse: async (id: number): Promise<boolean> => {
    const response = await apiClient.delete<boolean>(`/materials/courses/${id}`)
    return response.data
  },

  getCourseMaterials: async (courseId: number): Promise<Material[]> => {
    const response = await apiClient.get<Material[]>(`/materials/courses/${courseId}/materials`)
    return response.data
  },

  getViewUrl: async (materialId: number): Promise<ViewUrlResponse> => {
    const response = await apiClient.post<ViewUrlResponse>(`/materials/${materialId}/view-url`)
    return response.data
  },

  uploadInit: async (data: UploadInitInput): Promise<UploadInitResponse> => {
    const response = await apiClient.post<UploadInitResponse>('/materials/upload/init', data)
    return response.data
  },

  uploadToR2: async (uploadUrl: string, file: File, contentType: string): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error('Не удалось загрузить файл в хранилище')
    }
  },

  uploadComplete: async (materialId: number): Promise<void> => {
    await apiClient.post(`/materials/upload/${materialId}/complete`)
  },
}
