import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum CancelationStatusEnum {
	MISSED = "MISSED",
	RESCHEDULED = "RESCHEDULED",
	CANCELLED = "CANCELLED",
}

export class CancelLessonDto {
	@IsString()
	@IsOptional()
	comment: string;

	@IsEnum(CancelationStatusEnum)
	@IsNotEmpty()
	status: CancelationStatusEnum;
}