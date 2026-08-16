import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString } from "class-validator";

export class CreateInvoiceDto {
	@ApiProperty({ description: "Идентификатор ученика", example: 1 })
	@IsInt()
	student_id: number;

	@ApiProperty({ description: "Начало периода", example: "2026-08-01" })
	@IsString()
	start_date: string;

	@ApiProperty({ description: "Конец периода", example: "2026-08-31" })
	@IsString()
	end_date: string;
}
