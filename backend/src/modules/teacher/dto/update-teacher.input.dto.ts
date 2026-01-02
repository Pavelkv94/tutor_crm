import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Timezone } from "./teacher.output.dto";

export class UpdateTeacherDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "The name of the teacher",
		example: "John Doe",
	})
	name: string;

	@IsString()
	@IsOptional()
	@ApiProperty({
		description: "The telegram link of the teacher",
		example: "https://t.me/teacher123",
	})
	telegram_link: string | null;

	@IsEnum(Timezone)
	@IsNotEmpty()
	@ApiProperty({
		description: "The timezone of the teacher",
		example: "BY",
	})
	timezone: Timezone;
}