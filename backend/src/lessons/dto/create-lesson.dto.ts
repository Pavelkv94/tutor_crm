import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsString } from "class-validator";

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
	start_date: string;

	@IsInt()
	@IsNotEmpty()
	student_id: number;
}
