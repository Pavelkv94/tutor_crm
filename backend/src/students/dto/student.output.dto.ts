import { ApiProperty } from "@nestjs/swagger";

export class StudentOutputDto {
	@ApiProperty({ description: 'The id of the student', example: 1 })
	id: number;
	@ApiProperty({ description: 'The name of the student' , example: 'John Doe' })
	name: string;
	@ApiProperty({ description: 'The class of the student' , example: '1A' })
	class: string;
	@ApiProperty({ description: 'The birth date of the student' , example: '2000-01-01' })
	birth_date: string;
	@ApiProperty({ description: 'The balance of the student' , example: 0 })
	balance: number;
}