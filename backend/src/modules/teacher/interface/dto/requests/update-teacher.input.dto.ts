import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { Timezone } from "../responses/teacher.dto";
import { TeacherBillingDetailsInputDto } from "@/modules/teacher/interface/dto/requests/teacher-billing-details.input.dto";

export class UpdateTeacherDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "The name of the teacher",
		example: "John Doe",
	})
	name: string;

	@IsEnum(Timezone)
	@IsNotEmpty()
	@ApiProperty({
		description: "The timezone of the teacher",
		example: "BY",
	})
	timezone: Timezone;

	@IsObject()
	@IsOptional()
	@ValidateNested()
	@Type(() => TeacherBillingDetailsInputDto)
	@ApiPropertyOptional({
		description: "Платёжные реквизиты преподавателя для счёта",
		type: TeacherBillingDetailsInputDto,
	})
	billing_details?: TeacherBillingDetailsInputDto;
}