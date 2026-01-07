import { IsDate } from "class-validator";
import { WeekDay } from "./regular-lesson.input.dto";
import { PlanOutputDto } from "src/modules/plan/dto/plan.output.dto";
import { ApiProperty } from "@nestjs/swagger";

export class RegularLessonOutputDto {
	@ApiProperty({
		description: "Regular lesson ID",
		example: 1,
	})
	id: number;
	@ApiProperty({
		description: "Student ID",
		example: 1,
	})
	student_id: number;
	@ApiProperty({
		description: "Teacher ID",
		example: 1,
	})
	teacher_id: number;
	@ApiProperty({
		description: "Start time",
		example: "10:00",
	})
	start_time: string;
	@ApiProperty({
		description: "Week day",
		example: "MONDAY",
	})
	week_day: WeekDay;
	@ApiProperty({
		description: "Start period date",
		example: new Date(),
	})
	start_period_date: Date;
	@ApiProperty({
		description: "End period date",
		example: new Date(),
	})
	end_period_date: Date;
	@ApiProperty({
		description: "Plan",
		example: {
			id: 1,
			plan_name: "10 minutes",
			plan_price: 1000000,
			plan_currency: "USD",
			duration: 10,
			plan_type: "INDIVIDUAL",
			deleted_at: null,
			created_at: new Date(),
		},
		type: () => PlanOutputDto,
	})
	plan: PlanOutputDto;
}
