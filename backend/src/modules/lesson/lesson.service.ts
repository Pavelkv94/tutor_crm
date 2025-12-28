import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { addDays, endOfMonth } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessonStatus, PlanType } from '@prisma/client';
import { CancelLessonDto } from './dto/cancel-lesson.dto';
import { SingleLessonInputDto } from './dto/single-lesson.input.dto';
import { LessonRepository } from './lesson.repository';
import { PlanService } from '../plan/plan.service';
import { LessonOutputDto } from './dto/lesson.output.dto';

@Injectable()
export class LessonService {
	constructor(private readonly lessonRepository: LessonRepository, private readonly planService: PlanService) { }

	async createSingleLesson(singleLessonInputDto: SingleLessonInputDto): Promise<LessonOutputDto> {
		const { plan_id, start_date, student_id, teacher_id, corrected_time, status, rescheduled_lesson_id, rescheduled_lesson_date } = singleLessonInputDto;

		const lessonAlreadyBooked = await this.lessonRepository.getLessonByStartDateAndStudentId(start_date, student_id);

		if (lessonAlreadyBooked) {
			throw new BadRequestException("Lesson already booked for this student at this time");
		}

		const plan = await this.planService.findById(plan_id);
		if (!plan) {
			throw new NotFoundException('Plan not found');
		}

		return await this.lessonRepository.createLesson(singleLessonInputDto);
	}

	async findLessonsForPeriod(start_date: string, end_date: string, teacher_id: number): Promise<LessonOutputDto[]> {
		return await this.lessonRepository.findLessonsForPeriod(start_date, end_date, teacher_id);
	}

	// async create(createLessonDto: CreateLessonDto) {
	// 	const { bookUntilCancellation, plan_id, specificDays, start_date, student_id, corrected_time } = createLessonDto;

	// 	const corrected_time_date = new Date(corrected_time);
	// 	const lessonAlreadyBooked = await this.prisma.lesson.findFirst({
	// 		where: {
	// 			start_date,
	// 			student_id,
	// 		},
	// 	});

	// 	if (lessonAlreadyBooked) {
	// 		throw new BadRequestException("Lesson already booked for this student");
	// 	}


	// 	const plan = await this.prisma.plan.findUnique({
	// 		where: {
	// 			id: plan_id,
	// 		},
	// 	});

	// 	// проверяем, нет ли уже занятия на эту дату
	// 	await this.checkDaysForLessons(start_date, plan);

	// 	if (bookUntilCancellation) {
	// 		await this.prisma.student.update({
	// 			data: {
	// 				bookUntilCancellation: true,
	// 			},
	// 			where: {
	// 				id: student_id,
	// 			},
	// 		});

	// 		const start = new Date(start_date);
	// 		const end = endOfMonth(start);
	// 		const weekday = start.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

	// 		const lessonDates: Date[] = [];

	// 		// Начинаем с даты старта и двигаемся по дням
	// 		let current = new Date(start);
	// 		while (current <= end) {
	// 			if (current.getDay() === weekday) {
	// 				lessonDates.push(new Date(current));
	// 			}
	// 			current = addDays(current, 1);
	// 		}

	// 		const daysIsFree = await this.daysIsFree(lessonDates as any, plan);

	// 		if (daysIsFree) {
	// 			// Создаём занятия на каждый найденный день
	// 			for (const date of lessonDates) {

	// 				const merged = new Date(date);
	// 				merged.setUTCHours(corrected_time_date.getUTCHours(), corrected_time_date.getUTCMinutes(), corrected_time_date.getUTCSeconds(), corrected_time_date.getUTCMilliseconds());
	// 				await this.prisma.lesson.create({
	// 					data: {
	// 						plan_id,
	// 						start_date: date,
	// 						student_id,
	// 						corrected_time: merged.toISOString(),
	// 						is_regular: true
	// 					},
	// 				});
	// 			}

	// 			return {
	// 				message: `Lessons booked every ${start.toLocaleDateString('en-US', { weekday: 'long' })} until end of month`,
	// 			};
	// 		}
	// 	} else if (specificDays.length > 0) {
	// 		const updatedDates = this.updateSpecificDays(specificDays, start_date);

	// 		const daysIsFree = await this.daysIsFree(updatedDates as any, plan);

	// 		if (daysIsFree) {
	// 			updatedDates.forEach(async (day) => {
	// 				const merged = new Date(day);
	// 				merged.setUTCHours(corrected_time_date.getUTCHours(), corrected_time_date.getUTCMinutes(), corrected_time_date.getUTCSeconds(), corrected_time_date.getUTCMilliseconds());
	// 				await this.prisma.lesson.create({
	// 					data: {
	// 						plan_id,
	// 						start_date: day,
	// 						student_id,
	// 						corrected_time: merged.toISOString(),
	// 						is_regular: true
	// 					},
	// 				});
	// 			});
	// 		}

	// 		return {
	// 			message: `Lessons booked on specific days`,
	// 		};
	// 	}



	// 	const newLesson = await this.prisma.lesson.create({
	// 		data: {
	// 			plan_id,
	// 			start_date,
	// 			student_id,
	// 			corrected_time,
	// 			rescheduled_lesson_id: createLessonDto.rescheduled_lesson_id || null,
	// 			rescheduled_lesson_date: createLessonDto.rescheduled_lesson_date || null,
	// 			is_regular: false
	// 		},
	// 	});

	// 	if (createLessonDto.rescheduled_lesson_id) {
	// 		await this.prisma.lesson.update({
	// 			data: {
	// 				rescheduled_to_lesson_id: newLesson.id,
	// 				rescheduled_to_lesson_date: newLesson.corrected_time,
	// 			},
	// 			where: {
	// 				id: createLessonDto.rescheduled_lesson_id,
	// 			},
	// 		});
	// 	}

	// 	return {
	// 		message: "Lesson created successfully",
	// 	};
	// }

	// async findLessonsForPeriod(start_date: string, end_date: string) {
	// 	return await this.prisma.lesson.findMany({
	// 		include: {
	// 			student: true,
	// 			plan: true,
	// 		},
	// 		where: {
	// 			start_date: {
	// 				gte: start_date,
	// 				lte: end_date,
	// 			},
	// 		},
	// 	});
	// }

	// async cancelLesson(id: number, cancelLessonDto: CancelLessonDto) {
	// 	return await this.prisma.lesson.update({
	// 		data: {
	// 			status: cancelLessonDto.cancelationType,
	// 			comment: cancelLessonDto.comment,
	// 		},
	// 		where: { id },
	// 	});
	// }

	// findOne(id: number) {
	// 	return `This action returns a #${id} lesson`;
	// }

	// update(id: number) {
	// 	return `This action updates a #${id} lesson`;
	// }

	// remove(id: number) {
	// 	return `This action removes a #${id} lesson`;
	// }

	// async findLessonsByStartDate(start_date: string) {
	// 	return await this.prisma.lesson.findMany({
	// 		where: {
	// 			start_date,
	// 		},
	// 		include: {
	// 			student: true,
	// 			plan: true,
	// 		},
	// 	});
	// }

	// private updateSpecificDays(specificDays: string[], start_date: string) {
	// 	const start_date_date = new Date(start_date);
	// 	const hours = start_date_date.getHours();
	// 	const minutes = start_date_date.getMinutes();
	// 	const seconds = start_date_date.getSeconds();
	// 	const ms = start_date_date.getMilliseconds();

	// 	const updatedDates = specificDays.map(dateStr => {
	// 		const original = new Date(dateStr);

	// 		// Создаём новую дату с той же датой, но с временем из start_date
	// 		const updated = new Date(
	// 			original.getFullYear(),
	// 			original.getMonth(),
	// 			original.getDate(),
	// 			hours,
	// 			minutes,
	// 			seconds,
	// 			ms
	// 		);

	// 		return updated.toISOString(); // 👉 формат: 2025-09-09T08:00:00.000Z
	// 	});

	// 	return updatedDates;
	// }

	// private async checkDaysForLessons(start_date: string, plan: any): Promise<boolean> {
	// 	const lessons = await this.prisma.lesson.findMany({
	// 		where: {
	// 			start_date,
	// 			status: {
	// 				not: "CANCELLED",
	// 			},
	// 		},
	// 		include: {
	// 			student: true,
	// 			plan: true,
	// 		},
	// 	});

	// 	if (lessons.length === 0) {
	// 		return true;
	// 	}

	// 	if (lessons[0].plan.plan_type === PlanType.INDIVIDUAL && lessons.length >= 1) {
	// 		const message = `Lesson already exists: ${lessons[0].start_date.toLocaleDateString()} ${lessons[0].plan.plan_name} - ${lessons[0].student.name}`;
	// 		throw new BadRequestException(message);
	// 	}

	// 	if (lessons[0].plan.plan_type === PlanType.PAIR && (lessons.length >= 2)) {
	// 		const message = `Lesson already exists: ${lessons[0].start_date.toLocaleDateString()} ${lessons[0].plan.plan_name} - ${lessons[0].student.name} and ${lessons[1].student.name}`;
	// 		throw new BadRequestException(message);
	// 	}

	// 	if (lessons[0].plan.plan_type === PlanType.PAIR && lessons.length === 1 && plan?.plan_type === PlanType.INDIVIDUAL) {
	// 		const message = `You cant assign individual plan to pair lesson: ${lessons[0].start_date.toLocaleDateString()} ${lessons[0].plan.plan_name} - ${lessons[0].student.name}`;
	// 		throw new BadRequestException(message);
	// 	}

	// 	if (lessons[0].plan.plan_type === PlanType.PAIR && lessons.length === 1 && plan?.plan_type === PlanType.PAIR && lessons[0].plan.duration !== plan.duration) {
	// 		const message = `You cant assign pair plan with different duration to pair lesson: ${lessons[0].start_date.toLocaleDateString()} ${lessons[0].plan.plan_name} - ${lessons[0].student.name}`;
	// 		throw new BadRequestException(message);
	// 	}


	// 	return true;
	// }

	// private async daysIsFree(days: Date[], plan: any): Promise<boolean> {
	// 	const busyDays = await this.prisma.lesson.findMany({
	// 		where: {
	// 			start_date: {
	// 				in: days,
	// 			},
	// 		},
	// 		include: {
	// 			plan: true,
	// 			student: true,
	// 		},
	// 	});

	// 	let unavailableBusyDays: any[] = [];
	// 	if (plan.plan_type === PlanType.PAIR) {
	// 		const notPairOrDuration = busyDays.filter(lesson => lesson.plan.plan_type !== PlanType.PAIR || lesson.plan.duration !== plan.duration);
	// 		const busyPairs = busyDays.filter(lesson => lesson.plan.plan_type === PlanType.PAIR && lesson.plan.duration === plan.duration);
	// 		// Группируем по start_date
	// 		const groupedByDate = busyPairs.reduce((acc, lesson) => {
	// 			const date = lesson.start_date.toISOString();
	// 			acc[date] = acc[date] ? [...acc[date], lesson] : [lesson];
	// 			return acc;
	// 		}, {} as Record<string, typeof busyPairs>);

	// 		// Оставляем только те даты, где больше одной записи
	// 		const duplicates = Object.values(groupedByDate)
	// 			.filter(group => group.length > 1)
	// 			.flat(); // объединяем в один массив
	// 		unavailableBusyDays = [...notPairOrDuration, ...duplicates];
	// 	} else {
	// 		unavailableBusyDays = busyDays;
	// 	}

	// 	if (unavailableBusyDays.length > 0) {
	// 		const message = `Lesson already exists: ${busyDays[0].start_date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${busyDays[0].plan.plan_name} - ${busyDays[0].student.name}`;
	// 		throw new BadRequestException(message);
	// 	}

	// 	return true;
	// }

	// @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	// async updateLessonsStatus() {
	// 	const now = new Date();

	// 	await this.prisma.lesson.updateMany({
	// 		data: {
	// 			status: LessonStatus.COMPLETED_UNPAID,
	// 		},
	// 		where: {
	// 			start_date: {
	// 				lte: now,
	// 			},
	// 			status: LessonStatus.PENDING_UNPAID,
	// 		},
	// 	});
	// }
}
