import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lesson, LessonStatus, Student } from '@/infrastructure/prisma/generated/client';
import { LessonOutputDto } from "@/modules/lesson/interface/dto/responses/lesson.output.dto";
import { LessonStatusEnum } from "@/modules/lesson/interface/dto/lesson-status.enum";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import { Plan } from '@/infrastructure/prisma/generated/client';
import { RegularLessonOutputDto } from "@/modules/lesson/interface/dto/responses/regular-lesson.output.dto";
import { Teacher } from '@/infrastructure/prisma/generated/client';
import { CancelationStatusEnum, CancelLessonDto } from "@/modules/lesson/interface/dto/requests/cancel-lesson.dto";
import { ManageFreeLessonStatusDto } from "@/modules/lesson/interface/dto/requests/manage-free-lesson.input.dto";
import { Timezone } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { Currency } from '@/shared/enums/currency.enum';
import { PaymentMethod } from '@/shared/enums/payment-method.enum';
import { calculateAgeFromBirthDate } from '@/shared/utils/calculate-age.util';
import { UpdateLessonsPlanForPeriodDto } from "@/modules/lesson/interface/dto/requests/update-lesson-plan.input.dto";
import { Prisma } from '@/infrastructure/prisma/generated/client';

/**
 * Часть операций должна выполняться в одной транзакции с изменением баланса
 * (перенос оплаты, откат аллокации перед удалением занятия), поэтому такие методы
 * принимают транзакционный клиент снаружи.
 */
type TxClient = Prisma.TransactionClient;

@Injectable()
export class LessonRepository {
	constructor(private readonly prisma: PrismaService) {}

	private client(tx?: TxClient) {
		return tx ?? this.prisma;
	}

	async findLessonsForReschedule(teacher_id: number): Promise<LessonOutputDto[]> {
		const lessons = await this.prisma.lesson.findMany({
			where: {
				teacher_id,
				status: LessonStatus.RESCHEDULED,
				rescheduled_to_lesson_id: null
			},
			include: {
				student: true,
				teacher: true,
				plan: true,
			},
		});
		return lessons.map(l => this.mapLessonToView(l));
	}

	async findLessonsForPeriodAndStudent(student_id: number, start_date: string, end_date: string): Promise<LessonOutputDto[]> {
		const startDate = startOfDay(parseISO(start_date));
		const endDate = endOfDay(parseISO(end_date));
		const lessons = await this.prisma.lesson.findMany({
			where: {
				date: { gte: startDate, lte: endDate },
				student: {
					id: student_id,
				},
			},
			include: {
				student: true,
				teacher: true,
				plan: true,
			},
			orderBy: {
				date: 'asc',
			},
		});
		return lessons.map(l => this.mapLessonToView(l));
	}


	async findLessonsByStartDate(start_date: Date, teacher_id: number): Promise<LessonOutputDto[]> {
		const endDate = new Date(start_date.getTime() + 60 * 60 * 1000);
		const lessons = await this.prisma.lesson.findMany({
			where: {
				date: { gte: start_date, lte: endDate },
				OR: [
					{ teacher_id },
					{ student: { teacher_id } },
				],
			},
			include: {
				student: true,
				teacher: true,
				plan: true,
			},
		});
		return lessons.map(l => this.mapLessonToView(l));
	}

	async createRegularLesson(student_id: number,
		teacher_id: number,
		plan_id: number,
		mergedDate: Date,
		regularLesson: RegularLessonOutputDto): Promise<void> {
		await this.prisma.lesson.create({
			data: {
				student_id,
				teacher_id,
				plan_id,
				date: mergedDate,
				is_regular: true,
				regular_lesson_id: regularLesson.id,
				status: LessonStatus.PENDING_UNPAID,
			},
		});
	}

	async createSingleLesson(newLesson: Lesson, tx?: TxClient): Promise<LessonOutputDto> {
		try {
		const lesson = await this.client(tx).lesson.create({
			data: newLesson,
			include: {
				student: true,
				teacher: true,
				plan: true,
			},
		});
		return this.mapLessonToView(lesson);
		} catch (error) {
			console.log(error);
			throw new BadRequestException('Не удалось создать занятие');
		}
	}

	async updateRescheduledLesson(rescheduled_lesson_id: number, createdLesson: LessonOutputDto, tx?: TxClient): Promise<void> {
		await this.client(tx).lesson.update({
			where: { id: rescheduled_lesson_id },
			data: { rescheduled_to_lesson_id: createdLesson.id, rescheduled_to_lesson_date: createdLesson.date },
		});
	}

	/** Занятия, которых коснётся смена плана, — чтобы откатить у оплаченных аллокацию на старую цену. */
	async findLessonsForPlanChange(dto: UpdateLessonsPlanForPeriodDto, tx?: TxClient): Promise<Array<{ id: number; date: Date }>> {
		return await this.client(tx).lesson.findMany({
			where: { student_id: dto.student_id, date: { gte: dto.start_date, lte: dto.end_date }, plan_id: dto.old_plan_id },
			select: { id: true, date: true },
			orderBy: { date: 'asc' },
		});
	}

	async updateLessonsPlanForPeriod(dto: UpdateLessonsPlanForPeriodDto, tx?: TxClient): Promise<void> {
		await this.client(tx).lesson.updateMany({
			where: { student_id: dto.student_id, date: { gte: dto.start_date, lte: dto.end_date }, plan_id: dto.old_plan_id },
			data: { plan_id: dto.new_plan_id },
		});
	}

	async findLessonsForPeriod(start_date: string, end_date: string, teacher_id: number): Promise<LessonOutputDto[]> {
		const startDate = startOfDay(parseISO(start_date));
		const endDate = endOfDay(parseISO(end_date));
		const lessons = await this.prisma.lesson.findMany({
			where: {
				date: { gte: startDate, lte: endDate },
				OR: [
					{ teacher_id },
					{ student: { teacher_id } },
				],
			},
			include: {
				student: true,
				teacher: true,
				plan: true,
			},
			orderBy: {
				date: 'asc',
			},
		});
		return lessons.map(l => this.mapLessonToView(l));
	}

	async findLessonsForPeriodForSalary(start_date: string, end_date: string, teacher_id: number): Promise<LessonOutputDto[]> {
		const startDate = startOfDay(parseISO(start_date));
		const endDate = endOfDay(parseISO(end_date));
		const lessons = await this.prisma.lesson.findMany({
			where: {
				date: { gte: startDate, lte: endDate },
				OR: [
					{ teacher_id },
				],
			},
			include: {
				student: true,
				teacher: true,
				plan: true,
			},
			orderBy: {
				date: 'asc',
			},
		});
		return lessons.map(l => this.mapLessonToView(l));
	}

	async findExistingLessonsByDateAndTeacher(mergedDate: Date, teacher_id: number): Promise<Array<Lesson & { student: Student } & { plan: Plan }>> {
		return await this.prisma.lesson.findMany({
			where: {
				date: mergedDate,
				teacher_id: teacher_id,
				status: {
					in: [LessonStatusEnum.PENDING_UNPAID, LessonStatusEnum.PENDING_PAID, LessonStatusEnum.COMPLETED_PAID, LessonStatusEnum.COMPLETED_UNPAID],
				},
			},
			include: {
				student: true,
				plan: true,
			},
		});
	}

	async findExistingLessonsByDatesAndTeacher(
		dates: Date[],
		teacher_id: number,
	): Promise<Map<number, Array<Lesson & { student: Student } & { plan: Plan }>>> {
		const lessonsByDate = new Map<number, Array<Lesson & { student: Student } & { plan: Plan }>>();
		if (dates.length === 0) {
			return lessonsByDate;
		}

		const existingLessons = await this.prisma.lesson.findMany({
			where: {
				date: { in: dates },
				teacher_id,
				status: {
					in: [LessonStatusEnum.PENDING_UNPAID, LessonStatusEnum.PENDING_PAID, LessonStatusEnum.COMPLETED_PAID, LessonStatusEnum.COMPLETED_UNPAID],
				},
			},
			include: {
				student: true,
				plan: true,
			},
		});

		for (const lesson of existingLessons) {
			const dateKey = lesson.date.getTime();
			const lessonsForDate = lessonsByDate.get(dateKey);
			if (lessonsForDate) {
				lessonsForDate.push(lesson);
			} else {
				lessonsByDate.set(dateKey, [lesson]);
			}
		}

		return lessonsByDate;
	}

	async updatePendingLessonsStatus(): Promise<void> {
		const now = new Date();
		await this.prisma.lesson.updateMany({
			data: {
				status: LessonStatus.COMPLETED_UNPAID,
			},
			where: {
				status: LessonStatus.PENDING_UNPAID,
				is_trial: false,
				is_free: false,
				date: { lt: now },
			},
		});
		await this.prisma.lesson.updateMany({
			data: {
				status: LessonStatus.COMPLETED_PAID,
			},
			where: {
				status: LessonStatus.PENDING_PAID,
				is_trial: false,
				is_free: false,
				date: { lt: now },
			},
		});
	}

	async changeTeacher(lessonId: number, teacherId: number): Promise<void> {
		await this.prisma.lesson.update({
			where: { id: lessonId },
			data: { teacher_id: teacherId },
		});
	}

	async findById(lessonId: number): Promise<LessonOutputDto | null> {
		const lesson = await this.prisma.lesson.findUnique({
			where: { id: lessonId },
			include: {
				student: true,
				teacher: true,
				plan: true,
			},
		});
		if (!lesson) {
			return null;
		}
		return this.mapLessonToView(lesson);
	}

	async cancelLesson(lessonId: number, cancelLessonDto: CancelLessonDto, rescheduled_lesson_id: number | null, tx?: TxClient): Promise<void> {
		const client = this.client(tx);
		const data: { status?: LessonStatus, rescheduled_lesson_id?: number | null, rescheduled_lesson_date?: string | null } = {};


		if (cancelLessonDto.status === CancelationStatusEnum.RESCHEDULED && rescheduled_lesson_id) {
			throw new BadRequestException('Нельзя перенести занятие, которое уже было перенесено. Нужно сперва отменить перенос занятия.');
		}

		if (cancelLessonDto.status === CancelationStatusEnum.CANCELLED) {
			data.status = LessonStatus.CANCELLED;
			data.rescheduled_lesson_id = null;
			data.rescheduled_lesson_date = null;
			if (rescheduled_lesson_id) {
				const lessonForReschedule = await client.lesson.findUnique({
					where: { id: rescheduled_lesson_id },
				});
				if (!lessonForReschedule) {
					throw new NotFoundException('Занятие для переноса не найдено');
				}
				await client.lesson.update({
					where: { id: rescheduled_lesson_id },
					data: {
						rescheduled_to_lesson_date: null,
						rescheduled_to_lesson_id: null,
					},
				});
			}
		} else if (cancelLessonDto.status === CancelationStatusEnum.MISSED) {
			data.status = LessonStatus.MISSED;
		} else if (cancelLessonDto.status === CancelationStatusEnum.RESCHEDULED) {
			data.status = LessonStatus.RESCHEDULED;
			data.rescheduled_lesson_id = null;
			data.rescheduled_lesson_date = null;
		}

		await client.lesson.update({
			where: { id: lessonId },
			data: { ...data, comment: cancelLessonDto.comment },
		});

	}

	async deleteLesson(lessonId: number, tx?: TxClient): Promise<void> {
		const client = this.client(tx);
		const lesson = await client.lesson.findUnique({
			where: { id: lessonId },
		});
		if (!lesson) {
			throw new NotFoundException('Занятие не найдено');
		}

		if (lesson.rescheduled_to_lesson_id) {
			throw new BadRequestException('Нельзя удалить занятие, которое перенесено. Сначала отмените перенос.');
		}

		if (lesson.rescheduled_lesson_id) {
			await client.lesson.update({
				where: { id: lesson.rescheduled_lesson_id },
				data: { rescheduled_to_lesson_id: null, rescheduled_to_lesson_date: null },
			});
		}
		await client.lesson.delete({
			where: { id: lessonId },
		});
	}


	async manageFreeLessonStatus(lessonId: number, manageFreeLessonStatusDto: ManageFreeLessonStatusDto, tx?: TxClient): Promise<void> {
		await this.client(tx).lesson.update({
			where: { id: lessonId },
			data: { is_free: manageFreeLessonStatusDto.isFree },
		});
	}

	private mapLessonToView(lesson: Lesson & { student: Student } & { plan: Plan } & { teacher: Teacher }): LessonOutputDto {
		return {
			id: lesson.id,
			student: {
				id: lesson.student.id,
				name: lesson.student.name,
				class: lesson.student.class,
				birth_date: lesson.student.birth_date,
				age: calculateAgeFromBirthDate(lesson.student.birth_date),
				created_at: lesson.student.created_at,
				deleted_at: lesson.student.deleted_at,
				teacher_id: lesson.student.teacher_id || null,
				timezone: lesson.student.timezone as Timezone,
				marketing_consent: lesson.student.marketing_consent,
				marketing_consent_at: lesson.student.marketing_consent_at,
				balance_currency: lesson.student.balance_currency as Currency | null,
				balance: lesson.student.balance,
				discount: lesson.student.discount,
				payment_method: lesson.student.payment_method as PaymentMethod | null,
			},
			plan: {
				id: lesson.plan.id,
				plan_name: lesson.plan.plan_name,
				plan_price: lesson.plan.plan_price,
				plan_currency: lesson.plan.plan_currency as Currency,
				duration: lesson.plan.duration,
				plan_type: lesson.plan.plan_type,
				deleted_at: lesson.plan.deleted_at,
				created_at: lesson.plan.created_at,
			},
			status: lesson.status as LessonStatusEnum,
			comment: lesson.comment,
			created_at: lesson.created_at,
			is_regular: lesson.is_regular,
			is_free: lesson.is_free,
			is_trial: lesson.is_trial,
			rescheduled_lesson_id: lesson.rescheduled_lesson_id,
			rescheduled_lesson_date: lesson.rescheduled_lesson_date,
			rescheduled_to_lesson_id: lesson.rescheduled_to_lesson_id,
			rescheduled_to_lesson_date: lesson.rescheduled_to_lesson_date,
			date: lesson.date,
			teacher: {
				id: lesson.teacher.id,
				name: lesson.teacher.name
			}
		};
	}
}