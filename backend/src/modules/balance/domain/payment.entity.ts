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

	period_start: Date | null;
	period_end: Date | null;
	lessons_count: number | null;
	comment: string | null;

	created_by_id: number | null;

	stripe_payment_link_id: string | null;
	stripe_checkout_session_id: string | null;
	stripe_payment_intent_id: string | null;
	stripe_refund_id: string | null;

	paid_at: Date | null;
	created_at: Date;
	updated_at: Date;
}
