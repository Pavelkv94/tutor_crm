import { LessonStatusEnum } from "./lesson-status.enum";
import { ApiProperty } from "@nestjs/swagger";
import { StudentOutputDto } from "../../student/dto/student.output.dto";
import { PlanOutputDto } from "../../plan/dto/plan.output.dto";

class TeacherBasicOutputDto {
	@ApiProperty({ description: "The id of the teacher", example: 1 })
	id: number;

	@ApiProperty({ description: "The name of the teacher", example: "John Doe" })
	name: string;
}

export class LessonOutputDto {
	@ApiProperty({
		description: "Lesson ID",
		example: 1,
	})
	id: number;

	@ApiProperty({
		description: "Student information",
		type: () => StudentOutputDto,
	})
	student: StudentOutputDto;

	@ApiProperty({
		description: "Plan information",
		type: () => PlanOutputDto,
	})
	plan: PlanOutputDto;

	@ApiProperty({
		description: "Start date with time",
		example: new Date(),
	})
	date: Date;

	@ApiProperty({
		description: "Status",
		example: LessonStatusEnum.PENDING_PAID,
	})
	status: LessonStatusEnum;

	@ApiProperty({
		description: "Comment",
		example: "Comment",
		nullable: true,
	})
	comment: string | null;

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
		description: "Is trial",
		example: true,
	})
	is_trial: boolean;

	@ApiProperty({
		description: "Rescheduled lesson ID",
		example: 1,
		nullable: true,
	})
	rescheduled_lesson_id: number | null;

	@ApiProperty({
		description: "Rescheduled lesson date",
		example: new Date(),
		nullable: true,
	})
	rescheduled_lesson_date: Date | null;

	@ApiProperty({
		description: "Rescheduled to lesson ID",
		example: 1,
		nullable: true,
	})
	rescheduled_to_lesson_id: number | null;

	@ApiProperty({
		description: "Rescheduled to lesson date",
		example: new Date(),
		nullable: true,
	})
	rescheduled_to_lesson_date: Date | null;

	@ApiProperty({
		description: "Created at",
		example: new Date(),
	})
	created_at: Date;

	@ApiProperty({
		description: "Teacher information",
		type: () => TeacherBasicOutputDto,
	})
	teacher: TeacherBasicOutputDto;
}