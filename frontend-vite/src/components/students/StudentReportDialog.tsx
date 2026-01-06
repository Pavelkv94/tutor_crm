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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

  // Get current month/year as default
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString())

  // Calculate start and end dates based on selected month/year
  const getDatesFromMonthYear = (year: number, month: number) => {
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0)
      .toISOString()
      .split('T')[0]
    return { firstDay, lastDay }
  }

  const { firstDay: startDate, lastDay: endDate } = getDatesFromMonthYear(
    parseInt(selectedYear),
    parseInt(selectedMonth)
  )

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
      setSelectedYear(currentYear.toString())
      setSelectedMonth(currentMonth.toString())
      sendLessonsCostMutation.reset()
    }
    onOpenChange(newOpen)
  }

  const handleYearChange = (value: string) => {
    setSelectedYear(value)
    setShouldFetch(false)
  }

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)
    setShouldFetch(false)
  }

  // Generate years (current year ± 5 years)
  const years = []
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i)
  }

  // Month names in Russian
  const monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ]

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
              <Label htmlFor="year-select">Год</Label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger id="year-select">
                  <SelectValue placeholder="Выберите год" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month-select">Месяц</Label>
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger id="month-select">
                  <SelectValue placeholder="Выберите месяц" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((monthName, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {monthName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

