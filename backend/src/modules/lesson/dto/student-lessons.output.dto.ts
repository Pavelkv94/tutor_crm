import { ApiProperty } from "@nestjs/swagger";

export class StudentLessonsOutputDto {
	@ApiProperty({
		description: "Student ID",
		example: 1,
	})
	id: number;
	@ApiProperty({
		description: "Student name",
		example: "John Doe",
	})
	name: string;
	@ApiProperty({
		description: "Student class",
		example: 1,
	})
	class: number;
	@ApiProperty({
		description: "Canceled lessons",
		example: 1,
	})
	canceled_lessons: number;
	@ApiProperty({
		description: "Missed lessons",
		example: 1,
	})
	missed_lessons: number;
}