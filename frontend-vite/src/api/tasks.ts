import { apiClient } from '@/lib/api-client'
import type {
  CreateTaskInput,
  Task,
  TasksPendingCount,
  TeacherTasksSummary,
  UpdateTaskInput,
} from '@/types'

export const tasksApi = {
  getTeachersWithTaskCounts: async (): Promise<TeacherTasksSummary[]> => {
    const response = await apiClient.get<TeacherTasksSummary[]>('/tasks/teachers')
    return response.data
  },

  getMyTasks: async (): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/tasks/my')
    return response.data
  },

  getPendingCount: async (): Promise<TasksPendingCount> => {
    const response = await apiClient.get<TasksPendingCount>('/tasks/pending-count')
    return response.data
  },

  getByTeacher: async (teacherId: number): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>(`/tasks/teachers/${teacherId}`)
    return response.data
  },

  getById: async (id: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/tasks/${id}`)
    return response.data
  },

  create: async (data: CreateTaskInput): Promise<Task> => {
    const response = await apiClient.post<Task>('/tasks', data)
    return response.data
  },

  update: async (id: string, data: UpdateTaskInput): Promise<Task> => {
    const response = await apiClient.patch<Task>(`/tasks/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },
}
