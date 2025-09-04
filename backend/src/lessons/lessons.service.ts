import { Injectable } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { addDays, endOfMonth } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class LessonsService {
	constructor(private readonly prisma: PrismaService) {}
	
  async create(createLessonDto: CreateLessonDto) {
		const { bookUntilCancellation, plan_id, specificDays, start_date, student_id } = createLessonDto;

		if (bookUntilCancellation) {
			await this.prisma.student.update({
				data: {
					bookUntilCancellation: true,
				},
				where: {
					id: student_id,
				},
			});
	
			const start = new Date(start_date);
			const end = endOfMonth(start);
			const weekday = start.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	
			const lessonDates: Date[] = [];
	
			// Начинаем с даты старта и двигаемся по дням
			let current = new Date(start);
			while (current <= end) {
				if (current.getDay() === weekday) {
					lessonDates.push(new Date(current));
				}
				current = addDays(current, 1);
			}
	
			// Создаём занятия на каждый найденный день
			for (const date of lessonDates) {
				await this.prisma.lesson.create({
					data: {
						plan_id,
						start_date: date,
						student_id,
					},
				});
			}
	
			return {
				message: `Lessons booked every ${start.toLocaleDateString('en-US', { weekday: 'long' })} until end of month`,
			};
		}

		if(specificDays.length > 0) {
			const updatedDates = this.updateSpecificDays(specificDays, start_date);
			updatedDates.forEach(async (day) => {
				await this.prisma.lesson.create({
					data: {
						plan_id,
						start_date: day,
						student_id,
					},
				});
			});

			return {
				message: `Lessons booked on specific days`,
			};
		}

    await this.prisma.lesson.create({
      data: {
        plan_id,
        start_date,
        student_id,
      },
    });

		return {
			message: "Lesson created successfully",
		};
  }

  findLessonsForPeriod(start_date: string, end_date: string) {
    return this.prisma.lesson.findMany({
      include: {
        student: true,
        plan: true,
      },
      where: {
        start_date: {
          gte: start_date,
          lte: end_date,
        },
      },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} lesson`;
  }

  update(id: number, updateLessonDto: UpdateLessonDto) {
    return `This action updates a #${id} lesson`;
  }

  remove(id: number) {
    return `This action removes a #${id} lesson`;
  }

	private updateSpecificDays(specificDays: string[], start_date: string) {
		const start_date_date = new Date(start_date);
		const hours = start_date_date.getHours();
		const minutes = start_date_date.getMinutes();
		const seconds = start_date_date.getSeconds();
		const ms = start_date_date.getMilliseconds();
		
		const updatedDates = specificDays.map(dateStr => {
			const original = new Date(dateStr);
		
			// Создаём новую дату с той же датой, но с временем из start_date
			const updated = new Date(
				original.getFullYear(),
				original.getMonth(),
				original.getDate(),
				hours,
				minutes,
				seconds,
				ms
			);
		
			return updated.toISOString(); // 👉 формат: 2025-09-09T08:00:00.000Z
		});

		return updatedDates;
	}

	@Cron(CronExpression.EVERY_5_MINUTES)
	async updateLessonsStatus() {
		const now = new Date();
		
		await this.prisma.lesson.updateMany({
			data: {
				status: "COMPLETED",
			},
			where: {
				start_date: {
					lte: now,
				},
			},
		});
	}
}
