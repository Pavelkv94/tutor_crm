import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Layout from '../layout/Layout'
import { StudentDialog } from './StudentDialog'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import Backdrop from '@mui/material/Backdrop'
import CircularProgress from '@mui/material/CircularProgress'
import TableBody from '@mui/material/TableBody'
import dayjs from 'dayjs'
import './Students.styles.scss'

const Students = () => {
	const { data, isLoading, isError } = useQuery({
		queryKey: ["students"],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/students`)
		},
	})

	if (isLoading) return <Backdrop
		sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
		open={isLoading}
	>
		<CircularProgress color="inherit" />
	</Backdrop>
	if (isError) return <div>Error</div>

	return (
		<div>
			<Layout title="Students" dialog={<StudentDialog btnTitle="Create Student" dialogTitle="Create Student" />}>
				<TableContainer component={Paper}>
					<Table sx={{ minWidth: 650 }} aria-label="simple table" size='small'>
						<TableHead>
							<TableRow sx={{ backgroundColor: "#ecf1ff" }}>
								<TableCell>Student Name</TableCell>
								<TableCell>Student Class</TableCell>
								<TableCell>Student Birth Date</TableCell>
								<TableCell>Student Balance</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{data?.data.map((student: any) => {
								const birthDate =dayjs(student.birth_date).format("DD.MM.YYYY");
								const isBirthdayToday = dayjs(student.birth_date).isSame(dayjs(new Date()), "day");

								return <TableRow key={student.id}>
									<TableCell sx={{ fontWeight: "bold" }}>{isBirthdayToday ? "🎉" : ""} {student.name} {isBirthdayToday ? "🎉" : ""}</TableCell>
									<TableCell>{student.class}</TableCell>
									<TableCell>{birthDate}</TableCell>
									<TableCell>{student.balance}</TableCell>
								</TableRow>
							}
							)}
						</TableBody>
					</Table>
				</TableContainer>
			</Layout>
		</div >
	)
}

export default Students