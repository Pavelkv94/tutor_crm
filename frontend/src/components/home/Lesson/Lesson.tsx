import Typography from "@mui/material/Typography";
import "./Lesson.styles.scss"
import { Dayjs } from "dayjs";
import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import { DayPicker } from "react-day-picker";
import { useNotification } from "@/components/notifier/NotificationProvider";
import { convertToUTC } from "../convertToUTC";
import { PlanType } from "@/App.constants";
import { LessonStatus } from "@/App.constants";
import { InfoLessonCard } from "./InfoLessonCard/InfoLessonCard";
import { queryClient } from "@/main";

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

export const Lesson = ({ lesson, onClose, selectedPeriod, plans, students }: { lesson: Lesson, onClose: () => void, selectedPeriod: Dayjs, plans: any, students: any }) => {

	const notify = useNotification();

	const startDateUTC0 = convertToUTC(lesson.selectedPeriod, lesson.day, lesson.hourUTC3);
	const { data: assignedLessons } = useQuery({
		queryKey: ["lessons", "assigned", startDateUTC0],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/lessons/assigned?start_date=${startDateUTC0}`)
		},
	})

	const plannedLessons = assignedLessons?.data?.filter((lesson: any) => lesson.status !== LessonStatus.CANCELLED)
	const canceledLessons = assignedLessons?.data?.filter((lesson: any) => lesson.status === LessonStatus.CANCELLED)
	const isInfoModeIndividual = plannedLessons?.length === 1 && plannedLessons[0]?.plan.plan_type === PlanType.INDIVIDUAL;
	const isInfoModePair = plannedLessons?.length === 2 && plannedLessons[0]?.plan.plan_type === PlanType.PAIR;
	const isInfoMode = isInfoModeIndividual || isInfoModePair;

	const [lessonBody, setLessonBody] = useState<LessonBodyType>({
		student_id: "",
		plan_id: "",
	})

	const selectedDay = lesson.day < 10 ? `0${lesson.day}` : lesson.day;

	const [specificDays, setSpecificDays] = useState<Date[]>([]);
	const [bookUntilCancellation, setBookUntilCancellation] = useState<boolean>(false);
	const [bookSpecificDays, setBookSpecificDays] = useState<boolean>(false);

	const { mutate: createLesson } = useMutation({
		mutationFn: (lesson: any) => {
			return axios.post(`${import.meta.env.VITE_API_URL}/lessons`, lesson)
		},
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ["lessons", lesson.selectedPeriod] })
			notify("Lesson created successfully", "success")
			console.log(response)
		},
		onError: (error) => {
			notify((error as any)?.response?.data?.message, "error")
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
		createLesson({
			...lessonBody,
			start_date: startDateUTC0,
			bookUntilCancellation: bookUntilCancellation,
			specificDays: specificDays,
		})
		onClose()
	}

	const isButtonDisabled = !lessonBody.student_id || !lessonBody.plan_id || (bookSpecificDays && specificDays.length === 0)

	return (
		<div className="lesson">
			<div className="lesson-header">
				<Typography variant="h6">Lesson</Typography>
				<Typography style={{ margin: 0, backgroundColor: "#f0f0f0", padding: 4, borderRadius: 5, border: "1px solid #e0e0e0" }}>
					{selectedDay}.{lesson.selectedPeriod.format("MM.YYYY")} {lesson.hourUTC3}, {lesson.weekDay}
				</Typography>
			</div>
			<div className="lesson-container">
				{(isInfoMode || canceledLessons?.length > 0) && <section className="lesson-info">
					{assignedLessons?.data.map((lesson: any, index: number) =>
						<InfoLessonCard lesson={lesson} startDateUTC0={startDateUTC0} index={index} selectedPeriod={selectedPeriod} />
					)}
				</section>}
				{!isInfoMode && <section className="lesson-form">
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
				</section>}
			</div>
		</div>
	)
}