import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { SalaryInvoiceDelivery, SalaryInvoiceInput, Teacher } from '@/types'
import { teachersApi } from '@/api/teachers'
import { useState, useEffect } from 'react'
import { Label } from '@radix-ui/react-label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '../ui/table'
import { showSuccessToast } from '@/lib/toast'


const currencyFlags: Record<string, string> = {
	USD: '🇺🇸',
	EUR: '🇪🇺',
	PLN: '🇵🇱',
	BYN: '🇧🇾',
	RUB: '🇷🇺',
}

/** Валюта счёта фиксирована бланком — расчёты с преподавателями идут только в BYN. */
const INVOICE_CURRENCY = 'BYN'

/** Номер счёта по умолчанию — «месяц/год» текущего месяца, дальше администратор правит руками. */
const defaultInvoiceNumber = (): string => {
	const now = new Date()
	return `${now.getMonth() + 1}/${now.getFullYear()}`
}

const currentDate = (): string => new Date().toISOString().slice(0, 10)

interface SalaryReportDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	selectedTeacher: Teacher | null
}

export const SalaryReportDialog = ({
	open,
	onOpenChange,
	selectedTeacher,
}: SalaryReportDialogProps) => {
	const [startDate, setStartDate] = useState<string>(new Date().toISOString())
	const [endDate, setEndDate] = useState<string>(new Date().toISOString())
	const [prices, setPrices] = useState<{ [key: string]: number }>({})
	const [invoiceNumber, setInvoiceNumber] = useState<string>(defaultInvoiceNumber())
	const [invoiceDate, setInvoiceDate] = useState<string>(currentDate())
	const [extraAmount, setExtraAmount] = useState<number>(0)
	const [pendingDelivery, setPendingDelivery] = useState<SalaryInvoiceDelivery | null>(null)

	const { data: salaryReportData, isLoading, refetch } = useQuery({
		queryKey: ['salary-report', selectedTeacher?.id, startDate, endDate],
		queryFn: () => teachersApi.getDataForSalary(startDate, endDate, selectedTeacher!.id),
		enabled: false,
	})

	useEffect(() => {
		if (salaryReportData) {
			setPrices(salaryReportData.lessons.reduce((acc, lesson) => {
				acc[lesson.plan_name] = 0
				return acc
			}, {} as { [key: string]: number }))
		}
	}, [salaryReportData])
	// Parse UTC+3 ISO string to display date (YYYY-MM-DD format)
	// When we store dates as UTC+3 ISO strings, we need to parse them back correctly
	const parseUTC3DateForDisplay = (isoString: string): string => {
		// Parse the ISO string and adjust for UTC+3 offset
		const date = new Date(isoString)
		// Add 3 hours to convert from UTC back to UTC+3 for display
		const utc3Date = new Date(date.getTime() + 3 * 60 * 60 * 1000)
		const year = utc3Date.getUTCFullYear()
		const month = String(utc3Date.getUTCMonth() + 1).padStart(2, '0')
		const day = String(utc3Date.getUTCDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	}

	const handleGetSalaryReport = () => {
		if (!selectedTeacher) {
			return
		}
		refetch()
	}

	const lessonsTotal = salaryReportData
		? salaryReportData.lessons.reduce(
			(acc, lesson) => acc + (prices[lesson.plan_name] || 0) * lesson.lessons_count,
			0,
		)
		: 0
	const total = lessonsTotal + extraAmount

	const invoiceMutation = useMutation({
		mutationFn: (delivery: SalaryInvoiceDelivery) => {
			const payload: SalaryInvoiceInput = {
				teacher_id: selectedTeacher!.id,
				start_date: startDate,
				end_date: endDate,
				invoice_number: invoiceNumber,
				invoice_date: invoiceDate,
				lesson_rates: Object.entries(prices).map(([plan_name, rate]) => ({
					plan_name,
					rate: rate || 0,
				})),
				extra_amount: extraAmount > 0 ? extraAmount : undefined,
				delivery: [delivery],
			}
			return teachersApi.generateSalaryInvoice(payload)
		},
		onSuccess: (result) => {
			showSuccessToast(
				result.sent_to_admin
					? `Счёт ${invoiceNumber} отправлен администратору в Telegram`
					: `Счёт ${invoiceNumber} отправлен преподавателю в Telegram`,
			)
		},
		onSettled: () => setPendingDelivery(null),
	})

	const handleGenerateInvoice = (delivery: SalaryInvoiceDelivery) => {
		if (!selectedTeacher) {
			return
		}
		setPendingDelivery(delivery)
		invoiceMutation.mutate(delivery)
	}

	const invoiceDisabled = !salaryReportData || total <= 0 || !invoiceNumber || invoiceMutation.isPending

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col gap-4">
				<DialogHeader>
					<DialogTitle>Рассчет зарплаты</DialogTitle>
					<DialogDescription>
					Рассчет зарплаты для преподавателя <strong>{selectedTeacher?.name}</strong>.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-4">
					<div className="grid gap-2">
						<Label htmlFor="startPeriodDate">Дата начала периода</Label>
						<Input
							id="startPeriodDate"
							type="date"
							value={parseUTC3DateForDisplay(startDate)}
							onChange={(e) => {
								const dateValue = e.target.value
								const [year, month, day] = dateValue.split('-')
								const date = new Date(`${year}-${month}-${day}T06:00:00`)
								setStartDate(date.toISOString())
							}}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="endPeriodDate">Дата окончания периода</Label>
						<Input
							id="endPeriodDate"
							type="date"
							value={parseUTC3DateForDisplay(endDate)}
							onChange={(e) => {
								const dateValue = e.target.value
								const [year, month, day] = dateValue.split('-')
								const date = new Date(`${year}-${month}-${day}T06:00:00`)
								setEndDate(date.toISOString())
							}}
						/>
					</div>
				</div>
				<Button
					onClick={handleGetSalaryReport}
					disabled={!startDate || !endDate || isLoading}
					className="w-full"
				>
					{isLoading ? 'Загрузка...' : 'Получить информацию'}
				</Button>
				{salaryReportData && <div>
					<div>
						<p className="text-lg font-bold mb-2">Всего занятий: {salaryReportData?.total_lessons}</p>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Название плана</TableHead>
								<TableHead>Количество занятий</TableHead>
								<TableHead>Валюта</TableHead>
								<TableHead>Цена за занятие</TableHead>
								<TableHead>Итого</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{
								salaryReportData?.lessons.map((lesson) => (
									<TableRow key={lesson.plan_name}>
										<TableCell>{lesson.plan_name}</TableCell>
										<TableCell>{lesson.lessons_count}</TableCell>
										<TableCell>{lesson.plan_currency} {currencyFlags[lesson.plan_currency]}</TableCell>
										<TableCell>
											<Input
												type="number"
												value={prices[lesson.plan_name]}
												onChange={(e) => {
													setPrices({ ...prices, [lesson.plan_name]: Number(e.target.value) || 0 })
												}}
												placeholder="Цена"
												aria-label={`Цена за ${lesson.plan_name}`}
											/>
										</TableCell>
										<TableCell>{(prices[lesson.plan_name] || 0) * lesson.lessons_count}</TableCell>
									</TableRow>
								))
							}
						</TableBody>
					</Table>

					<div className="grid gap-4 mt-6 rounded-md border p-3">
						<div>
							<p className="text-sm font-medium">Счёт (rachunek)</p>
							<p className="text-xs text-muted-foreground">
								Реквизиты преподавателя берутся из его карточки.
							</p>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="invoiceNumber">Номер счёта</Label>
								<Input
									id="invoiceNumber"
									value={invoiceNumber}
									onChange={(e) => setInvoiceNumber(e.target.value)}
									placeholder="7/2026"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="invoiceDate">Дата счёта</Label>
								<Input
									id="invoiceDate"
									type="date"
									value={invoiceDate}
									onChange={(e) => setInvoiceDate(e.target.value)}
								/>
							</div>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="extraAmount">Оплата за дополнительные услуги, {INVOICE_CURRENCY}</Label>
							<Input
								id="extraAmount"
								type="number"
								value={extraAmount}
								onChange={(e) => setExtraAmount(Number(e.target.value) || 0)}
								placeholder="0"
							/>
						</div>
					</div>

					<div className="flex flex-col items-end gap-1 mt-4">
						<span>Занятия: {lessonsTotal} {INVOICE_CURRENCY}</span>
						{extraAmount > 0 && <span>Дополнительные услуги: {extraAmount} {INVOICE_CURRENCY}</span>}
						<b>Итого: {total} {INVOICE_CURRENCY}</b>
					</div>

					<div className="grid grid-cols-2 gap-2 mt-4">
						<Button
							variant="outline"
							disabled={invoiceDisabled}
							onClick={() => handleGenerateInvoice('TELEGRAM_ADMIN')}
						>
							{pendingDelivery === 'TELEGRAM_ADMIN' ? 'Отправка...' : 'Отправить админу в Telegram'}
						</Button>
						<Button
							disabled={invoiceDisabled}
							onClick={() => handleGenerateInvoice('TELEGRAM_TEACHER')}
						>
							{pendingDelivery === 'TELEGRAM_TEACHER' ? 'Отправка...' : 'Отправить преподавателю'}
						</Button>
					</div>
				</div>}
			</DialogContent>
		</Dialog>
	)
}
