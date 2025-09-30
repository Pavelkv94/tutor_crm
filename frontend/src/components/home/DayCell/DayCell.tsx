import "./DayCell.styles.scss"
import { Dayjs } from "dayjs";
import { convertToUTC0 } from "../convertToUTC";
import { convertToHmToUTC } from "../convertToHmToUTC";
import { LessonStatus } from "@/App.constants";

const cancelationMessages: Record<Exclude<LessonStatus, LessonStatus.COMPLETED | LessonStatus.PENDING>, string> = {
	[LessonStatus.CANCELLED]: "(ОТМЕНА)",
	[LessonStatus.MISSED]: "(ПРОГУЛ)",
	[LessonStatus.RESCHEDULED]: "(ПЕРЕНОС)",
}

export const DayCell = ({ hour, hourUTC3, day, selectedPeriod, onClick, lessons }: { hour: string, hourUTC3: string, day: number, selectedPeriod: Dayjs, onClick: () => void, lessons: any }) => {

	const startDateUTC0 = convertToUTC0(selectedPeriod, day, hourUTC3);

	const currentLessonsWithCanceled = lessons?.data.filter((lesson: any) => {
		return lesson.start_date === startDateUTC0
	});

	const actualLessons = currentLessonsWithCanceled.filter((lesson: any) => lesson.status !== LessonStatus.CANCELLED);

	let statusClass = "";
	if (lessons) {
		if (actualLessons[0]?.status === LessonStatus.COMPLETED) {
			statusClass = "status-completed-paid";
		} else if (actualLessons[0]?.status === LessonStatus.PENDING) {
			statusClass = "status-pending-paid";
		} else if (actualLessons[0]?.status === LessonStatus.MISSED) {
			statusClass = "status-missed";
		} else if (actualLessons[0]?.status === LessonStatus.RESCHEDULED) {
			statusClass = "status-rescheduled";
		} else if (currentLessonsWithCanceled.length > 0) {
			statusClass = "status-cancelled";
		}
	}
	const isLunchTime = Number(hour.split(":")[0]) === 12;
	const currentMonth = new Date().getMonth();
	const isNowMonth = currentMonth === new Date(selectedPeriod.toDate())?.getMonth()
	const isToday = selectedPeriod?.date() === day;

	const isNotCompleted = (status: LessonStatus) => {
		return status !== LessonStatus.COMPLETED && status !== LessonStatus.PENDING;
	}
	return (
		<div className={`day ${isLunchTime ? "lunch" : ""} ${statusClass} ${isToday && isNowMonth ? "today-day" : ""}`} onClick={onClick}>
			{currentLessonsWithCanceled.map((lesson: any) => (
				<div key={lesson.id}>[{convertToHmToUTC(lesson.corrected_time)}] {lesson.student.name} {lesson.student.class}кл {lesson.plan.duration} мин
					<span style={{ color: isNotCompleted(lesson.status) ? "red" : "black" }}>
						{isNotCompleted(lesson.status) && cancelationMessages[lesson.status as Exclude<LessonStatus, LessonStatus.COMPLETED | LessonStatus.PENDING> as keyof typeof cancelationMessages]}
						{lesson.rescheduled_lesson_date && <span style={{ color: "blue" }}>(ОТРАБОТКА)</span>}
					</span>
				</div>
			))}
		</div>
	)
}
