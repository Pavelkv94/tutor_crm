import { Prisma } from "@/infrastructure/prisma/generated/client";
import { Currency } from "@/shared/enums/currency.enum";
import { LessonStatusEnum } from "@/modules/lesson/interface/dto/lesson-status.enum";
import { PaymentEntity } from "@/modules/balance/domain/payment.entity";
import { PaymentTypeEnum } from "@/modules/balance/domain/payment-type.enum";
import { PaymentStatusEnum } from "@/modules/balance/domain/payment-status.enum";

export type StudentForBalance = {
	id: number;
	balance: number;
	balance_currency: Currency | null;
	deleted_at: Date | null;
};

export type AllocatableLesson = {
	id: number;
	date: Date;
	status: LessonStatusEnum;
	plan_id: number;
	plan_price: number;
	plan_currency: Currency;
};

export type ActiveAllocation = {
	lesson_payment_id: number;
	lesson_id: number;
	lesson_date: Date;
	lesson_status: LessonStatusEnum;
	amount: number;
	currency: Currency;
};

export type CreatePaymentData = {
	student_id: number;
	type: PaymentTypeEnum;
	status: PaymentStatusEnum;
	amount: number;
	currency: Currency;
	period_start?: Date | null;
	period_end?: Date | null;
	lessons_count?: number | null;
	comment?: string | null;
	created_by_id?: number | null;
	stripe_payment_link_id?: string | null;
	stripe_checkout_session_id?: string | null;
	stripe_payment_intent_id?: string | null;
	stripe_refund_id?: string | null;
	paid_at?: Date | null;
};

export type UpdatePaymentData = Partial<Omit<CreatePaymentData, "student_id" | "type">>;

export abstract class BalanceRepositoryPort {
	/** Сериализует конкурентные изменения баланса одного ученика через pg_advisory_xact_lock. */
	abstract withStudentLock<T>(studentId: number, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;

	abstract getStudentForUpdate(tx: Prisma.TransactionClient, studentId: number): Promise<StudentForBalance | null>;

	/** Чтение баланса без лока — для проверок, которые ничего не меняют. */
	abstract getStudentSnapshot(studentId: number): Promise<StudentForBalance | null>;

	/**
	 * Пишет баланс и его валюту одним апдейтом: их нельзя разъезжать, иначе упадёт
	 * CHECK-констрейнт student_balance_currency_check.
	 */
	abstract updateStudentBalance(tx: Prisma.TransactionClient, studentId: number, balance: number, currency: Currency | null): Promise<void>;

	abstract createPayment(tx: Prisma.TransactionClient, data: CreatePaymentData): Promise<PaymentEntity>;
	abstract updatePayment(tx: Prisma.TransactionClient, paymentId: number, data: UpdatePaymentData): Promise<PaymentEntity>;
	abstract getPaymentById(tx: Prisma.TransactionClient, paymentId: number): Promise<PaymentEntity | null>;

	/** Неоплаченные занятия ученика с указанной даты, доступные для аллокации, по возрастанию даты. */
	abstract getAllocatableLessons(tx: Prisma.TransactionClient, studentId: number, fromDate: Date): Promise<AllocatableLesson[]>;

	/** Создаёт LessonPayment и переводит занятие в оплаченный статус. */
	abstract allocate(
		tx: Prisma.TransactionClient,
		params: { lessonId: number; studentId: number; paymentId: number | null; amount: number; currency: Currency; newStatus: LessonStatusEnum },
	): Promise<void>;

	/** Активные (не откаченные) аллокации по занятиям в PENDING_PAID/COMPLETED_PAID, по убыванию даты занятия. */
	abstract getActiveAllocationsDesc(tx: Prisma.TransactionClient, studentId: number): Promise<ActiveAllocation[]>;

	abstract getActiveAllocationForLesson(tx: Prisma.TransactionClient, lessonId: number): Promise<ActiveAllocation | null>;

	/** Отмечает LessonPayment как откаченный. Статус занятия не трогает — это решает вызывающий код. */
	abstract revertAllocation(tx: Prisma.TransactionClient, lessonPaymentId: number): Promise<void>;

	abstract setLessonStatus(tx: Prisma.TransactionClient, lessonId: number, status: LessonStatusEnum): Promise<void>;

	/** Перенос аллокации с одного занятия на другое без изменения баланса (используется при переносе урока). */
	abstract transferAllocation(
		tx: Prisma.TransactionClient,
		params: { fromLessonPaymentId: number; toLessonId: number; studentId: number; amount: number; currency: Currency; paymentId: number | null },
	): Promise<void>;

	/** Валюты планов платных занятий ученика за период — для проверки согласованности валют. */
	abstract getBillableLessonCurrencies(studentId: number, from: Date, to: Date): Promise<Currency[]>;

	abstract sumSucceededPayments(studentId: number): Promise<number>;
	abstract sumActiveAllocations(studentId: number): Promise<number>;
}
