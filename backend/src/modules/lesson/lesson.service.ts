import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays, endOfMonth, parseISO, getDay, startOfDay, format } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CancelationStatusEnum, CancelLessonDto } from './dto/cancel-lesson.dto';
import { SingleLessonInputDto } from './dto/single-lesson.input.dto';
import { LessonRepository } from './lesson.repository';
import { PlanService } from '../plan/plan.service';
import { LessonOutputDto } from './dto/lesson.output.dto';
import { RegularLessonsInputDto, WeekDay } from './dto/regular-lesson.input.dto';
import { LessonRegularRepository } from './lesson-regular.repository';
import { RegularLessonOutputDto } from './dto/regular-lesson.output.dto';
import { PlanTypeEnum } from '../plan/dto/create-plan.input.dto';
import { StudentService } from '../student/student.service';
import { LessonInputStatusEnum, LessonStatusEnum } from './dto/lesson-status.enum';
import { Lesson } from '@prisma/client';
import { ChangeTeacherDto } from './dto/change-teacher.dto';
import { TeacherService } from '../teacher/teacher.service';
import { JwtPayloadDto } from '../auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '../teacher/dto/teacherRole';

@Injectable()
export class LessonService {
	constructor(
		private readonly lessonRepository: LessonRepository,
		private readonly planService: PlanService,
		private readonly studentService: StudentService,
		private readonly teacherService: TeacherService,
		private readonly lessonRegularRepository: LessonRegularRepository,
	) { }

	async createSingleLessonByAdmin(singleLessonInputDto: SingleLessonInputDto): Promise<LessonOutputDto> {
		const { plan_id, start_date, student_id, teacher_id, isFree } = singleLessonInputDto;

		const date = new Date(start_date);
		const plan = await this.planService.findById(plan_id);
		if (!plan) {
			throw new NotFoundException('Plan not found');
		}
		if (plan.deleted_at) {
			throw new BadRequestException('Plan already deleted');
		}
		const student = await this.studentService.findById(student_id);
		if (!student) {
			throw new NotFoundException('Student not found');
		}

		const lessonAlreadyBooked = await this.lessonRepository.findExistingLessonsByDate(date);
		if (lessonAlreadyBooked.length > 1) {
			throw new BadRequestException(`Максимальное количество уроков в это время: ${date.toLocaleDateString()}`);
		}
		if (lessonAlreadyBooked.length === 1 && lessonAlreadyBooked[0].plan.plan_type === PlanTypeEnum.INDIVIDUAL) {
			throw new BadRequestException(`Это время занято индивидуальным занятием у ${lessonAlreadyBooked[0].student.name}: ${date.toLocaleDateString()}`);
		}
		if (lessonAlreadyBooked.filter(el => el.student.id === student_id).length > 0) {
			throw new BadRequestException(`Это время уже назначено у ${lessonAlreadyBooked[0].student.name}: ${date.toLocaleDateString()}`);
		}
		if (lessonAlreadyBooked.length > 0 && lessonAlreadyBooked[0].plan_id !== plan_id) {
			throw new BadRequestException(`Не совпадает тарифный план: ${date.toLocaleDateString()}`);
		}
		const newLesson = {
			student_id,
			teacher_id,
			plan_id,
			date,
			is_free: isFree,
			is_regular: false,
			status: LessonInputStatusEnum.PENDING_UNPAID,
		}
		return await this.lessonRepository.createSingleLesson(newLesson as Lesson);
	}

	async findLessonsForPeriod(start_date: string, end_date: string, teacher_id: number): Promise<LessonOutputDto[]> {
		return await this.lessonRepository.findLessonsForPeriod(start_date, end_date, teacher_id);
	}

	async findLessonsByStartDate(start_date: Date, teacher_id: number): Promise<LessonOutputDto[]> {
		return await this.lessonRepository.findLessonsByStartDate(start_date, teacher_id);
	}

	async createRegularLessons(regularLessonsInputDto: RegularLessonsInputDto, student_id: number): Promise<RegularLessonOutputDto[]> {
		const { lessons } = regularLessonsInputDto;
		const regularLessons: RegularLessonOutputDto[] = [];
		for (const lesson of lessons) {
			const { plan_id, start_time, week_day, start_period_date, end_period_date, teacher_id } = lesson;
			const plan = await this.planService.findById(plan_id);
			if (!plan) {
				throw new NotFoundException('Plan not found');
			}
			const regularLesson: RegularLessonOutputDto = await this.lessonRegularRepository.createRegularLesson(lesson, student_id);
			regularLessons.push(regularLesson);

			// Generate all dates for the specified week_day between start_period_date and end_period_date
			const lessonDates = this.getDatesForWeekDay(week_day, start_period_date, end_period_date);

			// Parse start_time as ISO date string and extract UTC hours and minutes
			const startTimeDate = parseISO(start_time);
			const hours = startTimeDate.getUTCHours();
			const minutes = startTimeDate.getUTCMinutes();

			// Create individual lessons for each date
			for (const lessonDate of lessonDates) {
				// Merge date with time from start_time using Date.UTC to ensure correct timezone handling
				const mergedDate = new Date(Date.UTC(
					lessonDate.getUTCFullYear(),
					lessonDate.getUTCMonth(),
					lessonDate.getUTCDate(),
					hours,
					minutes,
					0,
					0
				));

				// Check if lesson already exists
				const existingLessons = await this.lessonRepository.findExistingLessonsByDate(mergedDate);
				//todo проверить статусы занятий
				if (existingLessons.length > 1) {
					await this.lessonRegularRepository.deleteRegularLesson(regularLesson.id);
					throw new BadRequestException(`Максимальное количество уроков в это время: ${mergedDate}`);
				}
				if (existingLessons.length === 1 && existingLessons[0].plan.plan_type === PlanTypeEnum.INDIVIDUAL) {
					await this.lessonRegularRepository.deleteRegularLesson(regularLesson.id);
					throw new BadRequestException(`Это время занято индивидуальным занятием у ${existingLessons[0].student.name}: ${mergedDate}`);
				}
				if (existingLessons.filter(el => el.student.id === student_id).length > 0) {
					await this.lessonRegularRepository.deleteRegularLesson(regularLesson.id);
					throw new BadRequestException(`Это время уже назначено у ${existingLessons[0].student.name}: ${mergedDate}`);
				}
				if (existingLessons.length > 0 && existingLessons[0].plan_id !== plan_id) {
					await this.lessonRegularRepository.deleteRegularLesson(regularLesson.id);
					throw new BadRequestException(`Не совпадает тарифный план: ${mergedDate}`);
				}
				// Create the lesson
				await this.lessonRepository.createRegularLesson(student_id, teacher_id, plan_id, mergedDate, regularLesson);
			}
		}
		return regularLessons;
	}

	async changeTeacher(lessonId: number, changeTeacherDto: ChangeTeacherDto): Promise<void> {
		const teacher = await this.teacherService.getTeacherById(changeTeacherDto.teacher_id);
		if (!teacher) {
			throw new NotFoundException('Teacher not found');
		}
		if (teacher.deleted_at) {
			throw new BadRequestException('Teacher is deleted');
		}
		await this.lessonRepository.changeTeacher(lessonId, changeTeacherDto.teacher_id);
	}

	async cancelLesson(lessonId: number, cancelLessonDto: CancelLessonDto, teacher: JwtPayloadDto): Promise<void> {
		const lesson = await this.lessonRepository.findById(lessonId);
		if (!lesson) {
			throw new NotFoundException('Lesson not found');
		}
		if (lesson.status === LessonStatusEnum.CANCELLED || lesson.status === LessonStatusEnum.MISSED || lesson.status === LessonStatusEnum.RESCHEDULED) {
			throw new BadRequestException('Lesson already cancelled');
		}
		const existingTeacher = await this.teacherService.getTeacherById(+teacher.id);
		if (!existingTeacher) {
			throw new NotFoundException('Teacher not found');
		}
		if (existingTeacher.deleted_at) {
			throw new BadRequestException('Teacher is deleted');
		}
		if (teacher.role !== TeacherRoleEnum.ADMIN && lesson.student.teacher_id !== +teacher.id) {
			throw new BadRequestException('You are not allowed to cancel this lesson');
		}
		await this.lessonRepository.cancelLesson(lessonId, cancelLessonDto);
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
