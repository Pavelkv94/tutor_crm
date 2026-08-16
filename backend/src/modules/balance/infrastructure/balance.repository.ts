import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { Prisma, LessonStatus, PaymentType, PaymentStatus, Payment } from "@/infrastructure/prisma/generated/client";
import { Currency } from "@/shared/enums/currency.enum";
import { LessonStatusEnum } from "@/modules/lesson/interface/dto/lesson-status.enum";
import { PaymentEntity } from "@/modules/balance/domain/payment.entity";
import { PaymentTypeEnum } from "@/modules/balance/domain/payment-type.enum";
import { PaymentStatusEnum } from "@/modules/balance/domain/payment-status.enum";
import {
	ActiveAllocation,
	AllocatableLesson,
	BalanceRepositoryPort,
	CreatePaymentData,
	StudentForBalance,
	UpdatePaymentData,
} from "@/modules/balance/application/ports/balance.repository.port";

/** Ключ первого аргумента pg_advisory_xact_lock — произвольный неймспейс для баланса ученика. */
const STUDENT_BALANCE_LOCK_NAMESPACE = 1001;

/**
 * Внутри лока идёт до нескольких десятков запросов (аллокации по каждому занятию),
 * дефолтных 5 секунд Prisma для этого мало.
 */
const BALANCE_TRANSACTION_OPTIONS = { timeout: 15_000, maxWait: 10_000 };

const ALLOCATABLE_STATUSES = [LessonStatus.PENDING_UNPAID, LessonStatus.COMPLETED_UNPAID];
const ALLOCATED_STATUSES = [LessonStatus.PENDING_PAID, LessonStatus.COMPLETED_PAID];

type AllocationWithLesson = {
	id: number;
	lesson_id: number;
	amount: number;
	currency: string;
	lesson: { date: Date; status: string };
};

@Injectable()
export class BalanceRepository implements BalanceRepositoryPort {
	constructor(private readonly prisma: PrismaService) {}

	async withStudentLock<T>(studentId: number, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
		return this.prisma.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(${STUDENT_BALANCE_LOCK_NAMESPACE}, ${studentId})`;
			return fn(tx);
		}, BALANCE_TRANSACTION_OPTIONS);
	}

	async getStudentForUpdate(tx: Prisma.TransactionClient, studentId: number): Promise<StudentForBalance | null> {
		const student = await tx.student.findUnique({ where: { id: studentId } });
		if (!student) {
			return null;
		}
		return {
			id: student.id,
			balance: student.balance,
			balance_currency: student.balance_currency as Currency | null,
			deleted_at: student.deleted_at,
		};
	}

	async getStudentSnapshot(studentId: number): Promise<StudentForBalance | null> {
		const student = await this.prisma.student.findUnique({ where: { id: studentId } });
		if (!student) {
			return null;
		}
		return {
			id: student.id,
			balance: student.balance,
			balance_currency: student.balance_currency as Currency | null,
			deleted_at: student.deleted_at,
		};
	}

	async updateStudentBalance(tx: Prisma.TransactionClient, studentId: number, balance: number, currency: Currency | null): Promise<void> {
		await tx.student.update({ where: { id: studentId }, data: { balance, balance_currency: currency } });
	}

	async createPayment(tx: Prisma.TransactionClient, data: CreatePaymentData): Promise<PaymentEntity> {
		const payment = await tx.payment.create({
			data: {
				student_id: data.student_id,
				type: data.type as PaymentType,
				status: data.status as PaymentStatus,
				amount: data.amount,
				currency: data.currency,
				period_start: data.period_start ?? null,
				period_end: data.period_end ?? null,
				lessons_count: data.lessons_count ?? null,
				comment: data.comment ?? null,
				created_by_id: data.created_by_id ?? null,
				stripe_payment_link_id: data.stripe_payment_link_id ?? null,
				stripe_checkout_session_id: data.stripe_checkout_session_id ?? null,
				stripe_payment_intent_id: data.stripe_payment_intent_id ?? null,
				stripe_refund_id: data.stripe_refund_id ?? null,
				paid_at: data.paid_at ?? null,
			},
		});
		return this.mapPaymentToEntity(payment);
	}

	async updatePayment(tx: Prisma.TransactionClient, paymentId: number, data: UpdatePaymentData): Promise<PaymentEntity> {
		const payment = await tx.payment.update({
			where: { id: paymentId },
			data: {
				...(data.status !== undefined ? { status: data.status as PaymentStatus } : {}),
				...(data.amount !== undefined ? { amount: data.amount } : {}),
				...(data.currency !== undefined ? { currency: data.currency } : {}),
				...(data.lessons_count !== undefined ? { lessons_count: data.lessons_count } : {}),
				...(data.period_start !== undefined ? { period_start: data.period_start } : {}),
				...(data.period_end !== undefined ? { period_end: data.period_end } : {}),
				...(data.comment !== undefined ? { comment: data.comment } : {}),
				...(data.stripe_payment_link_id !== undefined ? { stripe_payment_link_id: data.stripe_payment_link_id } : {}),
				...(data.stripe_checkout_session_id !== undefined ? { stripe_checkout_session_id: data.stripe_checkout_session_id } : {}),
				...(data.stripe_payment_intent_id !== undefined ? { stripe_payment_intent_id: data.stripe_payment_intent_id } : {}),
				...(data.stripe_refund_id !== undefined ? { stripe_refund_id: data.stripe_refund_id } : {}),
				...(data.paid_at !== undefined ? { paid_at: data.paid_at } : {}),
			},
		});
		return this.mapPaymentToEntity(payment);
	}

	async getPaymentById(tx: Prisma.TransactionClient, paymentId: number): Promise<PaymentEntity | null> {
		const payment = await tx.payment.findUnique({ where: { id: paymentId } });
		return payment ? this.mapPaymentToEntity(payment) : null;
	}

	async getAllocatableLessons(tx: Prisma.TransactionClient, studentId: number, fromDate: Date): Promise<AllocatableLesson[]> {
		const lessons = await tx.lesson.findMany({
			where: {
				student_id: studentId,
				status: { in: ALLOCATABLE_STATUSES },
				is_free: false,
				is_trial: false,
				date: { gte: fromDate },
				lesson_payments: { none: { reverted_at: null } },
			},
			include: { plan: true },
			orderBy: [{ date: "asc" }, { id: "asc" }],
		});
		return lessons.map((lesson) => ({
			id: lesson.id,
			date: lesson.date,
			status: lesson.status as LessonStatusEnum,
			plan_id: lesson.plan_id,
			plan_price: lesson.plan.plan_price,
			plan_currency: lesson.plan.plan_currency as Currency,
		}));
	}

	async allocate(
		tx: Prisma.TransactionClient,
		params: { lessonId: number; studentId: number; paymentId: number | null; amount: number; currency: Currency; newStatus: LessonStatusEnum },
	): Promise<void> {
		await tx.lessonPayment.create({
			data: {
				student_id: params.studentId,
				lesson_id: params.lessonId,
				payment_id: params.paymentId,
				amount: params.amount,
				currency: params.currency,
			},
		});
		await tx.lesson.update({ where: { id: params.lessonId }, data: { status: params.newStatus as LessonStatus } });
	}

	async getActiveAllocationsDesc(tx: Prisma.TransactionClient, studentId: number): Promise<ActiveAllocation[]> {
		const allocations = await tx.lessonPayment.findMany({
			where: {
				student_id: studentId,
				reverted_at: null,
				lesson: { status: { in: ALLOCATED_STATUSES } },
			},
			include: { lesson: true },
			orderBy: [{ lesson: { date: "desc" } }, { id: "desc" }],
		});
		return allocations.map((allocation) => this.mapActiveAllocation(allocation));
	}

	async getActiveAllocationForLesson(tx: Prisma.TransactionClient, lessonId: number): Promise<ActiveAllocation | null> {
		const allocation = await tx.lessonPayment.findFirst({
			where: { lesson_id: lessonId, reverted_at: null },
			include: { lesson: true },
		});
		if (!allocation) {
			return null;
		}
		return this.mapActiveAllocation(allocation);
	}

	async revertAllocation(tx: Prisma.TransactionClient, lessonPaymentId: number): Promise<void> {
		await tx.lessonPayment.update({ where: { id: lessonPaymentId }, data: { reverted_at: new Date() } });
	}

	async setLessonStatus(tx: Prisma.TransactionClient, lessonId: number, status: LessonStatusEnum): Promise<void> {
		await tx.lesson.update({ where: { id: lessonId }, data: { status: status as LessonStatus } });
	}

	async transferAllocation(
		tx: Prisma.TransactionClient,
		params: { fromLessonPaymentId: number; toLessonId: number; studentId: number; amount: number; currency: Currency; paymentId: number | null },
	): Promise<void> {
		await tx.lessonPayment.update({ where: { id: params.fromLessonPaymentId }, data: { reverted_at: new Date() } });
		await tx.lessonPayment.create({
			data: {
				student_id: params.studentId,
				lesson_id: params.toLessonId,
				payment_id: params.paymentId,
				amount: params.amount,
				currency: params.currency,
			},
		});
	}

	async getBillableLessonCurrencies(studentId: number, from: Date, to: Date): Promise<Currency[]> {
		const rows = await this.prisma.lesson.findMany({
			where: {
				student_id: studentId,
				date: { gte: from, lte: to },
				is_free: false,
				is_trial: false,
				status: { in: [...ALLOCATABLE_STATUSES, ...ALLOCATED_STATUSES] },
				plan: { plan_price: { gt: 0 } },
			},
			select: { plan: { select: { plan_currency: true } } },
			distinct: ["plan_id"],
		});
		return [...new Set(rows.map((row) => row.plan.plan_currency as Currency))];
	}

	async sumSucceededPayments(studentId: number): Promise<number> {
		const result = await this.prisma.payment.aggregate({
			where: { student_id: studentId, status: PaymentStatus.SUCCEEDED },
			_sum: { amount: true },
		});
		return result._sum.amount ?? 0;
	}

	async sumActiveAllocations(studentId: number): Promise<number> {
		const result = await this.prisma.lessonPayment.aggregate({
			where: { student_id: studentId, reverted_at: null },
			_sum: { amount: true },
		});
		return result._sum.amount ?? 0;
	}

	private mapActiveAllocation(allocation: AllocationWithLesson): ActiveAllocation {
		return {
			lesson_payment_id: allocation.id,
			lesson_id: allocation.lesson_id,
			lesson_date: allocation.lesson.date,
			lesson_status: allocation.lesson.status as LessonStatusEnum,
			amount: allocation.amount,
			currency: allocation.currency as Currency,
		};
	}

	private mapPaymentToEntity(payment: Payment): PaymentEntity {
		return {
			id: payment.id,
			student_id: payment.student_id,
			type: payment.type as PaymentTypeEnum,
			status: payment.status as PaymentStatusEnum,
			amount: payment.amount,
			currency: payment.currency as Currency,
			period_start: payment.period_start,
			period_end: payment.period_end,
			lessons_count: payment.lessons_count,
			comment: payment.comment,
			created_by_id: payment.created_by_id,
			stripe_payment_link_id: payment.stripe_payment_link_id,
			stripe_checkout_session_id: payment.stripe_checkout_session_id,
			stripe_payment_intent_id: payment.stripe_payment_intent_id,
			stripe_refund_id: payment.stripe_refund_id,
			paid_at: payment.paid_at,
			created_at: payment.created_at,
			updated_at: payment.updated_at,
		};
	}
}
