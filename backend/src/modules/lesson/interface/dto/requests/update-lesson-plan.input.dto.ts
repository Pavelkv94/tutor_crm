import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString } from "class-validator";

export class UpdateLessonsPlanForPeriodDto {
	@ApiProperty({
		description: "Start date",
		example: new Date(),
	})
	@IsString()
	@IsNotEmpty()
	start_date: Date;

	@ApiProperty({
		description: "End date",
		example: new Date(),
	})
	@IsString()
	@IsNotEmpty()
	end_date: Date;

	@ApiProperty({
		description: "Plan ID",
		example: 1,
	})
	@IsInt()
	@IsNotEmpty()
	new_plan_id: number;

	@ApiProperty({
		description: "Old plan ID",
		example: 1,
	})
	@IsInt()
	@IsNotEmpty()
	old_plan_id: number;

	@ApiProperty({
		description: "Student ID",
		example: 1,
	})
	@IsInt()
	@IsNotEmpty()
	student_id: number;
}