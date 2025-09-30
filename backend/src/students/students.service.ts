import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LessonStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class StudentsService {
	constructor(private readonly prisma: PrismaService) { }

	async create(createStudentDto: CreateStudentDto) {
		return await this.prisma.student.create({
			data: {
				...createStudentDto,
				class: +createStudentDto.class,
			},
		});
	}

	async findAll() {
		return await this.prisma.student.findMany({
			include: {
				telegrams: true,
				lessons: true,
			},
			where: {
				deleted_at: null,
			},
			orderBy: {
				name: 'asc',
			},
		});
	}

	async update(id: number, updateStudentDto: UpdateStudentDto) {
		return await this.prisma.student.update({
			where: { id },
			data: updateStudentDto,
		});
	}

	async pay(id: number, sum: number) {
		const student = await this.prisma.student.update({
			where: { id },
			data: { balance: { increment: sum } },
		});

		const lessons = await this.prisma.lesson.findMany({
			where: {
				student_id: id,
				is_regular: true,
				is_paid: false,
			}, // может ли быть кейс у одного ребенка разные планы?
		});

		return true
	}

	async findOne(id: number) {
		const student = await this.prisma.student.findUnique({
			where: { id },
			include: {
				telegrams: true,
			},
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}

		return {
			id: student.id,
			name: student.name,
			class: student.class,
			birth_date: student.birth_date,
			balance: student.balance,
			bookUntilCancellation: student.bookUntilCancellation,
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
		return this.prisma.student.update({
			data: {
				deleted_at: new Date(),
			},
			where: { id },
		});
	}
}
