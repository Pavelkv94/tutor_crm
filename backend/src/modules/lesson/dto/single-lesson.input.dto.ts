import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ToUTC } from "src/core/decorators/transform/to-utc.decorator";
import { LessonInputStatusEnum } from "./lesson-status.enum";
import { ApiProperty } from "@nestjs/swagger";

export class SingleLessonInputDto {
	@ApiProperty({
		description: "Plan ID",
		example: 1,
	})
	@IsInt()
	@IsNotEmpty()
	plan_id: number;

	@ApiProperty({
		description: "Student ID",
		example: 1,
	})
	@IsInt()
	@IsNotEmpty()
	student_id: number;

	@ApiProperty({
		description: "Teacher ID",
		example: 1,
	})
	@IsInt()
	@IsNotEmpty()
	teacher_id: number;

	@ApiProperty({
		description: "Start date",
		example: new Date(),
	})
	@IsString()
	@IsNotEmpty()
	@ToUTC()
	start_date: Date;

	@ApiProperty({
		description: "Is free",
		example: true,
	})
	@IsBoolean()
	@IsNotEmpty()
	isFree: boolean;

	@ApiProperty({
		description: "Is trial",
		example: true,
	})

	@IsBoolean()
	@IsNotEmpty()
	isTrial: boolean;
}
