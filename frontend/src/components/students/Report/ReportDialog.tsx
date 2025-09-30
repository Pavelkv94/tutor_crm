import { useState } from "react"
import axios from "axios"
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from "@mui/material/Typography"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs, { Dayjs } from "dayjs"
import { useMutation, useQuery } from "@tanstack/react-query"
import "./ReportInfoDialog.styles.scss"

export type SendReportDto = {
	studentId: number;
	start_date: string;
	end_date: string;
}

export const ReportInfoDialog = ({ open, setOpen, student }: { open: boolean, setOpen: (open: boolean) => void, student: any }) => {

	const [selectedPeriod, setSelectedPeriod] = useState<Dayjs>(dayjs(new Date()));

	const { data: studentData } = useQuery({
		queryKey: ["reports", student.id, selectedPeriod],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/reports/${student.id}?start_date=${selectedPeriod.startOf('month').toISOString()}&end_date=${selectedPeriod.endOf('month').toISOString()}`)
		},
		staleTime: 60 * 60 * 1000,
	})

	const { mutate: sendReport } = useMutation({
		mutationFn: (sendReportDto: SendReportDto) => {
			return axios.post(`${import.meta.env.VITE_API_URL}/reports/send-report`, sendReportDto)
		},
	})

	const handleClose = () => {
		setOpen(false);
	};

	return <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
		<DialogTitle className="report-info-title">
			Отчеты о студенте
		</DialogTitle>

		<DialogContent className="report-info-content">
			<section>
				<DatePicker
					views={['year', 'month']}
					openTo="month"
					value={selectedPeriod}
					onChange={(newValue) => setSelectedPeriod(newValue as Dayjs)}
				/>
				<Typography style={{ margin: 0 }}>Общее количество занятий: {studentData?.data.totalLessonsCount}</Typography>
				<Typography style={{ margin: 0 }}>Отмененные занятия: {studentData?.data.canceledLessonsCount}</Typography>
				<Typography style={{ margin: 0 }}>Выполненные занятия: {studentData?.data.completedLessonsCount}</Typography>
				<Typography style={{ margin: 0 }}>Ожидающие занятия: {studentData?.data.pendingLessonsCount}</Typography>
				<Typography style={{ margin: 0 }}>Общая стоимость занятий: {studentData?.data.totalLessonsPrice}</Typography>
				<Typography style={{ margin: 0 }}>Остаток: {studentData?.data.balance}</Typography>
				<Button variant="contained" color="primary" onClick={() => sendReport({ studentId: student.id, start_date: selectedPeriod.startOf('month').toISOString(), end_date: selectedPeriod.endOf('month').toISOString() })}>Отправить отчет мне в Telegram</Button>

			</section>
		</DialogContent>
		<DialogActions>
			<Button onClick={handleClose}>Закрыть</Button>
		</DialogActions>
	</Dialog>
}