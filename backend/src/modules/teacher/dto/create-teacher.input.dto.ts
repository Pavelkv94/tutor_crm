import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Timezone } from "./teacher.output.dto";

export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty()
	@ApiProperty({
		description: "The login of the teacher",
		example: "teacher123",
	})
  login: string;

  @IsString()
  @IsNotEmpty()
	@ApiProperty({
		description: "The password of the teacher",
		example: "password123",
	})
  password: string;

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