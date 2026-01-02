import { PrismaService } from "src/core/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { SingleLessonInputDto } from "./dto/single-lesson.input.dto";
import { Lesson, LessonStatus, Student } from "@prisma/client";
import { LessonOutputDto } from "./dto/lesson.output.dto";
import { LessonStatusDto } from "./dto/lesson-status.enum";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import { Plan } from "@prisma/client";
import { RegularLessonOutputDto } from "./dto/regular-lesson.output.dto";
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

	async findLessonsForPeriod(start_date: string, end_date: string, teacher_id: number): Promise<LessonOutputDto[]> {
		const startDate = startOfDay(parseISO(start_date));
		const endDate = endOfDay(parseISO(end_date));

		const lessons = await this.prisma.lesson.findMany({
			where: {
				date: { gte: startDate, lte: endDate },
				teacher_id,
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

	private mapLessonToView(lesson: Lesson & { student: Student } & { plan: Plan }): LessonOutputDto {
		return {
			id: lesson.id,
			student: {
				id: lesson.student.id,
				name: lesson.student.name,
				class: lesson.student.class,
				birth_date: lesson.student.birth_date,
				created_at: lesson.student.created_at,
				deleted_at: lesson.student.deleted_at,
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
			status: lesson.status as LessonStatusDto,
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
		};
	}
}