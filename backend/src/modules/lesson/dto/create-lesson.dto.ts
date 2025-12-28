import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ToUTC } from "src/core/decorators/transform/to-utc.decorator";

export class CreateLessonDto {
	@IsBoolean()
	@IsNotEmpty()
	bookUntilCancellation: boolean;

	@IsInt()
	@IsNotEmpty()
	plan_id: number;

	@IsArray()
	@IsNotEmpty()
	specificDays: string[];

	@IsString()
	@IsNotEmpty()
	@ToUTC()
	start_date: string;

	@IsInt()
	@IsNotEmpty()
	student_id: number;

	@IsString()
	@IsNotEmpty()
	corrected_time: string;

	@IsInt()
	@IsOptional()
	rescheduled_lesson_id: number | null;

	@IsString()
	@IsOptional()
	rescheduled_lesson_date: string | null;
}
