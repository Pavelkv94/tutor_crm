import { useQueries, useQuery } from '@tanstack/react-query'
import { teachersApi } from '@/api/teachers'
import { studentsApi } from '@/api/students'
import type { Student } from '@/types'

interface StudentsDirectory {
  students: Student[]
  isLoading: boolean
}

/**
 * Список всех учеников школы для фильтров.
 *
 * Отдельного эндпоинта «все ученики» на бэкенде нет: GET /students всегда скоупится по
 * преподавателю. Поэтому собираем список из активных преподавателей — запросы кэшируются
 * теми же ключами, что и страница «Ученики».
 */
export const useStudentsDirectory = (enabled = true): StudentsDirectory => {
  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled,
  })

  const studentQueries = useQueries({
    queries: teachers.map((teacher) => ({
      queryKey: ['students', teacher.id.toString(), 'all'],
      queryFn: () => studentsApi.getAll(teacher.id.toString(), 'all'),
      enabled,
    })),
  })

  const students = studentQueries
    .flatMap((query) => query.data ?? [])
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return {
    students,
    isLoading: isTeachersLoading || studentQueries.some((query) => query.isLoading),
  }
}
