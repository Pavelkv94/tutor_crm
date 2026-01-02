import { PrismaService } from "src/core/prisma/prisma.service";
import { RegularLessonInputDto } from "./dto/regular-lesson.input.dto";
import { Injectable } from "@nestjs/common";
import { RegularLesson } from "@prisma/client";
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

	private mapRegularLessonToView(regularLesson: RegularLesson): RegularLessonOutputDto {
		return {
			id: regularLesson.id,
			plan_id: regularLesson.plan_id,
			student_id: regularLesson.student_id,
			teacher_id: regularLesson.teacher_id,
			start_time: regularLesson.start_time,
			week_day: regularLesson.week_day as WeekDay,
			start_period_date: regularLesson.start_period_date,
			end_period_date: regularLesson.end_period_date,
		};
	}
}