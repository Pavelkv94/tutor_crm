import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
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
import { Dayjs } from "dayjs"
import dayjs from "dayjs"
import { useNotification } from "../notifier/NotificationProvider"
import { queryClient } from "@/main";


export const PayDialog = ({ student }: { student: any }) => {
	const notify = useNotification()
	const [open, setOpen] = useState(false)

	const [sum, setSum] = useState<number>(0)
	const [paymentPeriod, setPaymentPeriod] = React.useState<Dayjs | null>(dayjs(new Date()));

	const { mutate } = useMutation({
		mutationFn: (sum: number) => {
			return axios.post(`${import.meta.env.VITE_API_URL}/students/${student.id}/pay`, { sum })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["students"] })
			notify("Оплата успешно внесена", "success")
		},
		onError: (error) => {
			notify("Ошибка при внесении оплаты: " + (error as any)?.response?.data?.message, "error")
		}
	})

	const handleClickOpen = () => {
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
		setPaymentPeriod(dayjs(new Date()))
		setSum(0)
	};

	const handleCreateStudent = () => {
		mutate(sum)
		setPaymentPeriod(dayjs(new Date()))
		handleClose()
	}

	return (
		<React.Fragment>
			<Button variant="outlined" color="success" onClick={handleClickOpen}>
				Оплата
			</Button>
			<Dialog open={open} onClose={handleClose}>
				<DialogTitle>Внести оплату для {student.name}</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, width: "500px" }}>

					<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
						<Typography style={{ margin: 0 }}>Выбранный месяц(для которого оплачиваются занятия)</Typography>
						<DatePicker value={paymentPeriod} views={['year', 'month']} openTo="month" onChange={(e) => setPaymentPeriod(e)} format="MM.YYYY" />
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
						<Typography style={{ margin: 0 }}>Сумма оплаты(BYN)</Typography>
						<TextField
							autoFocus
							required
							margin="dense"
							type="number"
							fullWidth
							inputProps={{ 'aria-label': 'Without label' }}
							value={sum}
							onChange={(e) => setSum(Number(e.target.value))}
						/>
					</div>


				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose}>Отмена</Button>
					<Button type="submit" variant="contained" color="success" disabled={!sum} onClick={handleCreateStudent}>
						Внести оплату
					</Button>
				</DialogActions>
			</Dialog>
		</React.Fragment>)
}