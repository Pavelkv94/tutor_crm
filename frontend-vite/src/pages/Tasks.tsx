import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { TaskTeacherSelectionGrid } from '@/components/tasks/TaskTeacherSelectionGrid'
import { TaskSticker } from '@/components/tasks/TaskSticker'
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog'
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog'
import { DeleteTaskDialog } from '@/components/tasks/DeleteTaskDialog'
import { ViewTaskDialog } from '@/components/tasks/ViewTaskDialog'
import { tasksApi } from '@/api/tasks'
import { useAuth } from '@/contexts/AuthContext'
import { showSuccessToast } from '@/lib/toast'
import type { Task } from '@/types'

export const Tasks = () => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const { isAdmin, user } = useAuth()
  const queryClient = useQueryClient()

  const showTeacherSelection = isAdmin && !selectedTeacherId

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ['tasks', 'teachers'],
    queryFn: () => tasksApi.getTeachersWithTaskCounts(),
    enabled: isAdmin,
  })

  const { data: myTasks = [], isLoading: isMyTasksLoading } = useQuery({
    queryKey: ['tasks', 'my'],
    queryFn: () => tasksApi.getMyTasks(),
    enabled: !isAdmin,
  })

  const { data: teacherTasks = [], isLoading: isTeacherTasksLoading } = useQuery({
    queryKey: ['tasks', 'teacher', selectedTeacherId],
    queryFn: () => tasksApi.getByTeacher(parseInt(selectedTeacherId, 10)),
    enabled: isAdmin && !!selectedTeacherId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showSuccessToast('Задача удалена')
      setDeleteDialogOpen(false)
      setSelectedTask(null)
    },
  })

  const tasks = isAdmin ? teacherTasks : myTasks
  const isTasksLoading = isAdmin ? isTeacherTasksLoading : isMyTasksLoading

  const handleTeacherSelect = (teacherId: number) => {
    setSelectedTeacherId(teacherId.toString())
  }

  const handleBackToTeachers = () => {
    setSelectedTeacherId('')
  }

  const handleViewClick = (task: Task) => {
    setSelectedTask(task)
    setViewDialogOpen(true)
  }

  const handleEditClick = (task: Task) => {
    setSelectedTask(task)
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (task: Task) => {
    setSelectedTask(task)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedTask) {
      deleteMutation.mutate(selectedTask.id)
    }
  }

  const canTeacherEdit = (task: Task) => task.status === 'IN_PROGRESS'

  if (showTeacherSelection) {
    if (isTeachersLoading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      )
    }

    return (
      <TaskTeacherSelectionGrid
        teachers={teachers}
        currentUserId={user?.id}
        onSelect={handleTeacherSelect}
      />
    )
  }

  if (isTasksLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToTeachers}
              aria-label="Назад к выбору преподавателя"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold">Задачи</h1>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto font-semibold">
            <Plus className="mr-2 h-4 w-4" />
            Создать задачу
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2">
          <Label htmlFor="task-teacher-filter">Фильтр по преподавателю:</Label>
          <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
            <SelectTrigger id="task-teacher-filter" className="w-[220px]">
              <SelectValue placeholder="Выберите преподавателя" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id.toString()}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground">Задач пока нет</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {tasks.map((task) => (
            <TaskSticker
              key={task.id}
              task={task}
              canEdit={isAdmin || canTeacherEdit(task)}
              canDelete={isAdmin}
              onView={handleViewClick}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <CreateTaskDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          teachers={teachers}
          defaultTeacherId={selectedTeacherId}
        />
      )}

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={selectedTask}
        isAdmin={isAdmin}
        teachers={teachers}
      />

      <DeleteTaskDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />

      <ViewTaskDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        task={selectedTask}
        isAdmin={isAdmin}
        onTaskUpdated={setSelectedTask}
      />
    </div>
  )
}
