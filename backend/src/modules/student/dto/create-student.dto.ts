import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';


export class CreateStudentDto {

	@ApiProperty({ description: 'The name of the student', example: 'John Doe' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ description: 'The class of the student', example: 1 })
	@IsInt()
	@IsNotEmpty()
	class: number;

	@ApiProperty({ description: 'The birth date of the student', example: new Date('2000-01-01') })
	@Type(() => Date)
	@IsDate()
	@IsOptional()
	birth_date: Date | null;

	@ApiProperty({ description: 'The teacher id of the student', example: 1 })
	@IsInt()
	@IsNotEmpty()
	teacher_id: number;
}
