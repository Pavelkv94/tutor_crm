import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

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

	@IsString()
	@IsOptional()
	@ApiProperty({
		description: "The telegram id of the teacher",
		example: "1234567890",
	})
	telegram_id: string | null;
}