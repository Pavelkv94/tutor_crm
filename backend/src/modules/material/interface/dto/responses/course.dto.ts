import { ApiProperty } from "@nestjs/swagger";

export class CourseDto {
	@ApiProperty({ description: 'The id of the course', example: 1 })
	id: number;
	@ApiProperty({ description: 'The name of the course', example: 'Course 1' })
	name: string;
	@ApiProperty({ description: 'The creation date of the course', example: '2026-01-01T00:00:00.000Z' })
	created_at: Date;
}
