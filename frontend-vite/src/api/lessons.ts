import { apiClient } from '@/lib/api-client'
import type { Lesson, RegularLessonsInput, SingleLessonInput, CancelLessonInput } from '@/types'

export const lessonsApi = {
  getLessonsForPeriod: async (
    startDate: string,
    endDate: string,
    teacherId?: string
  ): Promise<Lesson[]> => {
    const params: Record<string, string> = {
      start_date: startDate,
      end_date: endDate,
    }
    if (teacherId) {
      params.teacher_id = teacherId
    }
    const response = await apiClient.get<Lesson[]>('/lessons', { params })
    return response.data
  },
  createRegularLessons: async (
    studentId: number,
    data: RegularLessonsInput
  ): Promise<void> => {
    await apiClient.post(`/lessons/regular/${studentId}`, data)
  },
  getLessonsByDate: async (
    date: string,
    teacherId?: string,
    isAdmin: boolean = false
  ): Promise<Lesson[]> => {
    // Always use /lessons/assigned endpoint
    const params: Record<string, string> = {
      start_date: date,
    }
    // For admin, add teacher_id parameter if specified
    if (isAdmin && teacherId) {
      params.teacher_id = teacherId
    }
    const response = await apiClient.get<Lesson[]>('/lessons/assigned', { params })
    return response.data
  },
  createSingleLesson: async (data: SingleLessonInput): Promise<Lesson> => {
    const response = await apiClient.post<Lesson>('/lessons/single', data)
    return response.data
  },
  changeTeacher: async (lessonId: number, teacherId: number): Promise<void> => {
    await apiClient.patch(`/lessons/${lessonId}/teacher`, { teacher_id: teacherId })
  },
  cancelLesson: async (lessonId: number, data: CancelLessonInput): Promise<void> => {
    // Map frontend structure to backend structure
    let status: 'MISSED' | 'RESCHEDULED' | 'CANCELLED'
    
    if (data.rescheduled) {
      status = 'RESCHEDULED'
    } else if (data.missed) {
      status = 'MISSED'
    } else if (data.fullCancel) {
      status = 'CANCELLED'
    } else {
      throw new Error('Необходимо выбрать тип отмены занятия')
    }
    
    const cancelData: { comment?: string; status: 'MISSED' | 'RESCHEDULED' | 'CANCELLED' } = {
      status,
    }
    
    // Only include comment if it's not empty
    if (data.comment && data.comment.trim()) {
      cancelData.comment = data.comment.trim()
    }
    
    await apiClient.patch(`/lessons/${lessonId}/cancel`, cancelData)
  },
}

