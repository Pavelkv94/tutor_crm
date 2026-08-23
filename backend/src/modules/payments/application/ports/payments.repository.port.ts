import { Currency } from "@/shared/enums/currency.enum";
import { PaymentEntity } from "@/modules/balance/domain/payment.entity";
import { PaymentStatusEnum } from "@/modules/balance/domain/payment-status.enum";
import { PaymentTypeEnum } from "@/modules/balance/domain/payment-type.enum";

/** Занятие, попадающее в счёт. Критерии совпадают с выборкой для аллокации баланса. */
export type BillableLesson = {
	id: number;
	date: Date;
	plan_id: number;
	plan_name: string;
	plan_type: string;
	plan_price: number;
	plan_currency: Currency;
	stripe_price_id: string | null;
	is_free: boolean;
};

export type InvoiceStudent = {
	id: number;
	name: string;
	class: number;
	balance: number;
	balance_currency: Currency | null;
	/** Персональная скидка в процентах. 0 — скидки нет. */
	discount: number;
	deleted_at: Date | null;
	/** Ответ про фото/видео получен, неважно да или нет — дропдаун больше не нужен. */
	marketing_answered: boolean;
};

/**
 * Строка истории операций для админки: платёж плюс имя ученика.
 * Имя джойнится только в этом read-пути — доменная сущность остаётся чистой.
 */
export type PaymentListItem = PaymentEntity & { student_name: string };

export type PaymentsFilter = {
	student_id?: number;
	status?: PaymentStatusEnum;
	type?: PaymentTypeEnum;
	from?: Date;
	to?: Date;
};

export abstract class PaymentsRepositoryPort {
	/** Активные ученики — кандидаты на ежемесячный счёт. */
	abstract getActiveStudents(): Promise<InvoiceStudent[]>;
	abstract getStudentById(studentId: number): Promise<InvoiceStudent | null>;

	/**
	 * Занятия периода, за которые ещё не заплачено. Бесплатные занятия возвращаются тоже
	 * (их нужно показать в отчёте), но в сумму не входят — отсеиваются флагом is_free.
	 */
	abstract getBillableLessons(studentId: number, from: Date, to: Date): Promise<BillableLesson[]>;

	abstract findPendingInvoice(studentId: number, periodStart: Date, periodEnd: Date): Promise<PaymentEntity | null>;
	abstract findById(paymentId: number): Promise<PaymentEntity | null>;
	abstract findByPaymentLinkId(paymentLinkId: string): Promise<PaymentEntity | null>;
	abstract findByCheckoutSessionId(sessionId: string): Promise<PaymentEntity | null>;
	abstract findSucceededByPaymentIntentId(paymentIntentId: string): Promise<PaymentEntity | null>;
	abstract findByRefundId(refundId: string): Promise<PaymentEntity | null>;

	abstract createInvoice(data: {
		student_id: number;
		amount: number;
		currency: Currency;
		period_start: Date;
		period_end: Date;
		lessons_count: number;
		/** Снимок скидки ученика: по нему оплата раскладывается по занятиям. */
		discount_percent: number;
		created_by_id: number | null;
	}): Promise<PaymentEntity>;

	abstract setPaymentLink(paymentId: number, paymentLinkId: string): Promise<PaymentEntity>;
	abstract setStatus(paymentId: number, status: PaymentStatusEnum): Promise<PaymentEntity>;

	abstract list(filter: PaymentsFilter): Promise<PaymentListItem[]>;

	/** Идемпотентность вебхуков: возвращает true, если событие ещё не было обработано. */
	abstract claimWebhookEvent(eventId: string, type: string): Promise<boolean>;
	abstract markWebhookEventProcessed(eventId: string, error?: string): Promise<void>;
}
