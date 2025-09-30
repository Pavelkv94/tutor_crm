import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LessonStatus } from '@prisma/client';
import { SendReportDto } from './dto/send-report.dto';
import { TelegramService } from 'src/telegram/telegram.service';

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

		await this.telegramService.sendMessageToAdmin(JSON.stringify(report));

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
