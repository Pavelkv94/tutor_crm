import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Timezone } from "../responses/teacher.dto";

export class UpdateTeacherDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "The name of the teacher",
		example: "John Doe",
	})
	name: string;

	@IsEnum(Timezone)
	@IsNotEmpty()
	@ApiProperty({
		description: "The timezone of the teacher",
		example: "BY",
	})
	timezone: Timezone;
}