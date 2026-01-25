import { PrismaService } from "src/core/prisma/prisma.service";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lesson, LessonStatus, Student } from "@prisma/client";
import { LessonOutputDto } from "./dto/lesson.output.dto";
import { LessonStatusEnum } from "./dto/lesson-status.enum";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import { Plan } from "@prisma/client";
import { RegularLessonOutputDto } from "./dto/regular-lesson.output.dto";
import { Teacher } from "@prisma/client";
import { CancelationStatusEnum, CancelLessonDto } from "./dto/cancel-lesson.dto";
import { ManageFreeLessonStatusDto } from "./dto/manage-free-lesson.input.dto";
import { Timezone } from "../teacher/dto/teacher.output.dto";
@Injectable()
export class LessonRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findLessonsForReschedule(teacher_id: number): Promise<LessonOutputDto[]> {
		const lessons = await this.prisma.lesson.findMany({
			where: {
				student: {
					teacher_id,
				},
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

	async createSingleLesson(newLesson: Lesson): Promise<LessonOutputDto> {
		try {
		const lesson = await this.prisma.lesson.create({
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

	async updateRescheduledLesson(rescheduled_lesson_id: number, createdLesson: LessonOutputDto): Promise<void> {
		await this.prisma.lesson.update({
			where: { id: rescheduled_lesson_id },
			data: { rescheduled_to_lesson_id: createdLesson.id, rescheduled_to_lesson_date: createdLesson.date },
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

	async cancelLesson(lessonId: number, cancelLessonDto: CancelLessonDto, rescheduled_lesson_id: number | null): Promise<void> {
		const data: { status?: LessonStatus, rescheduled_lesson_id?: number | null, rescheduled_lesson_date?: string | null } = {};


		if (cancelLessonDto.status === CancelationStatusEnum.RESCHEDULED && rescheduled_lesson_id) {
			throw new BadRequestException('Нельзя перенести занятие, которое уже было перенесено. Нужно сперва отменить перенос занятия.');
		}

		if (cancelLessonDto.status === CancelationStatusEnum.CANCELLED) {
			data.status = LessonStatus.CANCELLED;
			data.rescheduled_lesson_id = null;
			data.rescheduled_lesson_date = null;
			if (rescheduled_lesson_id) {
				const lessonForReschedule = await this.prisma.lesson.findUnique({
					where: { id: rescheduled_lesson_id },
				});
				if (!lessonForReschedule) {
					throw new NotFoundException('Занятие для переноса не найдено');
				}
				await this.prisma.lesson.update({
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

		await this.prisma.lesson.update({
			where: { id: lessonId },
			data: { ...data, comment: cancelLessonDto.comment },
		});

	}

	async deleteLesson(lessonId: number): Promise<void> {
		const lesson = await this.prisma.lesson.findUnique({
			where: { id: lessonId },
		});
		if (!lesson) {
			throw new NotFoundException('Занятие не найдено');
		}

		await this.prisma.$transaction(async (tx) => {
			if (lesson.rescheduled_lesson_id) {
				await tx.lesson.update({
					where: { id: lesson.rescheduled_lesson_id },
					data: { rescheduled_lesson_id: null, rescheduled_lesson_date: null },
				});
			}
			await tx.lesson.delete({
				where: { id: lessonId },
			});
		});
	}


	async manageFreeLessonStatus(lessonId: number, manageFreeLessonStatusDto: ManageFreeLessonStatusDto): Promise<void> {
		await this.prisma.lesson.update({
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
				created_at: lesson.student.created_at,
				deleted_at: lesson.student.deleted_at,
				teacher_id: lesson.student.teacher_id || null,
				timezone: lesson.student.timezone as Timezone,
			},
			plan: {
				id: lesson.plan.id,
				plan_name: lesson.plan.plan_name,
				plan_price: lesson.plan.plan_price,
				plan_currency: lesson.plan.plan_currency,
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