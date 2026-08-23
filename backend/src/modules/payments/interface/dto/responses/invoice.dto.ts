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
		description:
			"Ссылка на оплату. null, если у ученика способ оплаты не Stripe, а также при сбое — " +
			"отчёт админу уходит в любом случае. Причину смотрите в link_issue.",
		nullable: true,
		example: "https://buy.stripe.com/test_xxx",
	})
	link: string | null;

	@ApiProperty({
		description: "Причина, по которой ссылка не сгенерирована, хотя её ждали. null — ссылка есть " + "либо её и не ждали: оплата принимается вне системы.",
		nullable: true,
		example: "не задан курс евро — задайте его в панели администратора",
	})
	link_issue: string | null;

	@ApiProperty({
		description: "Сумма ссылки в минорных единицах charge_currency (евроцентах), когда счёт предъявлен " + "не в своей валюте. null — пересчёта не было.",
		nullable: true,
		example: 1600,
	})
	charge_amount_minor: number | null;

	@ApiProperty({ description: "Валюта ссылки, если она отличается от валюты счёта", enum: Currency, nullable: true })
	charge_currency: Currency | null;
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
