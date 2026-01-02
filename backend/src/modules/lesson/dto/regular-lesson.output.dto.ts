import { IsArray, IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ToUTC } from "src/core/decorators/transform/to-utc.decorator";
import { WeekDay } from "./regular-lesson.input.dto";

export class RegularLessonOutputDto {
	id: number;
	plan_id: number;
	student_id: number;
	teacher_id: number;
	start_time: string;
	week_day: WeekDay;
	start_period_date: Date;
	end_period_date: Date;
}
