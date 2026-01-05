import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { lessonsApi } from '@/api/lessons'
import { telegramApi } from '@/api/telegram'
import { useAuth } from '@/contexts/AuthContext'

interface StudentReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number | null
}

export const StudentReportDialog = ({
  open,
  onOpenChange,
  studentId,
}: StudentReportDialogProps) => {
  const { isAdmin } = useAuth()

  // Get current month dates as default
  const getDefaultDates = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const firstDay = `${year}-${month}-01`
    const lastDay = new Date(year, now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]
    return { firstDay, lastDay }
  }

  const { firstDay, lastDay } = getDefaultDates()
  const [startDate, setStartDate] = useState(firstDay)
  const [endDate, setEndDate] = useState(lastDay)
  const [shouldFetch, setShouldFetch] = useState(false)

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['studentLessonsReport', studentId, startDate, endDate],
    queryFn: () => lessonsApi.getStudentLessonsReport(studentId!, startDate, endDate),
    enabled: !!studentId && shouldFetch && !!startDate && !!endDate,
  })

  const sendLessonsCostMutation = useMutation({
    mutationFn: (data: { student_id: number; start_date: string; end_date: string }) =>
      telegramApi.sendLessonsCostToAdmin(data),
  })

  const handleGetInfo = () => {
    if (!startDate || !endDate) {
      return
    }
    setShouldFetch(true)
  }

  const handleSendLessonsCostToAdmin = () => {
    if (!studentId || !startDate || !endDate) {
      return
    }
    sendLessonsCostMutation.mutate({
      student_id: studentId,
      start_date: startDate,
      end_date: endDate,
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when dialog closes
      setShouldFetch(false)
      const { firstDay: fd, lastDay: ld } = getDefaultDates()
      setStartDate(fd)
      setEndDate(ld)
      sendLessonsCostMutation.reset()
    }
    onOpenChange(newOpen)
  }

  if (!studentId) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Отчет</DialogTitle>
          <DialogDescription>Отчет по ученику.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Дата начала</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setShouldFetch(false)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Дата окончания</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setShouldFetch(false)
                }}
              />
            </div>
          </div>

          <Button
            onClick={handleGetInfo}
            disabled={!startDate || !endDate || isLoading}
            className="w-full"
          >
            {isLoading ? 'Загрузка...' : 'Получить информацию'}
          </Button>

          {isAdmin && (
            <Button
              onClick={handleSendLessonsCostToAdmin}
              disabled={!startDate || !endDate || sendLessonsCostMutation.isPending}
              variant="outline"
              className="w-full border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              {sendLessonsCostMutation.isPending ? 'Отправка...' : 'Отправить мне отчет по оплатам'}
            </Button>
          )}

          {isLoading && (
            <div className="py-4 text-center text-muted-foreground">
              Загрузка данных...
            </div>
          )}

          {error && (
            <div className="py-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                Не удалось загрузить данные отчета
              </p>
            </div>
          )}

          {sendLessonsCostMutation.isError && (
            <div className="py-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                Не удалось отправить отчет по оплатам
              </p>
            </div>
          )}

          {sendLessonsCostMutation.isSuccess && (
            <div className="py-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">
                Отчет по оплатам успешно отправлен
              </p>
            </div>
          )}

          {reportData && !isLoading && shouldFetch && (
            <div className="space-y-3">
              <div className="p-4 border rounded-lg bg-card">
                <h3 className="font-semibold text-lg mb-3">Информация об ученике</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Имя:</span>
                    <span className="font-medium">{reportData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Класс:</span>
                    <span className="font-medium">{reportData.class}кл</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-card">
                <h3 className="font-semibold text-lg mb-3">Статистика занятий</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Отмененные занятия:</span>
                    <span className="font-medium text-red-600">{reportData.canceled_lessons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Пропущенные занятия:</span>
                    <span className="font-medium text-orange-600">{reportData.missed_lessons}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

