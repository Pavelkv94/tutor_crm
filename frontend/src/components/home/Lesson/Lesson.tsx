import Typography from "@mui/material/Typography";
import "./Lesson.styles.scss"
import { Dayjs } from "dayjs";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import { DayPicker } from "react-day-picker";
import Preloader from "@/components/Preloader/Preloader";

type Lesson = {
	hour: string;
	hourUTC3: string;
	day: number;
	selectedPeriod: Dayjs;
	weekDay: string;
}

type LessonBodyType = {
	student_id: string;
	plan_id: string;
}

export const Lesson = ({ lesson, onClose }: { lesson: Lesson, onClose: () => void }) => {
	const [lessonBody, setLessonBody] = useState<LessonBodyType>({
		student_id: "",
		plan_id: "",
	})

	const selectedDay = lesson.day < 10 ? `0${lesson.day}` : lesson.day;

	const [specificDays, setSpecificDays] = useState<Date[]>([]);
	const [bookUntilCancellation, setBookUntilCancellation] = useState<boolean>(false);
	const [bookSpecificDays, setBookSpecificDays] = useState<boolean>(false);

	const { data: plans, isLoading: isLoadingPlans } = useQuery({
		queryKey: ["plans"],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/plans`)
		},
	})

	const { data: students, isLoading: isLoadingStudents } = useQuery({
		queryKey: ["students"],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/students`)
		},
	})

	const queryClient = useQueryClient()

	const { mutate: createLesson } = useMutation({
		mutationFn: (lesson: any) => {
			return axios.post(`${import.meta.env.VITE_API_URL}/lessons`, lesson)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["lessons", lesson.selectedPeriod] })
		}
	})

	const studentsOptions = students?.data.map((student: any) => ({
		label: `${student.name} (${student.class} класс)`,
		value: student.id,
	}))
	const plansOptions = plans?.data.map((plan: any) => ({
		label: plan.plan_name,
		value: plan.id,
	}))

	const handleCreateLesson = () => {
		const year = lesson.selectedPeriod.year();
		const month = lesson.selectedPeriod.month();
		const day = lesson.day;
		const hour = Number(lesson.hourUTC3.split(":")[0]);
		const minute = Number(lesson.hourUTC3.split(":")[1]);
		const date = new Date(Date.UTC(year, month, day, hour - 3, minute)); // приводим к UTC+0
		const utcString = date.toISOString();

		createLesson({
			...lessonBody,
			start_date: utcString,
			bookUntilCancellation: bookUntilCancellation,
			specificDays: specificDays,
		})
		onClose()
	}

	const isButtonDisabled = !lessonBody.student_id || !lessonBody.plan_id || (bookSpecificDays && specificDays.length === 0)

	if (isLoadingStudents || isLoadingPlans) return <Preloader isLoading={isLoadingStudents || isLoadingPlans} />

	return (
		<div className="lesson">
			<Typography variant="h6" style={{ marginBottom: 10 }}>Lesson</Typography>

			<section>
				<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
					<Typography style={{ margin: 0 }}>Choosen Date</Typography>
					<Typography style={{ margin: 0, backgroundColor: "#f0f0f0", padding: 10, borderRadius: 5 }}>
						{selectedDay}.{lesson.selectedPeriod.format("MM.YYYY")} {lesson.hourUTC3}, {lesson.weekDay}
					</Typography>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
					<Typography style={{ margin: 0 }}>Student</Typography>
					<Select
						size="small"
						value={lessonBody.student_id}
						inputProps={{ 'aria-label': 'Without label' }}
						onChange={(e) => setLessonBody({ ...lessonBody, student_id: e.target.value as string })}
					>
						{studentsOptions.map((student: any, index: number) => <MenuItem key={index} value={student.value}>{student.label}</MenuItem>)}
					</Select>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
					<Typography style={{ margin: 0 }}>Plan</Typography>
					<Select
						size="small"
						value={lessonBody.plan_id}
						inputProps={{ 'aria-label': 'Without label' }}
						onChange={(e) => setLessonBody({ ...lessonBody, plan_id: e.target.value as string })}
					>
						{plansOptions.map((plan: any, index: number) => <MenuItem key={index} value={plan.value}>{plan.label}</MenuItem>)}
					</Select>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Checkbox checked={bookUntilCancellation} onChange={(e) => {
						setBookUntilCancellation(e.target.checked)
						setBookSpecificDays(false)
						setSpecificDays([])
					}} />
					<Typography style={{ margin: 0 }}>Book Lesson until cancellation</Typography>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Checkbox checked={bookSpecificDays} onChange={(e) => {
						setBookSpecificDays(e.target.checked)
						setBookUntilCancellation(false)
						setSpecificDays([])
					}} />
					<Typography style={{ margin: 0 }}>Book specific days</Typography>
				</div>
				{bookSpecificDays &&
					<div>
						{specificDays.length > 0 && <Typography style={{ margin: 0, backgroundColor: "#f0f0f0", padding: 10, borderRadius: 5, fontSize: 12 }}>
							{specificDays
								.map((day) =>
									day.toLocaleDateString("ru-RU", {
										day: "2-digit",
										month: "2-digit",
										year: "numeric"
									})
								)
								.join(", ")}
						</Typography>}
						<div style={{ display: "flex", justifyContent: "center" }}>
							<DayPicker
								ISOWeek
								mode="multiple"
								required={true}
								selected={specificDays}
								onSelect={setSpecificDays}
							/>
						</div>
					</div>
				}


				<Button variant="contained" color="primary" onClick={handleCreateLesson} disabled={isButtonDisabled}>Create Lesson</Button>
			</section>
		</div>
	)
}