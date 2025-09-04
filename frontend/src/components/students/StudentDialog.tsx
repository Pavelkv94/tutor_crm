import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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

type StudentBodyType = {
	name: string;
	class: string;
}


export const StudentDialog = ({ btnTitle, dialogTitle }: { btnTitle: string, dialogTitle: string }) => {
	const queryClient = useQueryClient()
	const [open, setOpen] = useState(false)

	const [studentBody, setStudentBody] = useState<StudentBodyType>({
		name: "",
		class: "",
	})
  const [birthDate, setBirthDate] = React.useState<Dayjs | null>(dayjs(new Date()));


	const { mutate } = useMutation({
		mutationFn: (plan: any) => {
			return axios.post(`${import.meta.env.VITE_API_URL}/students`, plan)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["students"] })
		},
		onError: (error) => {
			console.log("ERROR", error)
		}
	})

	const isButtonDisabled = !studentBody.name || !studentBody.class || !birthDate


	const handleClickOpen = () => {
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
	};

	const handleCreateStudent = () => {
		mutate({ ...studentBody, birth_date: birthDate?.toISOString() })
		setBirthDate(dayjs(new Date()))
		setStudentBody({ name: "", class: "" })
		handleClose()
	}

	return (
		<React.Fragment>
			<Button variant="contained" color="secondary" onClick={handleClickOpen}>
				{btnTitle}
			</Button>
			<Dialog open={open} onClose={handleClose}>
				<DialogTitle>{dialogTitle}</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, width: "500px" }}>

				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
						<Typography style={{ margin: 0 }}>Student Name</Typography>
						<TextField
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
						<Typography style={{ margin: 0 }}>Student Class</Typography>
						<TextField
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
						<Typography style={{ margin: 0 }}>Student Birth Date</Typography>
						<DatePicker label="Birth Date" value={birthDate} onChange={(e) => setBirthDate(e)} />
					</div>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose}>Cancel</Button>
					<Button type="submit" variant="contained" color="success" disabled={isButtonDisabled} onClick={handleCreateStudent}>
						Create Student
					</Button>
				</DialogActions>
			</Dialog>
		</React.Fragment>)
}