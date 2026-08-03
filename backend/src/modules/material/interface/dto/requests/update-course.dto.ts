import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength, MaxLength } from "class-validator";

export class UpdateCourseDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(255)
	@ApiProperty({ description: 'The name of the course', example: 'Course 1' })
	name: string;
}
