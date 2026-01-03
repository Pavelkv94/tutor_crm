import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty } from "class-validator";

export class ChangeTeacherDto {
	@ApiProperty({
		description: "Teacher ID",
		example: 1,
	})
	@IsInt()
	@IsNotEmpty()
	teacher_id: number;
}