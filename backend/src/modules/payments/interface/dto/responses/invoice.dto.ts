import { ApiProperty } from "@nestjs/swagger";
import { Currency } from "@/shared/enums/currency.enum";

export class InvoiceDto {
	@ApiProperty({ example: 12 })
	payment_id: number;

	@ApiProperty({ example: 1 })
	student_id: number;

	@ApiProperty({ description: "Сумма к оплате в целых единицах валюты", example: 160 })
	amount: number;

	@ApiProperty({ enum: Currency })
	currency: Currency;

	@ApiProperty({ description: "Количество платных занятий в счёте", example: 4 })
	lessons_count: number;

	@ApiProperty({
		description: "Ссылка на оплату. null для BYN и при недоступности Stripe — отчёт админу уходит в любом случае.",
		nullable: true,
		example: "https://buy.stripe.com/test_xxx",
	})
	link: string | null;
}

export class BalanceDto {
	@ApiProperty({ example: 1 })
	student_id: number;

	@ApiProperty({ example: 40 })
	balance: number;

	@ApiProperty({ description: "null, когда баланс равен нулю", enum: Currency, nullable: true })
	balance_currency: Currency | null;

	@ApiProperty({ description: "Занятия, оплаченные с баланса и не откаченные", type: "array", items: { type: "object" } })
	allocations: Array<{ lesson_id: number; lesson_date: Date; amount: number; currency: Currency }>;
}

export class AdjustBalanceResultDto {
	@ApiProperty({ example: 40 })
	balance: number;

	@ApiProperty({ enum: Currency, nullable: true })
	balance_currency: Currency | null;

	@ApiProperty({ description: "Занятия, статус оплаты которых изменился", type: "array", items: { type: "object" } })
	affected_lessons: Array<{ lesson_id: number; amount: number; new_status: string }>;
}
