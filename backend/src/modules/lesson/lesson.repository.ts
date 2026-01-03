import { PrismaService } from "src/core/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { SingleLessonInputDto } from "./dto/single-lesson.input.dto";
import { Lesson, LessonStatus, Student } from "@prisma/client";
import { LessonOutputDto } from "./dto/lesson.output.dto";
import { LessonStatusEnum } from "./dto/lesson-status.enum";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import { Plan } from "@prisma/client";
import { RegularLessonOutputDto } from "./dto/regular-lesson.output.dto";
import { Teacher } from "@prisma/client";
import { CancelationStatusEnum, CancelLessonDto } from "./dto/cancel-lesson.dto";
@Injectable()
export class LessonRepository {
	constructor(private readonly prisma: PrismaService) {}

	// async getLessonByStartDateAndStudentId(start_date: string, student_id: number): Promise<any> {
	// 	const lesson = await this.prisma.lesson.findFirst({
	// 		where: {
	// 			start_date,
	// 			student_id,
	// 		},
	// 	});
	// 	return lesson;
	// }

	async findLessonsByStartDate(start_date: Date, teacher_id: number): Promise<LessonOutputDto[]> {
		const endDate = new Date(start_date.getTime() + 60 * 60 * 1000);
		const lessons = await this.prisma.lesson.findMany({
			where: {
				date: { gte: start_date, lte: endDate },
				student: {
					teacher_id,
				},
			},
			include: {
				student: true,
				teacher: true,
				plan: true,
				regular_lesson: true,
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
		const lesson = await this.prisma.lesson.create({
			data: newLesson,
			include: {
				student: true,
				teacher: true,
				plan: true,
				regular_lesson: true,
			},
		});
		return this.mapLessonToView(lesson);
	}

	async findLessonsForPeriod(start_date: string, end_date: string, teacher_id: number): Promise<LessonOutputDto[]> {
		const startDate = startOfDay(parseISO(start_date));
		const endDate = endOfDay(parseISO(end_date));

		const lessons = await this.prisma.lesson.findMany({
			where: {
				date: { gte: startDate, lte: endDate },
				student: {
					teacher_id,
				},
			},
			include: {
				student: true,
				teacher: true,
				plan: true,
				regular_lesson: true,
			},
		});
		return lessons.map(l => this.mapLessonToView(l));
	}

	async findExistingLessonsByDate(mergedDate: Date): Promise<Array<Lesson & { student: Student } & { plan: Plan }>> {
		return await this.prisma.lesson.findMany({
			where: {
				date: mergedDate,
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
			},
		});
		await this.prisma.lesson.updateMany({
			data: {
				status: LessonStatus.COMPLETED_PAID,
			},
			where: {
				status: LessonStatus.PENDING_PAID,
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
				regular_lesson: true,
			},
		});
		if (!lesson) {
			return null;
		}
		return this.mapLessonToView(lesson);
	}

	async cancelLesson(lessonId: number, cancelLessonDto: CancelLessonDto): Promise<void> {
		const data: { status?: LessonStatus } = {};
		if (cancelLessonDto.status === CancelationStatusEnum.CANCELLED) {
			data.status = LessonStatus.CANCELLED;
		} else if (cancelLessonDto.status === CancelationStatusEnum.MISSED) {
			data.status = LessonStatus.MISSED;
		} else if (cancelLessonDto.status === CancelationStatusEnum.RESCHEDULED) {
			data.status = LessonStatus.RESCHEDULED;
		}

		await this.prisma.lesson.update({
			where: { id: lessonId },
			data: { ...data, comment: cancelLessonDto.comment },
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
			payment_status: lesson.payment_status,
			created_at: lesson.created_at,
			is_paid: lesson.is_paid,
			is_regular: lesson.is_regular,
			is_free: lesson.is_free,
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