import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum CancelationType {
	MISSED = "MISSED",
	RESCHEDULED = "RESCHEDULED",
	CANCELLED = "CANCELLED",
}

export class CancelLessonDto {
	@IsString()
	@IsOptional()
	comment: string;

	@IsEnum(CancelationType)
	@IsNotEmpty()
	cancelationType: CancelationType;

}