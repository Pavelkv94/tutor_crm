import type { TaskStatus } from '@/types'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  IN_PROGRESS: 'В работе',
  ON_APPROVAL: 'На проверку',
  COMPLETED: 'Выполнена',
}

export const TASK_STATUS_BORDER_CLASS: Record<TaskStatus, string> = {
  IN_PROGRESS: 'border-l-4 border-l-green-500',
  ON_APPROVAL: 'border-l-4 border-l-blue-500',
  COMPLETED: '',
}

export const TASK_COLORS = [
  'bg-yellow-200',
  'bg-pink-200',
  'bg-green-200',
  'bg-blue-200',
  'bg-orange-200',
  'bg-purple-200',
] as const

export type TaskColorClass = (typeof TASK_COLORS)[number]

export const getTaskColorClass = (color: string): TaskColorClass => {
  switch (color) {
    case 'bg-yellow-200':
      return 'bg-yellow-200'
    case 'bg-pink-200':
      return 'bg-pink-200'
    case 'bg-green-200':
      return 'bg-green-200'
    case 'bg-blue-200':
      return 'bg-blue-200'
    case 'bg-orange-200':
      return 'bg-orange-200'
    case 'bg-purple-200':
      return 'bg-purple-200'
    default:
      return 'bg-yellow-200'
  }
}

export const formatTaskDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const formatTaskDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
