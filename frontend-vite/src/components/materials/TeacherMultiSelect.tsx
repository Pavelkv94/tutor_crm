import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Teacher } from '@/types'

interface TeacherMultiSelectProps {
  teachers: Teacher[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  isLoading?: boolean
  placeholder?: string
}

export const TeacherMultiSelect = ({
  teachers,
  selectedIds,
  onChange,
  isLoading = false,
  placeholder = 'Выберите преподавателей',
}: TeacherMultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const selectedTeachers = teachers.filter((teacher) => selectedIds.includes(teacher.id))

  const triggerLabel =
    selectedTeachers.length === 0
      ? placeholder
      : selectedTeachers.length === 1
        ? selectedTeachers[0].name
        : `Выбрано: ${selectedTeachers.length}`

  const handleToggleOpen = () => {
    if (isLoading) return
    setIsOpen((prev) => !prev)
  }

  const handleToggleTeacher = (teacherId: number) => {
    if (selectedIds.includes(teacherId)) {
      onChange(selectedIds.filter((id) => id !== teacherId))
      return
    }
    onChange([...selectedIds, teacherId])
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggleOpen}
        disabled={isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label="Выбор преподавателей для доступа"
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          selectedTeachers.length === 0 && 'text-muted-foreground',
        )}
      >
        <span className="truncate text-left">{isLoading ? 'Загрузка...' : triggerLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-input bg-card p-1 shadow-md"
        >
          {teachers.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Преподаватели не найдены</p>
          ) : (
            teachers.map((teacher) => {
              const isSelected = selectedIds.includes(teacher.id)

              return (
                <button
                  key={teacher.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleToggleTeacher(teacher.id)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground',
                    isSelected && 'bg-secondary',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary',
                      isSelected && 'bg-primary text-primary-foreground',
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{teacher.name}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
