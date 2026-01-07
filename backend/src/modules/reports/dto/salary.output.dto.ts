import { TeacherOutputDto } from "src/modules/teacher/dto/teacher.output.dto";
import { ApiProperty } from "@nestjs/swagger";

class LessonPlanOutputDto {
	@ApiProperty({ description: 'The name of the plan', example: 'Plan 1' })
	plan_name: string;
	@ApiProperty({ description: 'The price of the plan', example: 100 })
	plan_price: number;
	@ApiProperty({ description: 'The currency of the plan', example: 'USD' })
	plan_currency: string;
	@ApiProperty({ description: 'The duration of the plan', example: 10 })
	duration: number;
	@ApiProperty({ description: 'The type of the plan', example: 'INDIVIDUAL' })
	plan_type: string;
	@ApiProperty({ description: 'The number of lessons', example: 10 })
	lessons_count: number;
}

export class SalaryDataOutputDto {
	@ApiProperty({ description: 'The total number of lessons', example: 10 })
	total_lessons: number;
	@ApiProperty({ description: 'The teacher', example: { id: 1, name: 'John Doe' } })
	teacher: TeacherOutputDto;
	@ApiProperty({ description: 'The lessons', example: [{ plan_name: 'Plan 1', plan_price: 100, plan_currency: 'USD', duration: 10, plan_type: 'INDIVIDUAL', lessons_count: 10, teacher: { id: 1, name: 'John Doe' } }] })
	lessons: Array<LessonPlanOutputDto>
}