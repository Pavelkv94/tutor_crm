import { IsArray, IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ToUTC } from "src/core/decorators/transform/to-utc.decorator";

export enum WeekDay {
	MONDAY = "MONDAY",
	TUESDAY = "TUESDAY",
	WEDNESDAY = "WEDNESDAY",
	THURSDAY = "THURSDAY",
	FRIDAY = "FRIDAY",
	SATURDAY = "SATURDAY",
	SUNDAY = "SUNDAY",
}

export class RegularLessonInputDto {
	@IsInt()
	@IsNotEmpty()
	teacher_id: number;

	@IsInt()
	@IsNotEmpty()
	plan_id: number;

	@IsString()
	@IsNotEmpty()
	start_time: string;

	@IsEnum(WeekDay)
	@IsNotEmpty()
	week_day: WeekDay;

	@IsDate()
	@IsNotEmpty()
	@ToUTC()
	start_period_date: string;

	@IsDate()
	@IsNotEmpty()
	@ToUTC()
	end_period_date: string;
}

export class RegularLessonsInputDto {
	@IsArray()
	@IsNotEmpty()
	lessons: RegularLessonInputDto[];
}