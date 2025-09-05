import { Injectable } from '@nestjs/common';
import { Ctx, Start, Update } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { TELEGRAM_MESSAGES } from './telegram.messages';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Update()
@Injectable()
export class TelegramService extends Telegraf {
	private _token: string;

	constructor(
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService
	) {
		super(configService.get<string>('TELEGRAM_BOT_TOKEN') as string);
		this._token = configService.get<string>('TELEGRAM_BOT_TOKEN') as string;
	}

	@Start()
	async onStart(@Ctx() ctx: any) {
		const username = ctx.message?.from?.username;
		const firstName = ctx.message?.from?.first_name;
		const token = ctx.message?.text?.split(' ')[1];
		const chatId = ctx.message?.chat?.id;

		if (!username) {
			await ctx.replyWithHTML(TELEGRAM_MESSAGES.welcome);
		}

		if (token) {
			const authToken = await this.prismaService.telegramToken.findUnique({
				where: { token: token }
			});

			await ctx.reply(TELEGRAM_MESSAGES.welcome);

			if (!authToken) {
				await ctx.reply(TELEGRAM_MESSAGES.invalidToken);
				return;
			}

			const hasExpired = authToken && new Date(authToken.expired_at) < new Date();
			if (hasExpired) {
				await ctx.reply(TELEGRAM_MESSAGES.tokenExpired);
				return;
			}

			const existingTelegram = await this.prismaService.telegram.findUnique({
				where: { telegram_id: chatId.toString() }
			});

			if (existingTelegram) {
				await ctx.reply(TELEGRAM_MESSAGES.telegramAlreadyConnected);
				return;
			}

			await this.connectTelegram(authToken.student_id, chatId, username, firstName);

			await this.prismaService.telegramToken.delete({
				where: { id: authToken.id }
			});
		}
		if (chatId === this.configService.get<string>('ADMIN_TG_ID') as string) {
			await ctx.reply(TELEGRAM_MESSAGES.adminWelcome);
		}
	}

	private async connectTelegram(studentId: number, chatId: string, username: string, firstName: string) {
		await this.prismaService.student.update({
			where: { id: studentId },
			data: {
				telegrams: {
					create: {
						telegram_id: chatId.toString(),
						username: username,
						first_name: firstName
					}
				}
			}
		});
	}

	private async sendMessageToTelegram(studentId: number, message: string) {
		try {
			// Получаем telegram данные студента
			const student = await this.prismaService.student.findUnique({
				where: { id: studentId },
				include: {
					telegrams: true
				}
			});

			if (!student || !student.telegrams || student.telegrams.length === 0) {
				console.warn(`No telegram connection found for student ${studentId}`);
				return;
			}

			// Отправляем сообщение каждому telegram аккаунту студента
			const sendPromises = student.telegrams.map(async (telegram) => {
				try {
					await this.telegram.sendMessage(telegram.telegram_id, message);
				} catch (error) {
					console.error(`Failed to send message to telegram ${telegram.telegram_id}:`, error);
				}
			});

			await Promise.all(sendPromises);
		} catch (error) {
			console.error(`Error sending notification to student ${studentId}:`, error);
			throw error;
		}
	}

	@Cron(CronExpression.EVERY_DAY_AT_9AM)
	async send() {
		const allStudents = await this.prismaService.student.findMany();

		const today = new Date();
		const todayMonth = today.getMonth() + 1; // месяцы от 0
		const todayDate = today.getDate();

		const studentsWithBirthday = allStudents.filter(student => {
			const birthDate = new Date(student.birth_date);
			return (
				birthDate.getMonth() + 1 === todayMonth &&
				birthDate.getDate() === todayDate
			);
		});

		if (studentsWithBirthday.length > 0) {
			const message = this.createBirthdayReminderMessage(studentsWithBirthday);
			await this.telegram.sendMessage(this.configService.get<string>('ADMIN_TG_ID') as string, message);
		}
	}

	private createBirthdayReminderMessage(students: any[]): string {
		const reminderEmoji = '📅';
		const cakeEmoji = '🎂';
		const bellEmoji = '🔔';
		const noteEmoji = '📝';

		if (students.length === 1) {
			const student = students[0];
			const age = this.calculateAge(student.birth_date);
			return `
${bellEmoji} BIRTHDAY REMINDER ${bellEmoji}

${reminderEmoji} ${student.name} has a birthday today!
${cakeEmoji} They are turning ${age} years old

${noteEmoji} Don't forget to wish them a happy birthday!
		`.trim();
		} else {
			const studentsList = students.map(student => {
				const age = this.calculateAge(student.birth_date);
				return `• ${student.name} (${age} years old)`;
			}).join('\n');

			return `
${bellEmoji} BIRTHDAY REMINDER ${bellEmoji}

${reminderEmoji} Birthdays today:

${studentsList}

${noteEmoji} Don't forget to wish them all happy birthdays!
		`.trim();
		}
	}

	private calculateAge(birthDate: Date): number {
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();

		const hasHadBirthdayThisYear =
			today.getMonth() > birthDate.getMonth() ||
			(today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

		if (!hasHadBirthdayThisYear) {
			age--;
		}

		return age;
	}

	@Cron(CronExpression.EVERY_10_SECONDS)
	async sendNotificationAboutLesson() {
		const currentMoment = new Date();

		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date();
		endOfDay.setHours(23, 59, 59, 999);

		const allTodayLessons = await this.prismaService.lesson.findMany({
			where: {
				start_date: {
					gte: startOfDay,
					lte: endOfDay,
				},
			},
			include: {
				student: {
					include: {
						telegrams: true,
					},
				},
			},
		});

		for (const lesson of allTodayLessons) {
			const startDate = new Date(lesson.start_date);
			const diffMs = startDate.getTime() - currentMoment.getTime();
			const diffMinutes = Math.floor(diffMs / 60000);

			if (diffMinutes <= 20 && diffMinutes > 0) {
				const alreadyNotified = await this.prismaService.lessonNotification.findUnique({
					where: {
						lesson_id: lesson.id,
					},
				});

				if (!alreadyNotified) {
					console.log(`⏰ До начала занятия осталось ${diffMinutes} мин. ID занятия: ${lesson.id}. Начало в ${startDate}`);
					await this.sendMessageToTelegram(lesson.student_id, `⏰ До начала занятия осталось ${diffMinutes} мин. Начало в ${startDate}`);

					await this.prismaService.lessonNotification.create({
						data: {
							lesson_id: lesson.id,
						},
					});
				}
			}
		}
	}

}