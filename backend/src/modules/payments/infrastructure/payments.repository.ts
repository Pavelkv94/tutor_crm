import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { Currency as PrismaCurrency, LessonStatus, Payment, PaymentStatus, PaymentType, Prisma } from "@/infrastructure/prisma/generated/client";
import { Currency } from "@/shared/enums/currency.enum";
import { PaymentMethod } from "@/shared/enums/payment-method.enum";
import { PaymentEntity } from "@/modules/balance/domain/payment.entity";
import { PaymentStatusEnum } from "@/modules/balance/domain/payment-status.enum";
import { PaymentTypeEnum } from "@/modules/balance/domain/payment-type.enum";
import {
	BillableLesson,
	InvoiceStudent,
	PaymentCharge,
	PaymentListItem,
	PaymentsFilter,
	PaymentsRepositoryPort,
} from "@/modules/payments/application/ports/payments.repository.port";

/** Занятие ещё не оплачено: те же статусы, что берёт в работу аллокация баланса. */
const UNPAID_STATUSES = [LessonStatus.PENDING_UNPAID, LessonStatus.COMPLETED_UNPAID];

@Injectable()
export class PaymentsRepository implements PaymentsRepositoryPort {
	constructor(private readonly prisma: PrismaService) {}

	async getActiveStudents(): Promise<InvoiceStudent[]> {
		const students = await this.prisma.student.findMany({ where: { deleted_at: null }, orderBy: { id: "asc" } });
		return students.map((student) => this.mapStudent(student));
	}

	async getStudentById(studentId: number): Promise<InvoiceStudent | null> {
		const student = await this.prisma.student.findUnique({ where: { id: studentId } });
		return student ? this.mapStudent(student) : null;
	}

	async getBillableLessons(studentId: number, from: Date, to: Date): Promise<BillableLesson[]> {
		const lessons = await this.prisma.lesson.findMany({
			where: {
				student_id: studentId,
				date: { gte: from, lte: to },
				status: { in: UNPAID_STATUSES },
				is_trial: false,
				lesson_payments: { none: { reverted_at: null } },
			},
			include: { plan: true },
			orderBy: [{ date: "asc" }, { id: "asc" }],
		});

		return lessons.map((lesson) => ({
			id: lesson.id,
			date: lesson.date,
			plan_id: lesson.plan_id,
			plan_name: lesson.plan.plan_name,
			plan_type: lesson.plan.plan_type,
			plan_price: lesson.plan.plan_price,
			plan_currency: lesson.plan.plan_currency as Currency,
			stripe_price_id: lesson.plan.stripe_price_id,
			is_free: lesson.is_free,
		}));
	}

	async findPendingInvoice(studentId: number, periodStart: Date, periodEnd: Date): Promise<PaymentEntity | null> {
		const payment = await this.prisma.payment.findFirst({
			where: {
				student_id: studentId,
				type: PaymentType.STRIPE_PAYMENT,
				status: PaymentStatus.PENDING,
				period_start: periodStart,
				period_end: periodEnd,
			},
		});
		return payment ? this.mapPayment(payment) : null;
	}

	async findById(paymentId: number): Promise<PaymentEntity | null> {
		const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
		return payment ? this.mapPayment(payment) : null;
	}

	async findByPaymentLinkId(paymentLinkId: string): Promise<PaymentEntity | null> {
		const payment = await this.prisma.payment.findUnique({ where: { stripe_payment_link_id: paymentLinkId } });
		return payment ? this.mapPayment(payment) : null;
	}

	async findByCheckoutSessionId(sessionId: string): Promise<PaymentEntity | null> {
		const payment = await this.prisma.payment.findUnique({ where: { stripe_checkout_session_id: sessionId } });
		return payment ? this.mapPayment(payment) : null;
	}

	async findSucceededByPaymentIntentId(paymentIntentId: string): Promise<PaymentEntity | null> {
		const payment = await this.prisma.payment.findFirst({
			where: { stripe_payment_intent_id: paymentIntentId, type: PaymentType.STRIPE_PAYMENT },
		});
		return payment ? this.mapPayment(payment) : null;
	}

	async findByRefundId(refundId: string): Promise<PaymentEntity | null> {
		const payment = await this.prisma.payment.findUnique({ where: { stripe_refund_id: refundId } });
		return payment ? this.mapPayment(payment) : null;
	}

	async createInvoice(data: {
		student_id: number;
		amount: number;
		currency: Currency;
		period_start: Date;
		period_end: Date;
		lessons_count: number;
		discount_percent: number;
		created_by_id: number | null;
	}): Promise<PaymentEntity> {
		const payment = await this.prisma.payment.create({
			data: {
				student_id: data.student_id,
				type: PaymentType.STRIPE_PAYMENT,
				status: PaymentStatus.PENDING,
				amount: data.amount,
				currency: data.currency,
				period_start: data.period_start,
				period_end: data.period_end,
				lessons_count: data.lessons_count,
				discount_percent: data.discount_percent,
				created_by_id: data.created_by_id,
			},
		});
		return this.mapPayment(payment);
	}

	async setPaymentLink(paymentId: number, paymentLinkId: string, charge?: PaymentCharge): Promise<PaymentEntity> {
		const payment = await this.prisma.payment.update({
			where: { id: paymentId },
			data: {
				stripe_payment_link_id: paymentLinkId,
				// Тройку пишем условным спредом, а не undefined-полями: CHECK
				// payment_charge_conversion_check требует, чтобы она была заполнена целиком.
				...(charge
					? {
							charge_amount_minor: charge.amount_minor,
							charge_currency: charge.currency as PrismaCurrency,
							charge_rate: charge.rate,
						}
					: {}),
			},
		});
		return this.mapPayment(payment);
	}

	async setStatus(paymentId: number, status: PaymentStatusEnum): Promise<PaymentEntity> {
		const payment = await this.prisma.payment.update({
			where: { id: paymentId },
			data: { status: status as PaymentStatus },
		});
		return this.mapPayment(payment);
	}

	async list(filter: PaymentsFilter): Promise<PaymentListItem[]> {
		const where: Prisma.PaymentWhereInput = {
			...(filter.student_id ? { student_id: filter.student_id } : {}),
			...(filter.status ? { status: filter.status as PaymentStatus } : {}),
			...(filter.type ? { type: filter.type as PaymentType } : {}),
			...(filter.from || filter.to
				? {
						created_at: {
							...(filter.from ? { gte: filter.from } : {}),
							...(filter.to ? { lte: filter.to } : {}),
						},
					}
				: {}),
		};
		const payments = await this.prisma.payment.findMany({
			where,
			orderBy: { created_at: "desc" },
			include: { student: { select: { name: true } } },
		});
		return payments.map((payment) => ({ ...this.mapPayment(payment), student_name: payment.student.name }));
	}

	/**
	 * Отмечает событие как взятое в работу. Повторная доставка отсекается только если
	 * предыдущая попытка дошла до конца (processed_at заполнен) — упавшую обработку
	 * Stripe ретраит намеренно, и мы обязаны её повторить.
	 */
	async claimWebhookEvent(eventId: string, type: string): Promise<boolean> {
		const existing = await this.prisma.stripeWebhookEvent.findUnique({ where: { id: eventId } });
		if (existing) {
			return existing.processed_at === null;
		}
		try {
			await this.prisma.stripeWebhookEvent.create({ data: { id: eventId, type } });
			return true;
		} catch (error) {
			// Гонка двух одновременных доставок одного события: вторая проиграла вставку.
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
				return false;
			}
			throw error;
		}
	}

	async markWebhookEventProcessed(eventId: string, error?: string): Promise<void> {
		await this.prisma.stripeWebhookEvent.update({
			where: { id: eventId },
			data: { processed_at: new Date(), error: error ?? null },
		});
	}

	private mapStudent(student: {
		id: number;
		name: string;
		class: number;
		balance: number;
		balance_currency: string | null;
		discount: number;
		deleted_at: Date | null;
		marketing_consent_at: Date | null;
		payment_method: string | null;
	}): InvoiceStudent {
		return {
			id: student.id,
			name: student.name,
			class: student.class,
			balance: student.balance,
			balance_currency: student.balance_currency as Currency | null,
			discount: student.discount,
			deleted_at: student.deleted_at,
			// Наружу отдаём готовый признак: разбор трёх состояний ответа — забота модуля ученика.
			marketing_answered: student.marketing_consent_at !== null,
			payment_method: student.payment_method as PaymentMethod | null,
		};
	}

	private mapPayment(payment: Payment): PaymentEntity {
		return {
			id: payment.id,
			student_id: payment.student_id,
			type: payment.type as PaymentTypeEnum,
			status: payment.status as PaymentStatusEnum,
			amount: payment.amount,
			currency: payment.currency as Currency,
			discount_percent: payment.discount_percent,
			period_start: payment.period_start,
			period_end: payment.period_end,
			lessons_count: payment.lessons_count,
			comment: payment.comment,
			created_by_id: payment.created_by_id,
			stripe_payment_link_id: payment.stripe_payment_link_id,
			stripe_checkout_session_id: payment.stripe_checkout_session_id,
			stripe_payment_intent_id: payment.stripe_payment_intent_id,
			stripe_refund_id: payment.stripe_refund_id,
			charge_currency: payment.charge_currency as Currency | null,
			charge_amount_minor: payment.charge_amount_minor,
			charge_rate: payment.charge_rate,
			paid_at: payment.paid_at,
			created_at: payment.created_at,
			updated_at: payment.updated_at,
		};
	}
}
