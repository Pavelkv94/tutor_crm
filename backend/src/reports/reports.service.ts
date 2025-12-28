import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';
import { LessonStatus } from '@prisma/client';
import { SendReportDto } from './dto/send-report.dto';
import { TelegramService } from 'src/modules/telegram/telegram.service';

@Injectable()
export class ReportsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly telegramService: TelegramService
	) { }

	async findReport(id: number, start_date: string, end_date: string) {
		return this.buildReportMessage(id, start_date, end_date);
	}

	async sendReport(sendReportDto: SendReportDto) {
		const { studentId, start_date, end_date } = sendReportDto;

		const report = await this.buildReportMessage(studentId, start_date, end_date);

		const monthsOnRus = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];
		const currentMonth = monthsOnRus[new Date().getMonth()];

		const lessons = report.lessons.map((lesson: any) => {
			return `${lesson.corrected_time.toLocaleDateString('ru-RU', { day: '2-digit', timeZone: 'Europe/Minsk' })} ${lesson.corrected_time.toLocaleDateString('ru-RU', { month: 'long', timeZone: 'Europe/Minsk' })} (${lesson.corrected_time.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'Europe/Minsk' })}) ${lesson.corrected_time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Minsk' })}`;
		});

		const plans = await this.prisma.plan.findMany();

		const groupedLessonsByPlan = plans.map(plan => {
			return report.lessons.filter((lesson: any) => lesson.plan_id === plan.id);
		}); // [[], [], []]

		const lessonsResultMessage = groupedLessonsByPlan
			.filter(lessons => lessons.length > 0)
			.map(lessons => {
				const plan = plans.find(plan => plan.id === lessons[0].plan_id);
				return `🔸${lessons.length} урок(ов) ${(plan?.plan_type === "INDIVIDUAL" ? "индивидуально" : "в паре")} × ${plan?.plan_price}р = ${lessons.length * (plan?.plan_price ?? 0)}р`;
			});

		const message = `
		📅 РАСПИСАНИЕ НА ${currentMonth} (${report.student_name.split(' ')[0]})

${lessons.join('\n')}

${lessonsResultMessage.join('\n')}
📌 Итого: ${report.lessons.reduce((acc, lesson) => acc + lesson.plan.plan_price, 0)}р

💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) и  отправить чек для подтверждения 😊
		`
		await this.telegramService.sendMessageToAdmin(message);

		return report;
	}

	private async buildReportMessage(id: number, start_date: string, end_date: string) {
		const student = await this.prisma.student.findUnique({
			where: { id },
			include: {
				telegrams: true,
				lessons: {
					where: {
						start_date: {
							gte: start_date,
							lte: end_date,
						},
					},
					orderBy: {
						start_date: 'asc',
					},
					include: {
						plan: true,
					},
				},
			},
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}

		const canceledLessonsCount = student.lessons.filter((lesson: any) => lesson.status === LessonStatus.CANCELLED).length;
		const missedLessonsCount = student.lessons.filter((lesson: any) => lesson.status === LessonStatus.MISSED).length;
		const rescheduledLessonsCount = student.lessons.filter((lesson: any) => lesson.status === LessonStatus.RESCHEDULED).length;
		const completedLessonsCount = student.lessons.filter((lesson: any) => lesson.status === LessonStatus.COMPLETED).length;
		const pendingLessonsCount = student.lessons.filter((lesson: any) => lesson.status === LessonStatus.PENDING).length;
		const totalLessonsCount = student.lessons.length;
		const totalLessonsPrice = student.lessons.reduce((acc: number, lesson: any) => acc + lesson.plan.plan_price, 0);

		return {
			student_id: student.id,
			student_name: student.name,
			lessons: student.lessons,
			canceledLessonsCount,
			missedLessonsCount,
			rescheduledLessonsCount,
			completedLessonsCount,
			pendingLessonsCount,
			totalLessonsCount,
			totalLessonsPrice,
		};
	}

}
