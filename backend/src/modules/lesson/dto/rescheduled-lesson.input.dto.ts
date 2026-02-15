import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ToUTC } from "src/core/decorators/transform/to-utc.decorator";

export class RescheduledLessonInputDto {
	@ApiProperty({
		description: "Rescheduled lesson ID",
		example: 1,
	})
	@IsInt()
	@IsNotEmpty()
	rescheduled_lesson_id: number;

	@IsInt()
	@IsOptional()
	teacher_id?: number;

	@ApiProperty({
		description: "Rescheduled lesson date",
		example: new Date(),
	})
	@IsString()
	@IsNotEmpty()
	@ToUTC()
	start_date: Date;
} 