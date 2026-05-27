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
import { cn } from '@/lib/utils'

interface StudentReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number | null
}

type ReportTab = 'payments' | 'info'

const MONTH_NAMES = [
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

const getDatesFromMonthYear = (year: number, month: number) => {
	const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
	const lastDayDate = new Date(year, month, 0)
	const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`
	return { firstDay, lastDay }
}

const isPeriodRangeValid = (
	startYear: string,
	startMonth: string,
	endYear: string,
	endMonth: string
) => {
	const start = parseInt(startYear, 10) * 12 + parseInt(startMonth, 10)
	const end = parseInt(endYear, 10) * 12 + parseInt(endMonth, 10)
	return end >= start
}

export const StudentReportDialog = ({
  open,
  onOpenChange,
  studentId,
}: StudentReportDialogProps) => {
  const { isAdmin } = useAuth()

  const now = new Date()
  const currentYear = now.getFullYear()
	const currentMonth = now.getMonth() + 1

	const defaultYear = currentYear.toString()
	const defaultMonth = currentMonth.toString()

	const [activeTab, setActiveTab] = useState<ReportTab>(isAdmin ? 'payments' : 'info')

	const [paymentYear, setPaymentYear] = useState(defaultYear)
	const [paymentMonth, setPaymentMonth] = useState(defaultMonth)

	const [infoStartYear, setInfoStartYear] = useState(defaultYear)
	const [infoStartMonth, setInfoStartMonth] = useState(defaultMonth)
	const [infoEndYear, setInfoEndYear] = useState(defaultYear)
	const [infoEndMonth, setInfoEndMonth] = useState(defaultMonth)

	const { firstDay: paymentStartDate, lastDay: paymentEndDate } = getDatesFromMonthYear(
		parseInt(paymentYear, 10),
		parseInt(paymentMonth, 10)
  )

	const { firstDay: infoStartDate } = getDatesFromMonthYear(
		parseInt(infoStartYear, 10),
		parseInt(infoStartMonth, 10)
	)
	const { lastDay: infoEndDate } = getDatesFromMonthYear(
		parseInt(infoEndYear, 10),
		parseInt(infoEndMonth, 10)
	)

	const isInfoPeriodValid = isPeriodRangeValid(
		infoStartYear,
		infoStartMonth,
		infoEndYear,
		infoEndMonth
	)

	const [shouldFetchInfo, setShouldFetchInfo] = useState(false)
	const [isCopied, setIsCopied] = useState(false)

	const {
		data: reportData,
		isLoading: isInfoLoading,
		error: infoError,
	} = useQuery({
		queryKey: ['studentLessonsReport', studentId, infoStartDate, infoEndDate],
		queryFn: () => {
			if (!studentId) {
				throw new Error('Student ID is required')
			}
			return lessonsApi.getStudentLessonsReport(studentId, infoStartDate, infoEndDate)
		},
		enabled: !!studentId && shouldFetchInfo && isInfoPeriodValid,
  })

  const sendLessonsCostMutation = useMutation({
    mutationFn: (data: { student_id: number; start_date: string; end_date: string }) =>
      telegramApi.sendLessonsCostToAdmin(data),
  })

  const handleGetInfo = () => {
		if (!isInfoPeriodValid) {
      return
    }
		setShouldFetchInfo(true)
  }

  const handleSendLessonsCostToAdmin = () => {
		if (!studentId || !paymentStartDate || !paymentEndDate) {
      return
    }
    sendLessonsCostMutation.mutate({
      student_id: studentId,
			start_date: paymentStartDate,
			end_date: paymentEndDate,
    })
  }

	const resetState = () => {
		setActiveTab(isAdmin ? 'payments' : 'info')
		setShouldFetchInfo(false)
		setPaymentYear(defaultYear)
		setPaymentMonth(defaultMonth)
		setInfoStartYear(defaultYear)
		setInfoStartMonth(defaultMonth)
		setInfoEndYear(defaultYear)
		setInfoEndMonth(defaultMonth)
		sendLessonsCostMutation.reset()
	}

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
			resetState()
    }
    onOpenChange(newOpen)
  }

	const handleTabChange = (tab: ReportTab) => {
		setActiveTab(tab)
		setShouldFetchInfo(false)
		sendLessonsCostMutation.reset()
  }

	const handlePaymentYearChange = (value: string) => {
		setPaymentYear(value)
		sendLessonsCostMutation.reset()
  }

	const handlePaymentMonthChange = (value: string) => {
		setPaymentMonth(value)
		sendLessonsCostMutation.reset()
  }

	const handleInfoPeriodChange = () => {
		setShouldFetchInfo(false)
	}

	const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
	const startMonthLabel = MONTH_NAMES[Math.max(0, Math.min(11, parseInt(infoStartMonth, 10) - 1))] ?? ''
	const endMonthLabel = MONTH_NAMES[Math.max(0, Math.min(11, parseInt(infoEndMonth, 10) - 1))] ?? ''

	const renderYearSelect = (
		id: string,
		value: string,
		onChange: (value: string) => void,
		label: string
	) => (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger id={id}>
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
	)

	const renderMonthSelect = (
		id: string,
		value: string,
		onChange: (value: string) => void,
		label: string
	) => (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger id={id}>
					<SelectValue placeholder="Выберите месяц" />
				</SelectTrigger>
				<SelectContent>
					{MONTH_NAMES.map((monthName, index) => {
						const monthValue = (index + 1).toString()
						return (
							<SelectItem key={monthValue} value={monthValue}>
								{monthName}
							</SelectItem>
						)
					})}
				</SelectContent>
			</Select>
		</div>
	)

	if (!studentId) return null

	const parentReportText =
		reportData && shouldFetchInfo
			? [
				`📋 ОТЧЁТ РОДИТЕЛЮ ЗА УЧЕБНЫЙ ГОД ${infoStartYear} — ${infoEndYear}`,
				`👦 Ученик: ${reportData.name}, ${reportData.class} класс`,
				`📅 Период: ${startMonthLabel} ${infoStartYear} — ${endMonthLabel} ${infoEndYear}`,
				`━━━━━━━━━━━━━━━━━━`,
				`📊 Посещаемость:`,
				`⏳ Пропуски (отменённые и неотработанные занятия): ${reportData.canceled_lessons}`,
				`🔄 Переносы: ${reportData.rescheduled_lessons}`,
				`😱 Прогулы (неявка без предупреждения): ${reportData.missed_lessons}`,
				`━━━━━━━━━━━━━━━━━━`,
				`📚 Результаты:`,
				`______________________________________________`,
				`━━━━━━━━━━━━━━━━━━`,
				`🔎 Общие наблюдения об ученике (поведение, работа на занятии, выполнение домашних заданий):`,
				`______________________________________________`,
				`━━━━━━━━━━━━━━━━━━`,
				`📝 Рекомендации:`,
				`🙏 Прошу вас от всего сердца — уделяйте хотя бы 15 минут в неделю на повторение наших материалов! `,
				`⚠️ Опыт перерывов со многими учениками показывает, что всё забывается очень сильно. Мы не живём в англоязычной стране, и поэтому только через повторение и регулярные занятия можно удержать результат 🔁`,
				`📩 Также дополнительно я пришлю вам небольшое домашнее задание на лето — очень прошу вас, выполняйте его потихоньку, чтобы месяцы нашей совместной работы сохранились и нам не пришлось начинать всё заново 🚀`,
				`━━━━━━━━━━━━━━━━━━`,
				`⭐️ P.S. Буду благодарна, если поделитесь своими впечатлениями о прогрессе ребёнка в изучении английского языка и дадите фидбэк о нашей работе! 💬`,
			].join('\n')
			: ''

	const handleCopyParentReport = async () => {
		if (!parentReportText) return
		try {
			await navigator.clipboard.writeText(parentReportText)
			setIsCopied(true)
			window.setTimeout(() => setIsCopied(false), 1500)
		} catch {
			setIsCopied(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[900px]">
				<DialogHeader>
					<DialogTitle>Отчет</DialogTitle>
					<DialogDescription>Отчет по ученику.</DialogDescription>
				</DialogHeader>

				{isAdmin && (
					<div
						role="tablist"
						aria-label="Тип отчета"
						className="flex gap-1 rounded-lg border p-1"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'payments'}
							className={cn(
								'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
								activeTab === 'payments'
									? 'bg-blue-100 text-blue-900 shadow-sm'
									: 'text-muted-foreground hover:bg-blue-50'
							)}
							onClick={() => handleTabChange('payments')}
						>
							Оплаты
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'info'}
							className={cn(
								'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
								activeTab === 'info'
									? 'bg-blue-100 text-blue-900 shadow-sm'
									: 'text-muted-foreground hover:bg-blue-50'
							)}
							onClick={() => handleTabChange('info')}
						>
							Информация
						</button>
					</div>
				)}

				<div className="space-y-4 py-2">
					{activeTab === 'payments' && isAdmin && (
						<>
							<div className="grid grid-cols-2 gap-4">
								{renderYearSelect(
									'payment-year-select',
									paymentYear,
									handlePaymentYearChange,
									'Год'
								)}
								{renderMonthSelect(
									'payment-month-select',
									paymentMonth,
									handlePaymentMonthChange,
									'Месяц'
								)}
							</div>

							<Button
								onClick={handleSendLessonsCostToAdmin}
								disabled={
									!paymentStartDate || !paymentEndDate || sendLessonsCostMutation.isPending
								}
								variant="outline"
								className="w-full border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
							>
								{sendLessonsCostMutation.isPending
									? 'Отправка...'
									: 'Отправить мне отчет по оплатам'}
							</Button>

							{sendLessonsCostMutation.isError && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
									<p className="text-sm text-red-600">
										Не удалось отправить отчет по оплатам
									</p>
								</div>
							)}

							{sendLessonsCostMutation.isSuccess && (
								<div className="p-3 bg-green-50 border border-green-200 rounded-lg">
									<p className="text-sm text-green-600">
										Отчет по оплатам успешно отправлен
									</p>
								</div>
							)}
						</>
          )}

					{activeTab === 'info' && (
						<>
							<div className="grid gap-6 sm:grid-cols-2">
								<div className="space-y-3">
									<p className="text-sm font-medium text-muted-foreground">Начало периода</p>
									<div className="grid grid-cols-2 gap-4">
										{renderYearSelect('info-start-year', infoStartYear, (value) => {
											setInfoStartYear(value)
											handleInfoPeriodChange()
										}, 'Год')}
										{renderMonthSelect('info-start-month', infoStartMonth, (value) => {
											setInfoStartMonth(value)
											handleInfoPeriodChange()
										}, 'Месяц')}
									</div>
								</div>

								<div className="space-y-3">
									<p className="text-sm font-medium text-muted-foreground">Конец периода</p>
									<div className="grid grid-cols-2 gap-4">
										{renderYearSelect('info-end-year', infoEndYear, (value) => {
											setInfoEndYear(value)
											handleInfoPeriodChange()
										}, 'Год')}
										{renderMonthSelect('info-end-month', infoEndMonth, (value) => {
											setInfoEndMonth(value)
											handleInfoPeriodChange()
										}, 'Месяц')}
									</div>
								</div>
							</div>

							{!isInfoPeriodValid && (
								<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
									<p className="text-sm text-amber-700">
										Конец периода не может быть раньше начала
									</p>
								</div>
							)}

							<Button
								onClick={handleGetInfo}
								disabled={!isInfoPeriodValid || isInfoLoading}
								className="w-full"
							>
								{isInfoLoading ? 'Загрузка...' : 'Получить информацию'}
							</Button>

							{isInfoLoading && (
								<div className="py-4 text-center text-muted-foreground">
									Загрузка данных...
								</div>
							)}

							{infoError && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
									<p className="text-sm text-red-600">
										Не удалось загрузить данные отчета
									</p>
								</div>
							)}

							{reportData && !isInfoLoading && shouldFetchInfo && (
								<div className="grid gap-3 sm:grid-cols-2">
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
													<span className="font-medium text-red-600">
														{reportData.canceled_lessons}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">Переносы:</span>
													<span className="font-medium text-orange-600">
														{reportData.rescheduled_lessons}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">Пропущенные занятия:</span>
													<span className="font-medium text-orange-600">
														{reportData.missed_lessons}
													</span>
												</div>
											</div>
										</div>
									</div>

									<div className="space-y-2">
										<div className="flex items-center justify-between gap-2">
											<h3 className="font-semibold">Текст для родителя</h3>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleCopyParentReport}
												disabled={!parentReportText}
											>
												{isCopied ? 'Скопировано' : 'Копировать'}
											</Button>
										</div>
										<div className="max-h-[45vh] overflow-auto rounded-lg border bg-muted/30">
											<pre className="whitespace-pre-wrap break-words p-3 text-sm leading-relaxed">
												{parentReportText}
											</pre>
										</div>
									</div>
								</div>
							)}
						</>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
