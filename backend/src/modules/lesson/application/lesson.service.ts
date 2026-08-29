import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { addDays, endOfMonth, parseISO, getDay, startOfDay, format } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CancelationStatusEnum } from '@/modules/lesson/interface/dto/requests/cancel-lesson.dto';
import { SingleLessonInputDto } from '@/modules/lesson/interface/dto/requests/single-lesson.input.dto';
import { LessonRepository } from '@/modules/lesson/infrastructure/lesson.repository';
import { PlanService } from '@/modules/plan/application/plan.service';
import { LessonOutputDto } from '@/modules/lesson/interface/dto/responses/lesson.output.dto';
import { RegularLessonsInputDto, WeekDay } from '@/modules/lesson/interface/dto/requests/regular-lesson.input.dto';
import { LessonRegularRepository } from '@/modules/lesson/infrastructure/lesson-regular.repository';
import { RegularLessonOutputDto } from '@/modules/lesson/interface/dto/responses/regular-lesson.output.dto';
import { PlanTypeEnum } from '@/modules/plan/interface/dto/requests/create-plan.dto';
import { StudentService } from '@/modules/student/application/student.service';
import { LessonInputStatusEnum, LessonStatusEnum } from '@/modules/lesson/interface/dto/lesson-status.enum';
import { Lesson } from '@/infrastructure/prisma/generated/client';
import { TeacherService } from '@/modules/teacher/application/teacher.service';
import { JwtPayloadDto } from '@/modules/auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '@/modules/teacher/interface/dto/teacherRole';
import { RescheduledLessonInputDto } from '@/modules/lesson/interface/dto/requests/rescheduled-lesson.input.dto';
import { ManageFreeLessonStatusDto } from '@/modules/lesson/interface/dto/requests/manage-free-lesson.input.dto';
import { StudentLessonsOutputDto } from '@/modules/lesson/interface/dto/responses/student-lessons.output.dto';
import { UpdateLessonsPlanForPeriodDto } from '@/modules/lesson/interface/dto/requests/update-lesson-plan.input.dto';
import { CancelLessonDto } from '@/modules/lesson/interface/dto/requests/cancel-lesson.dto';
import { ChangeTeacherDto } from '@/modules/lesson/interface/dto/requests/change-teacher.dto';
import { BalanceService } from '@/modules/balance/application/balance.service';

@Injectable()
export class LessonService {
	private readonly logger = new Logger(LessonService.name);

	constructor(
		private readonly lessonRepository: LessonRepository,
		private readonly planService: PlanService,
		private readonly studentService: StudentService,
		private readonly teacherService: TeacherService,
		private readonly lessonRegularRepository: LessonRegularRepository,
		private readonly balanceService: BalanceService,
	) { }

	async createSingleLessonByAdmin(singleLessonInputDto: SingleLessonInputDto): Promise<LessonOutputDto> {
		const { plan_id, start_date, student_id, teacher_id, isFree, isTrial } = singleLessonInputDto;

		const date = new Date(start_date);
		const plan = await this.planService.findById(plan_id);
		if (!plan) {
			throw new NotFoundException('План не найден');
		}
		if (plan.deleted_at) {
			throw new BadRequestException('План уже удален');
		}
		const student = await this.studentService.findById(student_id);
		if (!student) {
			throw new NotFoundException('Студент не найден');
		}

		const lessonAlreadyBooked = await this.lessonRepository.findExistingLessonsByDateAndTeacher(date, teacher_id);
		if (lessonAlreadyBooked.length > 1) {
			throw new BadRequestException(`Максимальное количество уроков в это время: ${date.toLocaleDateString()}`);
		}
		if (lessonAlreadyBooked.length === 1 && lessonAlreadyBooked[0].plan.plan_type === PlanTypeEnum.INDIVIDUAL) {
			throw new BadRequestException(`Это время занято индивидуальным занятием у ${lessonAlreadyBooked[0].student.name}: ${date.toLocaleDateString()}`);
		}
		if (lessonAlreadyBooked.filter(el => el.student.id === student_id).length > 0) {
			throw new BadRequestException(`Это время уже назначено у ${lessonAlreadyBooked[0].student.name}: ${date.toLocaleDateString()}`);
		}
		if (
			lessonAlreadyBooked.length === 1 &&
			(lessonAlreadyBooked[0].plan.plan_type !== plan.plan_type || lessonAlreadyBooked[0].plan.duration !== plan.duration)
		) {
			throw new BadRequestException(`Не совпадает тип или длительность занятия: ${date.toLocaleDateString()}`);
		}

		await this.balanceService.assertLessonCurrencyAllowed({
			studentId: student_id,
			planCurrency: plan.plan_currency,
			planPrice: plan.plan_price,
			lessonDate: date,
			isFree,
			isTrial,
		});

		const newLesson = {
			student_id,
			teacher_id,
			plan_id,
			date,
			is_free: isFree,
			is_regular: false,
			status: LessonInputStatusEnum.PENDING_UNPAID,
			is_trial: isTrial,
		}
		const createdLesson = await this.lessonRepository.createSingleLesson(newLesson as Lesson);
		// Если на балансе остались деньги — новое занятие закрывается ими сразу.
		await this.settleFromBalance(student_id, 'lesson:created');
		return createdLesson;
	}

	async createRescheduledLesson(rescheduledLessonInputDto: RescheduledLessonInputDto, teacher: JwtPayloadDto): Promise<LessonOutputDto> {
		const { rescheduled_lesson_id, teacher_id, start_date } = rescheduledLessonInputDto;
		if (!teacher_id) {
			throw new BadRequestException('Преподаватель не указан');
		}
		const lesson = await this.lessonRepository.findById(rescheduled_lesson_id);
		if (!lesson) {
			throw new NotFoundException('Урок не найден');
		}
		if (lesson.is_trial) {
			throw new BadRequestException('Пробное занятие не может быть перенесено');
		}
		if (teacher.role !== TeacherRoleEnum.ADMIN && lesson.student.teacher_id !== +teacher.id) {
			throw new BadRequestException('Вы не можете перенести это занятие');
		}

		const lessonAlreadyBooked = await this.lessonRepository.findExistingLessonsByDateAndTeacher(new Date(start_date), teacher_id);
		if (lessonAlreadyBooked.length > 1) {
			throw new BadRequestException(`Максимальное количество уроков в это время: ${new Date(start_date).toLocaleDateString()}`);
		}
		if (lessonAlreadyBooked.length === 1 && lessonAlreadyBooked[0].plan.plan_type === PlanTypeEnum.INDIVIDUAL) {
			throw new BadRequestException(`Это время занято индивидуальным занятием у ${lessonAlreadyBooked[0].student.name}: ${new Date(start_date).toLocaleDateString()}`);
		}
		if (
			lessonAlreadyBooked.length === 1 &&
			(lessonAlreadyBooked[0].plan.plan_type !== lesson.plan.plan_type || lessonAlreadyBooked[0].plan.duration !== lesson.plan.duration)
		) {
			throw new BadRequestException(`Не совпадает тип или длительность занятия: ${new Date(start_date).toLocaleDateString()}`);
		}
		if (lessonAlreadyBooked.filter(el => el.student.id === lesson.student.id).length > 0) {
			throw new BadRequestException(`Это время уже назначено у ${lessonAlreadyBooked[0].student.name}: ${new Date(start_date).toLocaleDateString()}`);
		}
		if (lessonAlreadyBooked.length === 1 && lessonAlreadyBooked[0].rescheduled_lesson_id === null) {
			throw new BadRequestException(`Нельзя поставить отработку занятия вместе с другим занятием`);
		}

		const studentId = lesson.student.id;

		// Оплачен ли оригинал — определяем по активной аллокации, а не по статусу: к этому моменту
		// он уже переведён в RESCHEDULED, и статус про оплату ничего не говорит.
		const createdLesson = await this.balanceService.withStudentTransaction(studentId, async (tx) => {
			const allocation = await this.balanceService.getActiveAllocationInTx(tx, lesson.id);

			const newLesson = {
				student_id: studentId,
				teacher_id: teacher_id || lesson.teacher.id,
				plan_id: lesson.plan.id,
				date: new Date(start_date),
				is_regular: false,
				status: allocation ? LessonInputStatusEnum.PENDING_PAID : LessonInputStatusEnum.PENDING_UNPAID,
				rescheduled_lesson_id: lesson.id,
				rescheduled_lesson_date: lesson.date,
			}
			const created = await this.lessonRepository.createSingleLesson(newLesson as Lesson, tx);
			await this.lessonRepository.updateRescheduledLesson(lesson.id, created, tx);

			if (allocation) {
				await this.balanceService.transferAllocationInTx(tx, studentId, lesson.id, created.id);
			}
			return created;
		});

		await this.settleFromBalance(studentId, 'lesson:rescheduled');
		return createdLesson;
	}

	async updateLessonsPlanForPeriod(updateLessonsPlanForPeriodDto: UpdateLessonsPlanForPeriodDto): Promise<void> {
		const student = await this.studentService.findById(updateLessonsPlanForPeriodDto.student_id);
		if (!student) {
			throw new NotFoundException('Студент не найден');
		}
		const plan = await this.planService.findById(updateLessonsPlanForPeriodDto.new_plan_id);
		if (!plan) {
			throw new NotFoundException('План не найден');
		}
		if (plan.deleted_at) {
			throw new BadRequestException('План уже удален');
		}

		const affected = await this.lessonRepository.findLessonsForPlanChange(updateLessonsPlanForPeriodDto);
		if (affected.length === 0) {
			return;
		}

		for (const lesson of affected) {
			await this.balanceService.assertLessonCurrencyAllowed({
				studentId: updateLessonsPlanForPeriodDto.student_id,
				planCurrency: plan.plan_currency,
				planPrice: plan.plan_price,
				lessonDate: lesson.date,
			});
		}

		await this.balanceService.withStudentTransaction(updateLessonsPlanForPeriodDto.student_id, async (tx) => {
			// Цена меняется, поэтому аллокация на старую цену недействительна: снимаем её и
			// возвращаем деньги на баланс, но НЕ раскладываем — до updateMany занятия ещё стоят
			// по старой цене, и аллокация тут же легла бы на неё, разойдясь с новым планом.
			for (const lesson of affected) {
				await this.balanceService.releaseLessonInTx(tx, {
					studentId: updateLessonsPlanForPeriodDto.student_id,
					lessonId: lesson.id,
					reason: 'lesson:plan-changed',
					redistribute: false,
				});
			}
			await this.lessonRepository.updateLessonsPlanForPeriod(updateLessonsPlanForPeriodDto, tx);

			// Цены актуальны — теперь раскладываем баланс, в той же транзакции и под тем же локом.
			await this.balanceService.reconcileInTx(tx, {
				studentId: updateLessonsPlanForPeriodDto.student_id,
				delta: 0,
				currency: null,
				reason: 'lesson:plan-changed',
				payment: { kind: 'none' },
			});
		});
	}

	async findLessonsForPeriod(start_date: string, end_date: string, teacher_id: number): Promise<LessonOutputDto[]> {
		return await this.lessonRepository.findLessonsForPeriod(start_date, end_date, teacher_id);
	}
	async findLessonsForPeriodForSalary(start_date: string, end_date: string, teacher_id: number): Promise<LessonOutputDto[]> {
		return await this.lessonRepository.findLessonsForPeriodForSalary(start_date, end_date, teacher_id);
	}

	async findLessonsByStartDate(start_date: Date, teacher_id: number): Promise<LessonOutputDto[]> {
		return await this.lessonRepository.findLessonsByStartDate(start_date, teacher_id);
	}

	async findLessonsForReschedule(teacher_id: number): Promise<LessonOutputDto[]> {
		return await this.lessonRepository.findLessonsForReschedule(teacher_id);
	}

	async findLessonsForPeriodAndStudent(student_id: number, start_date: string, end_date: string, teacher: JwtPayloadDto): Promise<StudentLessonsOutputDto> {
		const student = await this.studentService.findById(student_id);
		if (!student) {
			throw new NotFoundException('Студент не найден');
		}
		if (teacher.role !== TeacherRoleEnum.ADMIN && student.teacher_id !== +teacher.id) {
			throw new BadRequestException('Вы не можете получить уроки для этого студента');
		}
		const lessons = await this.lessonRepository.findLessonsForPeriodAndStudent(student_id, start_date, end_date);
		const studentLessonsOutput: StudentLessonsOutputDto & { rescheduled_lessons: number } = {
			id: student.id,
			name: student.name,
			class: student.class,
			canceled_lessons: lessons.filter(lesson => lesson.status === LessonStatusEnum.CANCELLED).length,
			missed_lessons: lessons.filter(lesson => lesson.status === LessonStatusEnum.MISSED).length,
			rescheduled_lessons: lessons.filter(lesson => lesson.status === LessonStatusEnum.RESCHEDULED).length,
		}
		return studentLessonsOutput;
	}

	async findPendingUnpaidLessonsForPeriodAndStudent(student_id: number, start_date: string, end_date: string, teacher: JwtPayloadDto): Promise<LessonOutputDto[]> {
		const student = await this.studentService.findById(student_id);
		if (!student) {
			throw new NotFoundException('Студент не найден');
		}
		if (teacher.role !== TeacherRoleEnum.ADMIN && student.teacher_id !== +teacher.id) {
			throw new BadRequestException('Вы не можете получить уроки для этого студента');
		}
		const lessons = await this.lessonRepository.findLessonsForPeriodAndStudent(student_id, start_date, end_date);
		const pendingUnpaidLessons = lessons.filter(lesson => lesson.status === LessonStatusEnum.PENDING_UNPAID && lesson.is_trial === false);
		return pendingUnpaidLessons;
	}

	async createRegularLessons(regularLessonsInputDto: RegularLessonsInputDto, student_id: number): Promise<RegularLessonOutputDto[]> {
		const { lessons } = regularLessonsInputDto;
		const regularLessons: RegularLessonOutputDto[] = [];
		for (const lesson of lessons) {
			const { plan_id, start_time, week_day, start_period_date, end_period_date, teacher_id } = lesson;
			const plan = await this.planService.findById(plan_id);
			if (!plan) {
				throw new NotFoundException('План не найден');
			}

			const lessonDates = this.getDatesForWeekDay(week_day, start_period_date, end_period_date);
			for (const lessonDate of lessonDates) {
				await this.balanceService.assertLessonCurrencyAllowed({
					studentId: student_id,
					planCurrency: plan.plan_currency,
					planPrice: plan.plan_price,
					lessonDate,
				});
			}
			const startTimeDate = parseISO(start_time);
			const hours = startTimeDate.getUTCHours();
			const minutes = startTimeDate.getUTCMinutes();

			const mergedDates = lessonDates.map((lessonDate) => new Date(Date.UTC(
				lessonDate.getUTCFullYear(),
				lessonDate.getUTCMonth(),
				lessonDate.getUTCDate(),
				hours,
				minutes,
				0,
				0,
			)));

			const existingLessonsByDate = await this.lessonRepository.findExistingLessonsByDatesAndTeacher(mergedDates, teacher_id);

			for (const mergedDate of mergedDates) {
				const existingLessons = existingLessonsByDate.get(mergedDate.getTime()) ?? [];
				if (existingLessons.length > 1) {
					throw new BadRequestException(`Максимальное количество уроков в это время: ${mergedDate}`);
				}
				if (existingLessons.length === 1 && existingLessons[0].plan.plan_type === PlanTypeEnum.INDIVIDUAL) {
					throw new BadRequestException(`Это время занято индивидуальным занятием у ${existingLessons[0].student.name}: ${mergedDate}`);
				}
				if (existingLessons.filter(el => el.student.id === student_id).length > 0) {
					throw new BadRequestException(`Это время уже назначено у ${existingLessons[0].student.name}: ${mergedDate}`);
				}
				if (
					existingLessons.length > 0 &&
					(existingLessons[0].plan.plan_type !== plan.plan_type || existingLessons[0].plan.duration !== plan.duration)
				) {
					throw new BadRequestException(`Не совпадает тип или длительность занятия: ${mergedDate}`);
				}
			}

			const regularLesson = await this.lessonRegularRepository.createRegularLessonWithLessons(lesson, student_id, mergedDates);
			regularLessons.push(regularLesson);
		}
		await this.settleFromBalance(student_id, 'lesson:regular-created');
		return regularLessons;
	}

	async getRegularLessons(student_id: number): Promise<RegularLessonOutputDto[]> {
		const student = await this.studentService.findById(student_id);
		if (!student) {
			throw new NotFoundException('Студент не найден');
		}
		return await this.lessonRegularRepository.getRegularLessons(student_id);
	}

	async changeTeacher(lessonId: number, changeTeacherDto: ChangeTeacherDto): Promise<void> {
		const teacher = await this.teacherService.getTeacherById(changeTeacherDto.teacher_id);
		if (!teacher) {
			throw new NotFoundException('Преподаватель не найден');
		}
		if (teacher.deleted_at) {
			throw new BadRequestException('Преподаватель удален');
		}

		const lesson = await this.lessonRepository.findById(lessonId);
		if (!lesson) {
			throw new NotFoundException('Урок не найден');
		}

		const dateLabel = lesson.date.toLocaleDateString();
		const lessonAlreadyBooked = (
			await this.lessonRepository.findExistingLessonsByDateAndTeacher(lesson.date, changeTeacherDto.teacher_id)
		).filter(el => el.id !== lessonId);
		if (lessonAlreadyBooked.length > 1) {
			throw new BadRequestException(`Максимальное количество уроков в это время: ${dateLabel}`);
		}
		if (lessonAlreadyBooked.length === 1 && lessonAlreadyBooked[0].plan.plan_type === PlanTypeEnum.INDIVIDUAL) {
			throw new BadRequestException(`Это время занято индивидуальным занятием у ${lessonAlreadyBooked[0].student.name}: ${dateLabel}`);
		}
		if (lessonAlreadyBooked.length >= 1 && lesson.plan.plan_type === PlanTypeEnum.INDIVIDUAL) {
			throw new BadRequestException(`Нельзя назначить индивидуальное занятие на занятое время: ${dateLabel}`);
		}
		if (lessonAlreadyBooked.filter(el => el.student.id === lesson.student.id).length > 0) {
			throw new BadRequestException(`Это время уже назначено у ${lesson.student.name}: ${dateLabel}`);
		}
		if (
			lessonAlreadyBooked.length === 1 &&
			(lessonAlreadyBooked[0].plan.plan_type !== lesson.plan.plan_type || lessonAlreadyBooked[0].plan.duration !== lesson.plan.duration)
		) {
			throw new BadRequestException(`Не совпадает тип или длительность занятия: ${dateLabel}`);
		}

		await this.lessonRepository.changeTeacher(lessonId, changeTeacherDto.teacher_id);
	}

	async cancelLesson(lessonId: number, cancelLessonDto: CancelLessonDto, teacher: JwtPayloadDto): Promise<void> {
		const lesson = await this.lessonRepository.findById(lessonId);
		if (!lesson) {
			throw new NotFoundException('Урок не найден');
		}
		if (cancelLessonDto.status === CancelationStatusEnum.CANCELLED && teacher.role !== TeacherRoleEnum.ADMIN) {
			throw new BadRequestException('Вы не можете отменить этот урок');
		}
		if (lesson.status === LessonStatusEnum.CANCELLED || lesson.status === LessonStatusEnum.MISSED || lesson.status === LessonStatusEnum.RESCHEDULED) {
			throw new BadRequestException('Урок уже отменен');
		}
		const existingTeacher = await this.teacherService.getTeacherById(+teacher.id);
		if (!existingTeacher) {
			throw new NotFoundException('Преподаватель не найден');
		}
		if (existingTeacher.deleted_at) {
			throw new BadRequestException('Преподаватель удален');
		}
		if (teacher.role !== TeacherRoleEnum.ADMIN && lesson.student.teacher_id !== +teacher.id) {
			throw new BadRequestException('Вы не можете отменить этот урок');
		}
		const studentId = lesson.student.id;
		await this.balanceService.withStudentTransaction(studentId, async (tx) => {
			await this.lessonRepository.cancelLesson(lessonId, cancelLessonDto, lesson.rescheduled_lesson_id, tx);

			// CANCELLED — деньги возвращаются на баланс и уходят на другие неоплаченные занятия.
			// MISSED — оплата сгорает вместе с занятием, аллокация остаётся.
			// RESCHEDULED — оплата ждёт переезда на новое занятие, трогать её нельзя.
			if (cancelLessonDto.status === CancelationStatusEnum.CANCELLED) {
				await this.balanceService.releaseLessonInTx(tx, {
					studentId,
					lessonId,
					reason: 'lesson:cancelled',
					// Занятие уже переведено в CANCELLED — возвращать ему «неоплаченный» статус не нужно.
					revertLessonStatus: false,
				});
			}
		});
	}

	async deleteLesson(lessonId: number): Promise<void> {
		const lesson = await this.lessonRepository.findById(lessonId);
		if (!lesson) {
			throw new NotFoundException('Урок не найден');
		}

		const studentId = lesson.student.id;
		// У lesson_payment стоит ON DELETE CASCADE: не сняв аллокацию заранее, мы бы потеряли
		// её вместе с занятием, и баланс разошёлся бы с суммой платежей.
		await this.balanceService.withStudentTransaction(studentId, async (tx) => {
			await this.balanceService.releaseLessonInTx(tx, {
				studentId,
				lessonId,
				reason: 'lesson:deleted',
				revertLessonStatus: false,
			});
			await this.lessonRepository.deleteLesson(lessonId, tx);
		});
	}

	async manageFreeLessonStatus(lessonId: number, manageFreeLessonStatusDto: ManageFreeLessonStatusDto): Promise<void> {
		const lesson = await this.lessonRepository.findById(lessonId);
		if (!lesson) {
			throw new NotFoundException('Урок не найден');
		}
		if (lesson.is_trial) {
			throw new BadRequestException('Пробное занятие не может быть изменено');
		}

		const studentId = lesson.student.id;
		await this.balanceService.withStudentTransaction(studentId, async (tx) => {
			await this.lessonRepository.manageFreeLessonStatus(lessonId, manageFreeLessonStatusDto, tx);

			if (manageFreeLessonStatusDto.isFree) {
				// Бесплатное занятие не должно удерживать деньги — возвращаем их на баланс.
				await this.balanceService.releaseLessonInTx(tx, { studentId, lessonId, reason: 'lesson:marked-free' });
			}
		});

		// Занятие снова стало платным — возможно, его закроет остаток баланса.
		await this.settleFromBalance(studentId, 'lesson:free-status-changed');
	}

	/**
	 * Раскладывает остаток баланса по неоплаченным занятиям. Вызывается после любых изменений
	 * расписания: деньги, оставшиеся от переплаты, должны сами закрывать новые занятия.
	 * Сбой здесь не должен ронять уже выполненную операцию с занятием.
	 */
	private async settleFromBalance(studentId: number, reason: string): Promise<void> {
		try {
			await this.balanceService.reconcile({
				studentId,
				delta: 0,
				currency: null,
				reason,
				payment: { kind: 'none' },
			});
		} catch (error) {
			this.logger.error(`Не удалось разложить баланс ученика ${studentId} (${reason}): ${(error as Error).message}`);
		}
	}

	private getDatesForWeekDay(weekDay: WeekDay, startDate: string, endDate: string): Date[] {
		// Parse ISO dates (already in UTC)
		const startParsed = parseISO(startDate);
		const endParsed = parseISO(endDate);

		// Get UTC start of day (00:00:00 UTC)
		const start = new Date(Date.UTC(
			startParsed.getUTCFullYear(),
			startParsed.getUTCMonth(),
			startParsed.getUTCDate(),
			0, 0, 0, 0
		));

		const end = new Date(Date.UTC(
			endParsed.getUTCFullYear(),
			endParsed.getUTCMonth(),
			endParsed.getUTCDate(),
			0, 0, 0, 0
		));

		const targetDayOfWeek = this.weekDayToNumber(weekDay);
		const dates: Date[] = [];

		// Find the first occurrence of the target weekday on or after start date
		let current = new Date(start);
		const startDayOfWeek = current.getUTCDay(); // Use UTC day of week

		// Calculate days to add to reach the target weekday
		// If start date is already the target day, daysToAdd will be 0
		const daysToAdd = (targetDayOfWeek - startDayOfWeek + 7) % 7;
		current = addDays(current, daysToAdd);

		// Generate all dates for the target weekday within the date range (inclusive)
		while (current <= end) {
			if (current.getUTCDay() === targetDayOfWeek) { // Use UTC day of week
				dates.push(new Date(current));
			}
			current = addDays(current, 7); // Move to next week
		}

		return dates;
	}

	private weekDayToNumber(weekDay: WeekDay): number {
		const mapping: Record<WeekDay, number> = {
			[WeekDay.SUNDAY]: 0,
			[WeekDay.MONDAY]: 1,
			[WeekDay.TUESDAY]: 2,
			[WeekDay.WEDNESDAY]: 3,
			[WeekDay.THURSDAY]: 4,
			[WeekDay.FRIDAY]: 5,
			[WeekDay.SATURDAY]: 6,
		};
		return mapping[weekDay];
	}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async updateLessonsStatus() {
		await this.lessonRepository.updatePendingLessonsStatus();
	}
}
