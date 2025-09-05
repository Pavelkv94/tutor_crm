import "./DayCell.styles.scss"
import { Dayjs } from "dayjs";
import { convertToUTC } from "../convertToUTC";

enum LessonStatus {
	PENDING = "PENDING",
	COMPLETED = "COMPLETED",
	CANCELLED = "CANCELLED",
}

export const DayCell = ({ hour, hourUTC3, day, selectedPeriod, onClick, lessons }: { hour: string, hourUTC3: string, day: number, selectedPeriod: Dayjs, onClick: () => void, lessons: any }) => {

	const startDateUTC0 = convertToUTC(selectedPeriod, day, hourUTC3);

	const currentLessonsWithCanceled = lessons?.data.filter((lesson: any) => {
		return lesson.start_date === startDateUTC0
	});

	const actualLessons = currentLessonsWithCanceled.filter((lesson: any) => lesson.status !== LessonStatus.CANCELLED);

	let statusClass = "";
	if (lessons) {
		if (actualLessons[0]?.status === LessonStatus.COMPLETED) {
			statusClass = "status-completed";
		} else if (actualLessons[0]?.status === LessonStatus.PENDING) {
			statusClass = "status-pending";
		} else if (currentLessonsWithCanceled.length > 0) {
			statusClass = "status-cancelled";
		}
	}
	const isLunchTime = Number(hour.split(":")[0]) === 12;
	const currentMonth = new Date().getMonth();
	const isNowMonth =  currentMonth === new Date(selectedPeriod.toDate())?.getMonth()
	const isToday = selectedPeriod?.date() === day;

	return (
		<div className={`day ${isLunchTime ? "lunch" : ""} ${statusClass} ${isToday && isNowMonth ? "today-day" : ""}`} onClick={onClick}>
			{currentLessonsWithCanceled.map((lesson: any) => (
				<div key={lesson.id}>{lesson.student.name} {lesson.student.class} класс <span style={{ color: lesson.status === LessonStatus.CANCELLED ? "red" : "black" }}>{lesson.status === LessonStatus.CANCELLED && "(Canceled)"}</span></div>
			))}
		</div>
	)
}
