import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { queryClient } from "@/main"
import axios from "axios"
import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from "@mui/material/Typography"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs, { Dayjs } from "dayjs"
import { useQuery } from "@tanstack/react-query"
import "./StudentInfoDialog.styles.scss"
import { useNotification } from "@/components/notifier/NotificationProvider";
import TelegramIcon from '@mui/icons-material/Telegram';
import { Switch } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export const StudentInfoDialog = ({ open, setOpen, student }: { open: boolean, setOpen: (open: boolean) => void, student: any }) => {

	const notify = useNotification()

	const { data: studentData } = useQuery({
		queryKey: ["students", student.id],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/students/${student.id}`)
		},
		staleTime: 60 * 60 * 1000,
	})

	const { data: telegramLink, refetch: refetchTelegramLink } = useQuery({
		queryKey: ["students", student.id, "telegram-link"],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/students/${student.id}/telegram-link`)
		},
		enabled: false,
	})

	const [studentBody, setStudentBody] = useState<any>({
		name: studentData?.data.name,
		class: studentData?.data.class,
		bookUntilCancellation: studentData?.data.bookUntilCancellation,
		notifyAboutBirthday: studentData?.data.notifyAboutBirthday,
		notifyAboutLessons: studentData?.data.notifyAboutLessons,
	})
	const [birthDate, setBirthDate] = React.useState<Dayjs | null>(dayjs(studentData?.data.birth_date));

	useEffect(() => {
		setStudentBody({
			name: studentData?.data.name,
			class: studentData?.data.class,
			bookUntilCancellation: studentData?.data.bookUntilCancellation,
			notifyAboutBirthday: studentData?.data.notifyAboutBirthday,
			notifyAboutLessons: studentData?.data.notifyAboutLessons,
		})
		setBirthDate(dayjs(studentData?.data.birth_date))
	}, [studentData])

	const { mutate } = useMutation({
		mutationFn: ({ id, student }: { id: string, student: any }) => {
			return axios.patch(`${import.meta.env.VITE_API_URL}/students/${id}`, student)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["students"] })
			notify("Студент успешно обновлен", "success")

		},
		onError: (error) => {
			notify("Ошибка при обновлении студента: " + (error as any)?.response?.data?.message, "error")
		}
	})

	const isButtonDisabled = !studentBody.name || !studentBody.class || !birthDate

	const handleClose = () => {
		setOpen(false);
	};

	const handleSaveStudent = () => {
		mutate({ id: student.id.toString(), student: { ...studentBody, birth_date: birthDate?.toISOString(), class: +studentBody.class } })
	}

	return <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
		<DialogTitle className="student-info-title">
			Информация о студенте
		</DialogTitle>

		<DialogContent className="student-info-content">
			<section>
				<div>
					<Typography style={{ margin: 0 }}>Имя студента</Typography>
					<TextField
						size="small"
						autoFocus
						required
						margin="dense"
						type="text"
						fullWidth
						inputProps={{ 'aria-label': 'Without label' }}
						value={studentBody.name}
						onChange={(e) => setStudentBody({ ...studentBody, name: e.target.value })}
					/>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<Typography style={{ margin: 0 }}>Класс студента</Typography>
					<TextField
						size="small"
						autoFocus
						required
						margin="dense"
						type="number"
						fullWidth
						inputProps={{ 'aria-label': 'Without label' }}
						value={studentBody.class}
						onChange={(e) => setStudentBody({ ...studentBody, class: e.target.value })}
					/>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<Typography style={{ margin: 0 }}>Дата рождения</Typography>
					<DatePicker label="Birth Date" value={birthDate} onChange={(e) => setBirthDate(e)} format="DD.MM.YYYY" />
				</div>

				<div >
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<Typography style={{ margin: 0 }}>Бронировать занятия до отмены:</Typography>
						<Switch checked={studentBody.bookUntilCancellation} onChange={(e) => setStudentBody({ ...studentBody, bookUntilCancellation: e.target.checked })} />
					</div>
					<Typography fontSize={12} color="#666" style={{ margin: 0 }}>Занятия будут автоматически забронированы на следующий месяц</Typography>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<Typography style={{ margin: 0 }}>Уведомить меня о дне рождения:</Typography>
					<Switch checked={studentBody.notifyAboutBirthday} onChange={(e) => setStudentBody({ ...studentBody, notifyAboutBirthday: e.target.checked })} />
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<Typography style={{ margin: 0 }}>Уведомить студента о занятиях:</Typography>
					<Switch checked={studentBody.notifyAboutLessons} onChange={(e) => setStudentBody({ ...studentBody, notifyAboutLessons: e.target.checked })} />
				</div>

				<Button type="submit" variant="contained" color="success" disabled={isButtonDisabled} onClick={handleSaveStudent}>
					Сохранить студента
				</Button>
			</section>
			<section>
				<Typography style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}><TelegramIcon style={{ color: "#1976d2" }} />Подключенные Telegram:</Typography>
				{studentData?.data.telegrams.length === 0 && (
					<Typography fontSize={12} style={{ margin: 0 }}>Подключенные Telegram не найдены</Typography>
				)}
				{studentData?.data.telegrams.map((telegram: any) => (
					<span key={telegram.id}>{"• "}
						<a href={`https://t.me/${telegram.username}`} target="_blank" style={{ margin: 0, color: "#1976d2", textDecoration: "none" }}>@{telegram.username} {telegram.first_name} ({telegram.type})</a>
					</span>
				))}
				<Button size="small" variant="outlined" color="primary" disabled={isButtonDisabled} onClick={() => refetchTelegramLink()}>Сгенерировать Telegram Link для этого студента</Button>
				{telegramLink?.data.link && <Typography fontSize={12} style={{ margin: 0 }}>
					Telegram Link: <span style={{ fontSize: 12, color: "#666" }}>{telegramLink?.data.link}</span>
					<ContentCopyIcon sx={{ fontSize: 16, marginLeft: 1 }} onClick={() => navigator.clipboard.writeText(telegramLink?.data.link)} style={{ cursor: "pointer" }} />
				</Typography>}
			</section>
		</DialogContent>
		<DialogActions>
			<Button onClick={handleClose}>Закрыть</Button>
		</DialogActions>
	</Dialog>
}