import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LessonStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class StudentsService {
	constructor(private readonly prisma: PrismaService) { }

	create(createStudentDto: CreateStudentDto) {
		return this.prisma.student.create({
			data: {
				...createStudentDto,
				class: +createStudentDto.class,
			},
		});
	}

	findAll() {
		return this.prisma.student.findMany({
			include: {
				telegrams: true,
				lessons: true,
			},
		});
	}

	update(id: number, updateStudentDto: UpdateStudentDto) {
		return this.prisma.student.update({
			where: { id },
			data: updateStudentDto,
		});
	}

	async findOne(id: number, start_date: string, end_date: string) {
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
		const completedLessonsCount = student.lessons.filter((lesson: any) => lesson.status === LessonStatus.COMPLETED).length;
		const pendingLessonsCount = student.lessons.filter((lesson: any) => lesson.status === LessonStatus.PENDING).length;
		const totalLessonsCount = student.lessons.length;
		const totalLessonsPrice = student.lessons.reduce((acc: number, lesson: any) => acc + lesson.plan.plan_price, 0);

		return {
			id: student.id,
			name: student.name,
			class: student.class,
			birth_date: student.birth_date,
			balance: student.balance,
			bookUntilCancellation: student.bookUntilCancellation,
			canceledLessonsCount,
			completedLessonsCount,
			pendingLessonsCount,
			totalLessonsCount,
			totalLessonsPrice,
			telegrams: student.telegrams,
			notifyAboutBirthday: student.notifyAboutBirthday,
			notifyAboutLessons: student.notifyAboutLessons,
		};
	}

	async getTelegramLink(id: number): Promise<{ link: string }> {
		const uuid = randomUUID()
		const expiredAt = new Date(Date.now() + 1000 * 60 * 15);
		await this.prisma.telegramToken.create({
			data: {
				token: uuid,
				student_id: id,
				expired_at: expiredAt,
			},
		})
		return { link: `https://t.me/otoseeker_bot?start=${uuid}` }
	}

	remove(id: number) {
		return this.prisma.student.delete({
			where: { id },
		});
	}
}
