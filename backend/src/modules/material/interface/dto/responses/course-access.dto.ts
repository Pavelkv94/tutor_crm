import { ApiProperty } from "@nestjs/swagger";

export class CourseAccessTeacherDto {
	@ApiProperty({ description: "The id of the teacher", example: 1 })
	id: number;

	@ApiProperty({ description: "The name of the teacher", example: "John Doe" })
	name: string;
}
