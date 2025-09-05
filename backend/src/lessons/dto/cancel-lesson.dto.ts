import { IsOptional, IsString } from "class-validator";

export class CancelLessonDto {
	@IsString()
	@IsOptional()
	comment: string;
}