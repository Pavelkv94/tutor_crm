import { ApiProperty } from "@nestjs/swagger";
import { Currency } from "@/shared/enums/currency.enum";
import { PaymentStatusEnum } from "@/modules/balance/domain/payment-status.enum";
import { PaymentTypeEnum } from "@/modules/balance/domain/payment-type.enum";

export class PaymentDto {
	@ApiProperty({ example: 1 })
	id: number;

	@ApiProperty({ example: 1 })
	student_id: number;

	@ApiProperty({ example: "Иван Петров" })
	student_name: string;

	@ApiProperty({ enum: PaymentTypeEnum })
	type: PaymentTypeEnum;

	@ApiProperty({ enum: PaymentStatusEnum })
	status: PaymentStatusEnum;

	@ApiProperty({ description: "Знаковая сумма в целых единицах валюты", example: 160 })
	amount: number;

	@ApiProperty({ enum: Currency })
	currency: Currency;

	@ApiProperty({ nullable: true, example: "2026-08-01T00:00:00.000Z" })
	period_start: Date | null;

	@ApiProperty({ nullable: true, example: "2026-08-31T23:59:59.999Z" })
	period_end: Date | null;

	@ApiProperty({ nullable: true, example: 4 })
	lessons_count: number | null;

	@ApiProperty({ nullable: true, example: "Оплата наличными за август" })
	comment: string | null;

	@ApiProperty({ nullable: true, example: "2026-08-03T12:00:00.000Z" })
	paid_at: Date | null;

	@ApiProperty({ example: "2026-08-01T10:00:00.000Z" })
	created_at: Date;
}
