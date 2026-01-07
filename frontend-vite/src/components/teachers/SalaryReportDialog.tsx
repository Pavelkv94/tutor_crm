import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useQuery } from '@tanstack/react-query'
import type { Teacher } from '@/types'
import { teachersApi } from '@/api/teachers'
import { useState, useEffect } from 'react'
import { Label } from '@radix-ui/react-label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '../ui/table'


const currencyFlags: Record<string, string> = {
	USD: '🇺🇸',
	EUR: '🇪🇺',
	PLN: '🇵🇱',
	BYN: '🇧🇾',
}

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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] flex flex-col gap-4">
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
										<TableCell><Input type="number" value={prices[lesson.plan_name]} onChange={(e) => {
											setPrices({ ...prices, [lesson.plan_name]: parseInt(e.target.value) })
										}} /></TableCell>
										<TableCell>{prices[lesson.plan_name] * lesson.lessons_count}</TableCell>
									</TableRow>
								))
							}
						</TableBody>
					</Table>
					<div className="flex justify-end">
						<b>Итого: {salaryReportData?.lessons.reduce((acc, lesson) => acc + prices[lesson.plan_name] * lesson.lessons_count, 0)}</b>
					</div>
				</div>}
			</DialogContent>
		</Dialog>
	)
}

