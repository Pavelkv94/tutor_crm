import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	ArrayNotEmpty,
	IsArray,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	MaxLength,
	Min,
	ValidateNested,
} from "class-validator";
import { SalaryInvoiceDeliveryEnum } from "@/modules/reports/interface/dto/salary-invoice-delivery.enum";

/** Ставка за одно занятие по конкретному плану. Задаётся администратором вручную. */
export class SalaryLessonRateDto {
	@ApiProperty({ description: "Название плана", example: "Индивидуальные занятия" })
	@IsString()
	@IsNotEmpty()
	plan_name: string;

	@ApiProperty({ description: "Ставка за одно занятие по плану", example: 20 })
	@IsNumber()
	@Min(0)
	rate: number;
}

export class SalaryInvoiceDto {
	@ApiProperty({ description: "Идентификатор преподавателя", example: 1 })
	@IsInt()
	teacher_id: number;

	@ApiProperty({ description: "Начало периода", example: "2026-06-01" })
	@IsString()
	@IsNotEmpty()
	start_date: string;

	@ApiProperty({ description: "Конец периода", example: "2026-06-30" })
	@IsString()
	@IsNotEmpty()
	end_date: string;

	@ApiProperty({ description: "Номер счёта", example: "7/2026" })
	@IsString()
	@IsNotEmpty()
	@MaxLength(50)
	invoice_number: string;

	@ApiProperty({ description: "Дата выставления счёта", example: "2026-07-01" })
	@IsString()
	@IsNotEmpty()
	invoice_date: string;

	@ApiProperty({ description: "Ставки за занятие по планам", type: [SalaryLessonRateDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => SalaryLessonRateDto)
	lesson_rates: SalaryLessonRateDto[];

	@ApiPropertyOptional({
		description: "Оплата за дополнительные услуги. 0 или пусто — строки в счёте не будет.",
		example: 250,
	})
	@IsNumber()
	@IsOptional()
	@Min(0)
	extra_amount?: number;

	@ApiProperty({
		description: "Кому отправить счёт",
		enum: SalaryInvoiceDeliveryEnum,
		isArray: true,
		example: [SalaryInvoiceDeliveryEnum.TELEGRAM_ADMIN],
	})
	@IsArray()
	@ArrayNotEmpty()
	@IsEnum(SalaryInvoiceDeliveryEnum, { each: true })
	delivery: SalaryInvoiceDeliveryEnum[];
}
