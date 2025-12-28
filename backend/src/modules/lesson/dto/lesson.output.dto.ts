import { LessonStatusDto } from "./lesson-status.enum";
import { ApiProperty } from "@nestjs/swagger";

export class LessonOutputDto {
	@ApiProperty({
		description: "Lesson ID",
		example: 1,
	})
	id: number;
	@ApiProperty({
		description: "Plan ID",
		example: 1,
	})
	plan_id: number;
	@ApiProperty({
		description: "Start date",
		example: new Date(),
	})
	start_date: Date;
	@ApiProperty({
		description: "Student ID",
		example: 1,
	})
	student_id: number;
	@ApiProperty({
		description: "Teacher ID",
		example: 1,
	})
	teacher_id: number;
	@ApiProperty({
		description: "Corrected time",
		example: new Date(),
	})
	corrected_time: Date;
	@ApiProperty({
		description: "Status",
		example: LessonStatusDto.PENDING_PAID,
	})
	status: LessonStatusDto;
	@ApiProperty({
		description: "Comment",
		example: "Comment",
	})
	comment: string | null;
	@ApiProperty({
		description: "Payment status",
		example: true,
	})
	payment_status: boolean;
	@ApiProperty({
		description: "Is paid",
		example: true,
	})
	is_paid: boolean;
	@ApiProperty({
		description: "Is regular",
		example: true,
	})
	is_regular: boolean;
	@ApiProperty({
		description: "Is free",
		example: true,
	})
	is_free: boolean;
	@ApiProperty({
		description: "Rescheduled lesson ID",
		example: 1,
	})
	rescheduled_lesson_id: number | null;
	@ApiProperty({
		description: "Rescheduled lesson date",
		example: new Date(),
	})
	rescheduled_lesson_date: Date | null;
	@ApiProperty({
		description: "Rescheduled to lesson ID",
		example: 1,
	})
	rescheduled_to_lesson_id: number | null;
	@ApiProperty({
		description: "Rescheduled to lesson date",
		example: new Date(),
	})
	rescheduled_to_lesson_date: Date | null;
	@ApiProperty({
		description: "Created at",
		example: new Date(),
	})
	@ApiProperty({
		description: "Created at",
		example: new Date(),
	})
	created_at: Date;
}