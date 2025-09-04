import "./DayCell.styles.scss"
import { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

enum LessonStatus {
	PENDING = "PENDING",
	COMPLETED = "COMPLETED",
	CANCELLED = "CANCELLED",
}

export const DayCell = ({ hour, hourUTC3, day, selectedPeriod, onClick }: { hour: string, hourUTC3: string, day: number, selectedPeriod: Dayjs, onClick: () => void }) => {
	const year = selectedPeriod.year();
	const month = selectedPeriod.month();
	const hourNumber = Number(hourUTC3.split(":")[0]);
	const minute = Number(hourUTC3.split(":")[1]);
	const date = new Date(Date.UTC(year, month, day, hourNumber - 3, minute)); // приводим к UTC+0
	const utcString = date.toISOString();

	const { data: lessons, } = useQuery({
		queryKey: ["lessons", selectedPeriod],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/lessons?start_date=${selectedPeriod.startOf('month').toISOString()}&end_date=${selectedPeriod.endOf('month').toISOString()}`)
		},
	})

	const currentLessons = lessons?.data.filter((lesson: any) => {
		return lesson.start_date === utcString
	});

	let statusClass = "";
	if (lessons) {
		if (currentLessons[0]?.status === LessonStatus.COMPLETED) {
			statusClass = "status-completed";
		} else if (currentLessons[0]?.status === LessonStatus.CANCELLED) {
			statusClass = "status-cancelled";
		} else if (currentLessons[0]?.status === LessonStatus.PENDING) {
			statusClass = "status-pending";
		}
	}
	const isLunchTime = Number(hour.split(":")[0]) === 12;
	const currentMonth = new Date().getMonth();
	const isNowMonth =  currentMonth === new Date(selectedPeriod.toDate())?.getMonth()
	const isToday = selectedPeriod?.date() === day;

	const cellContent = lessons && <>
		{currentLessons[0] &&<div key={currentLessons[0]?.id}>{currentLessons[0]?.student.name} {currentLessons[0]?.student.class} класс</div>}
		{currentLessons[1] &&<div className="separator"></div>}
		{currentLessons[1] && <div key={currentLessons[1]?.id}>{currentLessons[1]?.student.name} {currentLessons[1]?.student.class} класс</div>}
	</>
	return (
		<div className={`day ${isLunchTime ? "lunch" : ""} ${statusClass} ${isToday && isNowMonth ? "today-day" : ""}`} onClick={onClick}>
			{cellContent}
		</div>
	)
}
