import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString } from "class-validator";

export class LessonsCostFiltersDto {
	@ApiProperty({ description: 'The student id', example: 1 })
	@IsInt()
	student_id: number;

	@ApiProperty({ description: 'The start date', example: '2024-01-01' })
	@IsString()
	start_date: string;

	@ApiProperty({ description: 'The end date', example: '2024-01-01' })
	@IsString()
	end_date: string;
}