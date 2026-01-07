import { PrismaService } from "src/core/prisma/prisma.service";
import { RegularLessonInputDto } from "./dto/regular-lesson.input.dto";
import { Injectable } from "@nestjs/common";
import { Plan, RegularLesson } from "@prisma/client";
import { RegularLessonOutputDto } from "./dto/regular-lesson.output.dto";
import { WeekDay } from "./dto/regular-lesson.input.dto";

@Injectable()
export class LessonRegularRepository {
	constructor(private readonly prisma: PrismaService) { }

	async createRegularLesson(regularLessonInputDto: RegularLessonInputDto, student_id: number): Promise<RegularLessonOutputDto> {
		const regularLesson = await this.prisma.regularLesson.create({
			data: {
				plan_id: regularLessonInputDto.plan_id,
				student_id: student_id,
				teacher_id: regularLessonInputDto.teacher_id,
				start_time: regularLessonInputDto.start_time,
				week_day: regularLessonInputDto.week_day,
				start_period_date: regularLessonInputDto.start_period_date,
				end_period_date: regularLessonInputDto.end_period_date,
			},
			include: {
				plan: true,
			},
		});
		return this.mapRegularLessonToView(regularLesson);
	}

	async deleteRegularLesson(regularLesson_id: number): Promise<void> {
		await this.prisma.regularLesson.delete({
			where: {
				id: regularLesson_id,
			},
		});
	}

	async getRegularLessons(student_id: number): Promise<RegularLessonOutputDto[]> {
		const regularLessons = await this.prisma.regularLesson.findMany({
			where: {
				student_id: student_id,
				end_period_date: {
					gte: new Date(),
				},
				deleted_at: null,
			},
			include: {
				plan: true,
			},
		});
		return regularLessons.map(this.mapRegularLessonToView);
	}

	private mapRegularLessonToView(regularLesson: RegularLesson & { plan: Plan }): RegularLessonOutputDto {
		return {
			id: regularLesson.id,
			student_id: regularLesson.student_id,
			teacher_id: regularLesson.teacher_id,
			start_time: regularLesson.start_time,
			week_day: regularLesson.week_day as WeekDay,
			start_period_date: regularLesson.start_period_date,
			end_period_date: regularLesson.end_period_date,
			plan: {
				id: regularLesson.plan.id,
				plan_name: regularLesson.plan.plan_name,
				plan_price: regularLesson.plan.plan_price,
				plan_currency: regularLesson.plan.plan_currency,
				duration: regularLesson.plan.duration,
				plan_type: regularLesson.plan.plan_type,
				deleted_at: regularLesson.plan.deleted_at,
				created_at: regularLesson.plan.created_at,
			},
		};
	}
}