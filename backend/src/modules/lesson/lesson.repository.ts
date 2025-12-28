import { PrismaService } from "src/core/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { SingleLessonInputDto } from "./dto/single-lesson.input.dto";
import { Lesson } from "@prisma/client";
import { LessonOutputDto } from "./dto/lesson.output.dto";
import { LessonStatusDto } from "./dto/lesson-status.enum";

@Injectable()
export class LessonRepository {
	constructor(private readonly prisma: PrismaService) {}

	async getLessonByStartDateAndStudentId(start_date: string, student_id: number): Promise<any> {
		const lesson = await this.prisma.lesson.findFirst({
			where: {
				start_date,
				student_id,
			},
		});
		return lesson;
	}

	async createLesson(singleLessonInputDto: SingleLessonInputDto): Promise<LessonOutputDto> {
		const lesson = await this.prisma.lesson.create({
			data: singleLessonInputDto,
		});
		return this.mapLessonToView(lesson);
	}

	async findLessonsForPeriod(start_date: string, end_date: string, teacher_id: number): Promise<LessonOutputDto[]> {
		const lessons = await this.prisma.lesson.findMany({
			where: {
				start_date: { gte: start_date, lte: end_date },
				teacher_id,
			},
		});
		return lessons.map(lesson => this.mapLessonToView(lesson));
	}
	

	private mapLessonToView(lesson: Lesson): LessonOutputDto {
		return {
			id: lesson.id,
			student_id: lesson.student_id,
			plan_id: lesson.plan_id,
			start_date: lesson.start_date,
			status: lesson.status as LessonStatusDto,
			comment: lesson.comment,
			payment_status: lesson.payment_status,
			corrected_time: lesson.corrected_time,
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