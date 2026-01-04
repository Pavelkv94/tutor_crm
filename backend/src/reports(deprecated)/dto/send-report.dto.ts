import { IsInt, IsString } from "class-validator";

export class SendReportDto {
	@IsInt()
	studentId: number;

	@IsString()
	start_date: string;

	@IsString()
	end_date: string;
}