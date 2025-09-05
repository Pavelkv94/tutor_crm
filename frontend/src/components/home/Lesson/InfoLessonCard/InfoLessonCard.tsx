import { TextareaAutosize, Typography } from "@mui/material"
import Card from "@mui/material/Card";
import { LessonStatus } from "@/App.constants";
import { Button } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useNotification } from "@/components/notifier/NotificationProvider";
import { useState } from "react";
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Dayjs } from "dayjs";

export const InfoLessonCard = ({ lesson, startDateUTC0, index, selectedPeriod }: { lesson: any, startDateUTC0: string, index: number, selectedPeriod: Dayjs }) => {
	const queryClient = useQueryClient()
	const notify = useNotification()

	const [openTextarea, setOpenTextarea] = useState(false)
	const [comment, setComment] = useState("")

	const { mutate: cancelLesson } = useMutation({
		mutationFn: ({ id, comment }: { id: number, comment: string }) => {
			return axios.patch(`${import.meta.env.VITE_API_URL}/lessons/${id}/cancel`, { comment })
		},
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ["lessons", "assigned", startDateUTC0] })
			queryClient.invalidateQueries({ queryKey: ["lessons", selectedPeriod] })
			notify("Lesson cancelled successfully", "success")
			console.log(response)
		},
		onError: (error) => {
			notify((error as any)?.response?.data?.message, "error")
		}
	})

	const statusColors = {
		[LessonStatus.PENDING]: "#000",
		[LessonStatus.COMPLETED]: "#0abf00",
		[LessonStatus.CANCELLED]: "#e30000",
	}

	const handleCancelLesson = (lesson: any) => {
		cancelLesson({ id: lesson.id, comment: comment })
		setOpenTextarea(false)
		setComment("")
	}

	const backgroundColor = lesson.status === LessonStatus.CANCELLED ? "#fdd5d5" : "#d5f4fd";

	const [openCard, setOpenCard] = useState(true)
	return (
		!openCard ? <Card variant="outlined" style={{ padding: 10, backgroundColor: backgroundColor, cursor: "pointer" }} onClick={() => setOpenCard(true)}>
			<Typography fontSize={14}><b>Canceled Lesson {index + 1}</b></Typography>
		</Card> :
			<Card variant="outlined" style={{ padding: 10, backgroundColor: backgroundColor, position: "relative" }}>
				{<ExpandLessIcon onClick={() => setOpenCard(false)} style={{ cursor: "pointer", position: "absolute", top: 10, right: 10 }} />}
				<Typography fontSize={18}><b>Student:</b> {lesson.student.name}</Typography>
				<Typography fontSize={18}><b>Class:</b> {lesson.student.class}</Typography>
				<Typography fontSize={18}><b>Plan Type:</b> {lesson.plan.plan_type}</Typography>
				<Typography fontSize={18}><b>Plan Price:</b> {lesson.plan.plan_price} {lesson.plan.plan_currency}</Typography>
				<Typography fontSize={18}><b>Plan Duration:</b> {lesson.plan.duration} minutes</Typography>
				<Typography fontSize={18}><b>Status:</b> <span style={{ color: statusColors[lesson.status as LessonStatus] }}>{lesson.status}</span></Typography>
				{lesson.comment && <Typography fontSize={16}><b>Comment:</b> {lesson.comment}</Typography>}
				<br />
				{openTextarea && <TextareaAutosize
					placeholder="Set comment about cancellation reason"
					value={comment}
					onChange={(e) => setComment(e.target.value)}
					minRows={3}
					style={{ width: "100%", resize: "vertical" }}
				/>}
				{!openTextarea && <Button variant="contained" size="small" color="error" disabled={lesson.status === LessonStatus.CANCELLED} onClick={() => {
					setOpenTextarea(true)
				}}>Cancel Lesson</Button>}
				{openTextarea && <Button variant="contained" size="small" color="error" disabled={lesson.status === LessonStatus.CANCELLED} onClick={() => {
					handleCancelLesson(lesson)
				}}>Cancel Lesson</Button>}
			</Card>)
}