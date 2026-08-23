import { apiClient } from '@/lib/api-client'
import type { SchoolSettings, UpdateSchoolSettingsInput } from '@/types'

export const settingsApi = {
  get: async (): Promise<SchoolSettings> => {
    const response = await apiClient.get<SchoolSettings>('/settings')
    return response.data
  },
  update: async (data: UpdateSchoolSettingsInput): Promise<SchoolSettings> => {
    const response = await apiClient.patch<SchoolSettings>('/settings', data)
    return response.data
  },
}
