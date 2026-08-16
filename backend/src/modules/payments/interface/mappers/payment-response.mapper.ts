import { PaymentListItem } from "@/modules/payments/application/ports/payments.repository.port";
import { PaymentDto } from "@/modules/payments/interface/dto/responses/payment.dto";

export const mapPaymentToResponse = (payment: PaymentListItem): PaymentDto => ({
	id: payment.id,
	student_id: payment.student_id,
	student_name: payment.student_name,
	type: payment.type,
	status: payment.status,
	amount: payment.amount,
	currency: payment.currency,
	period_start: payment.period_start,
	period_end: payment.period_end,
	lessons_count: payment.lessons_count,
	comment: payment.comment,
	paid_at: payment.paid_at,
	created_at: payment.created_at,
});
