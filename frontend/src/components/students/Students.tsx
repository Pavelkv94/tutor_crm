import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Layout from '../layout/Layout'
import { StudentDialog } from './StudentDialog'
import axios from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import TableBody from '@mui/material/TableBody'
import dayjs from 'dayjs'
import './Students.styles.scss'
import Preloader from '../Preloader/Preloader'
import { useState } from 'react'
import { StudentInfoDialog } from './StudentInfo/StudentInfoDialog'
import Button from '@mui/material/Button'
import { ReportInfoDialog } from './Report/ReportDialog'
import { DeleteDialog } from '../general/DeleteDialog'
import { queryClient } from '@/main'
import { useNotification } from '../notifier/NotificationProvider'
import { PayDialog } from './PayDialog'

const Students = () => {
	const notify = useNotification()

	const { data, isLoading, isError } = useQuery({
		queryKey: ["students"],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/students`)
		},
	})

	const studentsData = data?.data.filter((student: any) => student.deleted_at === null)
	const { mutate: deleteStudent } = useMutation({
		mutationFn: (id: number) => {
			return axios.delete(`${import.meta.env.VITE_API_URL}/students/${id}`)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["students"] })
		},
		onError: (error) => {
			notify("Ошибка при удалении студента: " + (error as any)?.response?.data?.message, "error")
		}
	})

	const [openStudentInfoDialog, setOpenStudentInfoDialog] = useState(false);
	const [checkedStudent, setCheckedStudent] = useState<any>(null);
	const [openReportDialog, setOpenReportDialog] = useState(false);

	const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

	const handleSort = (key: string) => {
		setSortConfig((prev) => {
			if (prev?.key === key) {
				return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
			}
			return { key, direction: "asc" };
		});
	};

	const sortedData = [...(studentsData || [])].sort((a, b) => {
		if (!sortConfig) return 0;
		const { key, direction } = sortConfig;
		const aValue = a[key];
		const bValue = b[key];

		if (typeof aValue === "number" && typeof bValue === "number") {
			return direction === "asc" ? aValue - bValue : bValue - aValue;
		}
		return direction === "asc"
			? String(aValue).localeCompare(String(bValue))
			: String(bValue).localeCompare(String(aValue));
	});


	if (isLoading) return <Preloader isLoading={isLoading} />

	if (isError) return <div>Error</div>

	return (
		<div>
			<Layout title="Студенты" dialog={<StudentDialog btnTitle="Добавить студента" dialogTitle="Добавить студента" />}>
				<TableContainer component={Paper}>
					<Table sx={{ minWidth: 650 }} aria-label="simple table" size='small'>
						<TableHead>
							<TableRow sx={{ backgroundColor: "#ecf1ff" }}>
								<TableCell onClick={() => handleSort("name")} className="sortable-cell">Имя студента {sortConfig?.key === "name" ? sortConfig.direction === "asc" ? "▲" : "▼" : ""}</TableCell>
								<TableCell onClick={() => handleSort("class")} className="sortable-cell">Класс студента {sortConfig?.key === "class" ? sortConfig.direction === "asc" ? "▲" : "▼" : ""}</TableCell>
								<TableCell onClick={() => handleSort("birth_date")} className="sortable-cell">Дата рождения {sortConfig?.key === "birth_date" ? sortConfig.direction === "asc" ? "▲" : "▼" : ""}</TableCell>
								<TableCell onClick={() => handleSort("balance")} className="sortable-cell">Остаток {sortConfig?.key === "balance" ? sortConfig.direction === "asc" ? "▲" : "▼" : ""}</TableCell>
								<TableCell width={100}></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{sortedData?.map((student: any) => {
								const birthDate = dayjs(student.birth_date).format("DD.MM.YYYY");
								const isBirthdayToday = dayjs(student.birth_date).isSame(dayjs(new Date()), "day");

								return <TableRow key={student.id} className={"student-row"} >
									<TableCell sx={{ fontWeight: "bold" }}>{isBirthdayToday ? "🎉" : ""} {student.name} {isBirthdayToday ? "🎉" : ""}</TableCell>
									<TableCell>{student.class}</TableCell>
									<TableCell>{birthDate}</TableCell>
									<TableCell>{student.balance}</TableCell>
									<TableCell style={{ display: "flex", justifyContent: "flex-end", gap: 20 }}>
										<Button onClick={() => {
											setCheckedStudent(student)
											setOpenStudentInfoDialog(true)
										}} variant="outlined" color="primary">Информация</Button>
										<Button onClick={() => {
											setCheckedStudent(student)
											setOpenReportDialog(true)
										}} variant="outlined" color="warning">Отчет</Button>
										{/* <Button onClick={() => {
											setCheckedStudent(student)
											setOpenPaymentDialog(true)
										}} variant="outlined" color="success">Оплата</Button> */}
										<PayDialog student={student} />
										<DeleteDialog dialogTitle="Удалить студента" onDelete={() => deleteStudent(student.id)} />
									</TableCell>
								</TableRow>
							}
							)}
						</TableBody>
					</Table>
				</TableContainer>
			</Layout>
			{openStudentInfoDialog && checkedStudent && <StudentInfoDialog open={openStudentInfoDialog} setOpen={setOpenStudentInfoDialog} student={checkedStudent} />}
			{openReportDialog && checkedStudent && <ReportInfoDialog open={openReportDialog} setOpen={setOpenReportDialog} student={checkedStudent} />}
		</div >
	)
}

export default Students