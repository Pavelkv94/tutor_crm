import { apiClient } from '@/lib/api-client'

export interface TelegramLinkInput {
  teacher_id: number | null
  student_id: number | null
}

export interface TelegramLinkOutput {
  link: string
}

export interface SendLessonsCostInput {
  student_id: number
  start_date: string
  end_date: string
}

export const telegramApi = {
  generateTelegramLink: async (data: TelegramLinkInput): Promise<TelegramLinkOutput> => {
    const response = await apiClient.post<TelegramLinkOutput>('/telegram/generate-telegram-link', data)
    return response.data
  },
  sendLessonsCostToAdmin: async (data: SendLessonsCostInput): Promise<void> => {
    await apiClient.post('/telegram/send-lessons-cost-to-admin', data)
  },
}

