import { Currency } from "@/shared/enums/currency.enum";
import { PaymentTypeEnum } from "./payment-type.enum";
import { PaymentStatusEnum } from "./payment-status.enum";

export class PaymentEntity {
	id: number;
	student_id: number;
	type: PaymentTypeEnum;
	status: PaymentStatusEnum;
	amount: number;
	currency: Currency;
	/** Скидка ученика, по которой посчитан счёт. 0 у операций, к которым скидка неприменима. */
	discount_percent: number;

	period_start: Date | null;
	period_end: Date | null;
	lessons_count: number | null;
	comment: string | null;

	created_by_id: number | null;

	stripe_payment_link_id: string | null;
	stripe_checkout_session_id: string | null;
	stripe_payment_intent_id: string | null;
	stripe_refund_id: string | null;

	/**
	 * Сумма, фактически предъявленная к оплате, когда ссылка выставлена не в валюте счёта
	 * (BYN-занятия, оплата картой в евро). NULL — конвертации не было.
	 *
	 * Учёт всегда идёт в `amount`/`currency`: тройка нужна вебхуку, чтобы сверить валюту и
	 * сумму сессии, и возврату — чтобы посчитать пропорцию к сумме счёта.
	 */
	charge_currency: Currency | null;
	/** В минорных единицах `charge_currency` (евроцентах). */
	charge_amount_minor: number | null;
	/** Курс в сотых долях `currency` за единицу `charge_currency`: 500 = 1 € = 5.00 BYN. */
	charge_rate: number | null;

	paid_at: Date | null;
	created_at: Date;
	updated_at: Date;
}
