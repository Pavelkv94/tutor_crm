import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ToUTC } from "src/core/decorators/transform/to-utc.decorator";
import { LessonInputStatusDto } from "./lesson-status.enum";

export class SingleLessonInputDto {
	@IsInt()
	@IsNotEmpty()
	plan_id: number;

	@IsString()
	@IsNotEmpty()
	@ToUTC()
	start_date: string;
 
	@IsInt()
	@IsNotEmpty()
	student_id: number;

	@IsInt()
	@IsNotEmpty()
	teacher_id: number;

	@IsString()
	@IsNotEmpty()
	@ToUTC()
	corrected_time: string;

	@IsEnum(LessonInputStatusDto)
	@IsNotEmpty()
	status: LessonInputStatusDto;

	@IsInt()
	@IsOptional()
	rescheduled_lesson_id: number | null;

	@IsString()
	@IsOptional()
	@ToUTC()
	rescheduled_lesson_date: string | null;
}
