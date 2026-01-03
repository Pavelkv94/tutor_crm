import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { TeachersTable } from '@/components/teachers/TeachersTable'
import { CreateTeacherDialog } from '@/components/teachers/CreateTeacherDialog'
import { EditTeacherDialog } from '@/components/teachers/EditTeacherDialog'
import { DeleteTeacherDialog } from '@/components/teachers/DeleteTeacherDialog'
import { teachersApi } from '@/api/teachers'
import type { Teacher } from '@/types'

export const Teachers = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all')
  const queryClient = useQueryClient()

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers', filter],
    queryFn: () => teachersApi.getAll(filter),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => teachersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setDeleteDialogOpen(false)
      setSelectedTeacherId(null)
    },
  })

  const handleEdit = (id: number) => {
    setSelectedTeacherId(id)
    setEditDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setSelectedTeacherId(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedTeacherId !== null) {
      deleteMutation.mutate(selectedTeacherId)
    }
  }

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || null

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Преподаватели</h1>
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Добавить преподавателя
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="teacher-filter">Фильтр:</Label>
          <Select value={filter} onValueChange={(value: 'all' | 'active' | 'deleted') => setFilter(value)}>
            <SelectTrigger id="teacher-filter" className="w-[180px]">
              <SelectValue placeholder="Выберите фильтр" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="deleted">Удаленные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      ) : (
        <TeachersTable
          teachers={teachers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <CreateTeacherDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <EditTeacherDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        teacher={selectedTeacher}
      />
      <DeleteTeacherDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        teacher={selectedTeacher}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}

