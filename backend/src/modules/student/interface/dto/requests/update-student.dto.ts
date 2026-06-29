import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from '@/modules/student/interface/dto/requests/create-student.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
	@ApiProperty({ description: 'The birth date of the student', example: new Date('2000-01-01') })
	@Type(() => Date)
	@IsDate()
	@IsOptional()
	birth_date: Date | null;
}
