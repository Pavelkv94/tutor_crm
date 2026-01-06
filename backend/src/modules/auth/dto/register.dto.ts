import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { CreateTeacherDto } from "src/modules/teacher/dto/create-teacher.input.dto";




export class RegisterAdminDto {

	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "The login of the admin",
		example: "admin123",
	})
	login: string;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "The password of the admin",
		example: "password123",
	})
	password: string;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "The name of the admin",
		example: "John Doe",
	})
	name: string;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "The secret key for the admin",
		example: "1234567890",
	})
	secret_key: string;
}