import "./Plans.styles.scss"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { PlanDialog } from "./PlanDialog"
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { currencies } from "@/App.constants"
import { useMutation } from "@tanstack/react-query";
import { DeleteDialog } from "../general/DeleteDialog";
import Layout from "../layout/Layout";
import Preloader from "../Preloader/Preloader";

const Plans = () => {
	const queryClient = useQueryClient()

	const { data, isLoading, isError } = useQuery({
		queryKey: ["plans"],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/plans`)
		},
	})

	const { mutate: deletePlan } = useMutation({
		mutationFn: (id: number) => {
			return axios.delete(`${import.meta.env.VITE_API_URL}/plans/${id}`)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["plans"] })
		}
	})

	if (isLoading) return <Preloader isLoading={isLoading} />
	if (isError) return <div>Error</div>

	return (
		<div className="plans">
				<Layout title="Plans" dialog={<PlanDialog btnTitle="Create Plan" dialogTitle="Create Plan" />}>
				<TableContainer component={Paper}>
					<Table sx={{ minWidth: 650 }} aria-label="simple table">
						<TableHead>
							<TableRow sx={{ backgroundColor: "#ecf1ff" }}>
								<TableCell>Plan Name</TableCell>
								<TableCell align="center">Plan Price</TableCell>
								<TableCell align="center">Plan Duration</TableCell>
								<TableCell align="center">Plan Type</TableCell>
								<TableCell align="center"></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{data?.data.map((row: any) => (
								<TableRow
									key={row.name}
									sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
								>
									<TableCell component="th" scope="row" sx={{ fontWeight: "bold" }}>
										{row.plan_name}
									</TableCell>
									<TableCell align="center">{row.plan_price} {row.plan_currency} {currencies.find((currency) => currency.label === row.plan_currency)?.flag}</TableCell>
									<TableCell align="center">{row.duration}</TableCell>
									<TableCell align="center">{row.plan_type}</TableCell>
									<TableCell align="center">
										<DeleteDialog dialogTitle="Delete" onDelete={() => deletePlan(row.id)} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
				</Layout>
		</div>
	)
}

export default Plans