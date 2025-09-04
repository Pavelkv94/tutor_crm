import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';


export class CreateStudentDto {

	@ApiProperty({ description: 'The name of the student' , example: 'John Doe' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ description: 'The class of the student' , example: '1A' })
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'The class of the student' })
	class: string;

	@ApiProperty({ description: 'The birth date of the student' , example: '2000-01-01' })
	@IsString()
	@IsNotEmpty()
	birth_date: string;
}
