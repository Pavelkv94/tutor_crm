import { PrismaService } from "src/core/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { SingleLessonInputDto } from "./dto/single-lesson.input.dto";
import { Lesson } from "@prisma/client";
import { LessonOutputDto } from "./dto/lesson.output.dto";
import { LessonStatusDto } from "./dto/lesson-status.enum";
import { parseISO, startOfDay, endOfDay } from "date-fns";

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

	// async createLesson(singleLessonInputDto: SingleLessonInputDto): Promise<LessonOutputDto> {
	// 	const lesson = await this.prisma.lesson.create({
	// 		data: singleLessonInputDto,
	// 	});
	// 	return this.mapLessonToView(lesson);
	// }

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
		return lessons as LessonOutputDto[];
	}


	private mapLessonToView(lesson: Lesson): LessonOutputDto {
		console.log(lesson);
		return {
			id: lesson.id,
			student_id: lesson.student_id,
			plan_id: lesson.plan_id,
			date: lesson.date,
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
			teacher_id: lesson.teacher_id,
		};
	}
}