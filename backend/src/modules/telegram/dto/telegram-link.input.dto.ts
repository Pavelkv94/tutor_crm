import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional } from "class-validator";

export class TelegramLinkInputDto {
	@ApiProperty({ description: 'The teacher id', example: 1 })
	@IsInt()
	@IsOptional()
	teacher_id: number | null;

	@ApiProperty({ description: 'The student id', example: 1 })
	@IsInt()
	@IsOptional()
	student_id: number | null;
}