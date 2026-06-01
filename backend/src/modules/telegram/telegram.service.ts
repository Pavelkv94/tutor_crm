import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Ctx, Start, Update } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { TELEGRAM_MESSAGES } from './telegram.messages';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TelegramLinkInputDto } from './dto/telegram-link.input.dto';
import { TeacherService } from '../teacher/teacher.service';
import { TelegramUserEnum } from './dto/telegram-user.enum';
import { randomUUID } from 'crypto';
import { StudentService } from '../student/student.service';
import { TelegramRepository } from './telegram.repository';
import { CoreEnvConfig } from 'src/core/core.config';
import { TelegramLinkOutputDto } from './dto/telegram-link.output.dto';
import { TokenDataInputDto } from './dto/token-data.input.dto';
import { TelegramInputDto } from './dto/telegram.input.dto';
import { LessonsCostFiltersDto } from './dto/lessons-cost-filter.input.dto';
import { LessonService } from '../lesson/lesson.service';
import { JwtPayloadDto } from '../auth/dto/jwt.payload.dto';
import { LessonStatusEnum } from '../lesson/dto/lesson-status.enum';
import { LessonOutputDto } from '../lesson/dto/lesson.output.dto';
import { calculateAgeFromBirthDate } from 'src/core/utils/calculate-age.util';

@Update()
@Injectable()
export class TelegramService extends Telegraf {
	private _token: string;

	constructor(
		private readonly configService: CoreEnvConfig,
		private readonly teacherService: TeacherService,
		private readonly studentService: StudentService,
		private readonly telegramRepository: TelegramRepository,
		private readonly lessonService: LessonService
	) {
		super(configService.telegramBotToken);
		this._token = configService.telegramBotToken;
	}

	@Start()
	async onStart(@Ctx() ctx: any) {
		const username = ctx.message?.from?.username;
		const firstName = ctx.message?.from?.first_name;
		const token = ctx.message?.text?.split(' ')[1];
		const chatId = ctx.message?.chat?.id;
		if (!token && chatId !== +this.configService.telegramAdminId) {
			await ctx.replyWithHTML(TELEGRAM_MESSAGES.welcomeUnauthorized);
			return;
		}
		if (token) {
			const tokenData = await this.telegramRepository.getTelegramTokenByToken(token);
			if (!tokenData) {
				await ctx.reply(TELEGRAM_MESSAGES.invalidToken);
				return;
			}
			const now = new Date();
			if (tokenData && tokenData.expired_at < now) {
				await ctx.reply(TELEGRAM_MESSAGES.tokenExpired);
				return;
			}


			const existingTelegram = await this.telegramRepository.findTelegramByTelegramId(chatId.toString());
			if (existingTelegram) {
				await ctx.reply(TELEGRAM_MESSAGES.telegramAlreadyConnected);
				return;
			} else {
				await ctx.reply(TELEGRAM_MESSAGES.welcomeAuthorized);
			}

			const telegramData: TelegramInputDto = {
				telegram_id: chatId.toString(),
				username: username,
				first_name: firstName,
				type: tokenData.type as TelegramUserEnum,
				student_id: tokenData.student_id,
				teacher_id: tokenData.teacher_id,
			}

			await this.telegramRepository.createTelegramUser(telegramData);

			await this.telegramRepository.deleteTelegramToken(tokenData.id);
		}

	}

	async sendMessageToAdmin(message: string) {
		const admin = await this.telegramRepository.findTelegramByTelegramId(this.configService.telegramAdminId.toString());
		if (!admin) {
			throw new NotFoundException("Администратор не найден");
		}
		await this.telegram.sendMessage(admin.telegram_id, message, { parse_mode: 'HTML' });
	}

	async sendMessageToUser(userTelegramId: string, message: string) {
		const user = await this.telegramRepository.findTelegramByTelegramId(userTelegramId);
		if (!user) {
			console.error(`User not found: ${userTelegramId}`);
			return;
		}
		await this.telegram.sendMessage(user.telegram_id, message);
	}

	async generateTelegramLink(telegramLinkInputDto: TelegramLinkInputDto): Promise<TelegramLinkOutputDto> {
		if (!telegramLinkInputDto.teacher_id && !telegramLinkInputDto.student_id) {
			throw new BadRequestException("Необходимо указать teacher_id или student_id");
		}
		if (telegramLinkInputDto.teacher_id) {
			const teacher = await this.teacherService.getTeacherById(telegramLinkInputDto.teacher_id);
			if (!teacher) {
				throw new NotFoundException("Преподаватель не найден");
			}
			if (teacher.deleted_at) {
				throw new BadRequestException("Преподаватель удален");
			}
		} else if (telegramLinkInputDto.student_id) {
			const student = await this.studentService.findById(telegramLinkInputDto.student_id);
			if (!student) {
				throw new NotFoundException("Студент не найден");
			}
			if (student.deleted_at) {
				throw new BadRequestException("Студент удален");
			}
		}

		const uuid = randomUUID()
		const expiredAt = new Date(Date.now() + 1000 * 60 * 24); // 24 часа

		const telegramTokenData: TokenDataInputDto = {
			token: uuid as string,
			expired_at: expiredAt,
			teacher_id: telegramLinkInputDto.teacher_id || null,
			student_id: telegramLinkInputDto.student_id || null,
			type: telegramLinkInputDto.teacher_id ? TelegramUserEnum.TEACHER : TelegramUserEnum.STUDENT,
		}

		const telegramToken = await this.telegramRepository.createTelegramToken(telegramTokenData);



		return { link: `https://t.me/${this.configService.telegramBotName}?start=${telegramToken.token}` };
	}

	private formatDateToRussian(dateString: string): string {
		const date = new Date(dateString);
		const day = date.getDate();
		const months = [
			'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
			'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
		];
		const month = months[date.getMonth()];
		const year = date.getFullYear();
		return `${day} ${month} ${year}`;
	}

	async sendLessonsCostToAdmin(dto: LessonsCostFiltersDto, teacher: JwtPayloadDto): Promise<void> {
		const { student_id, start_date, end_date } = dto;

		const student = await this.studentService.findById(student_id);
		if (!student) {
			throw new NotFoundException("Студент не найден");
		}

		const pendingUnpaidLessons = await this.lessonService.findPendingUnpaidLessonsForPeriodAndStudent(student_id, start_date, end_date, teacher);

		if (pendingUnpaidLessons.length === 0) {
			throw new BadRequestException("По заданному периоду нет ожидающих оплату уроков");
		}
		const report = {
			requested_month: new Date(start_date).getMonth() + 1,
			student_name: student.name,
			student_class: student.class,
			pending_lessons_count: pendingUnpaidLessons.length,
			pending_free_lessons_count: pendingUnpaidLessons.filter(lesson => lesson.is_free).length,
			pending_unpaid_lessons_count: pendingUnpaidLessons.filter(lesson => !lesson.is_free).length,
			pending_unpaid_lessons_cost: pendingUnpaidLessons.reduce((acc, lesson) => acc + lesson.plan.plan_price, 0),
			plan_currency: pendingUnpaidLessons[0].plan.plan_currency,
		}

		const currencySymbol = report.plan_currency === "USD" ? "$" : report.plan_currency === "EUR" ? "€" : report.plan_currency === "PLN" ? "zł" : "р";
		const lessonsMessageList = pendingUnpaidLessons.map((lesson: LessonOutputDto) => {
			return `${lesson.date.toLocaleDateString('ru-RU', { day: '2-digit', timeZone: 'Europe/Minsk' })} ${lesson.date.toLocaleDateString('ru-RU', { month: 'long', timeZone: 'Europe/Minsk' })} (${lesson.date.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'Europe/Minsk' })}) ${lesson.date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Minsk' })} ${lesson.is_free ? "(бесплатно)" : ""}`;
		});

		const groupedLessonsByPlan = pendingUnpaidLessons.reduce((acc, lesson) => { const key = lesson.plan.id; if (!acc[key]) acc[key] = []; acc[key].push(lesson); return acc; }, {});

		const lessonsResultMessage = Object.values(groupedLessonsByPlan)
			.filter((lessons: LessonOutputDto[]) => lessons.length > 0)
			.map((lessons: LessonOutputDto[]) => {
				const plan = lessons[0].plan;
				return `🔸${lessons.length} урок(ов) ${(plan?.plan_type === "INDIVIDUAL" ? "индивидуально" : "в паре")} × ${plan?.plan_price}${currencySymbol} = ${lessons.length * (plan?.plan_price ?? 0)}${currencySymbol}`;
			});

		const monthsOnRus = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРАТ", "ДЕКАБРЬ"];
		const currentMonth = monthsOnRus[report.requested_month - 1];
		const message = `
📅 РАСПИСАНИЕ НА ${currentMonth} (${report.student_name.split(' ')[0]} ${student.class}кл)

<i>⏰ Время указано по МСК (UTC+3)</i>

${lessonsMessageList.join('\n')}

${lessonsResultMessage.join('\n')}
📌 Итого: ${pendingUnpaidLessons.reduce((acc, lesson) => acc + lesson.plan.plan_price, 0)}${currencySymbol}

💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) 😊
🔗 ССЫЛКА НА ОПЛАТУ:
				
`

		//  ${lessons.join('\n')}

		//  ${lessonsResultMessage.join('\n')}
		// 📌 Итого: ${report.lessons.reduce((acc, lesson) => acc + lesson.plan.plan_price, 0)}р

		// 💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) и  отправить чек для подтверждения 😊
		//  		`

		// // 		const message = `
		// 📅 Период: ${formattedStartDate} - ${formattedEndDate}
		// 👤 Ученик: ${student.name} ${student.class}кл
		// 📚 Количество всех уроков: ${report.pending_lessons_count}
		// 🎁 Из них количество бесплатных уроков: ${report.pending_free_lessons_count}
		// 💳 Количество ожидающих оплату уроков: ${report.pending_unpaid_lessons_count}
		// 💰 Стоимость ожидающих оплату уроков: ${report.pending_unpaid_lessons_cost} ${report.plan_currency}.
		// 		`
		await this.sendMessageToAdmin(message);

	}

	@Cron(CronExpression.EVERY_DAY_AT_6AM)
	async birthdayRemind() {
		const allStudents = await this.studentService.findAllActiveWithBirthdays();
		const today = new Date();
		const todayMonth = today.getMonth() + 1; // месяцы от 0
		const todayDate = today.getDate();

		const studentsWithBirthday = allStudents.filter(student => {
			const birthDate = new Date(student.birth_date as Date);
			return (
				birthDate.getMonth() + 1 === todayMonth &&
				birthDate.getDate() === todayDate
			);
		});

		if (studentsWithBirthday.length > 0) {
			for (const student of studentsWithBirthday) {
				const message = this.createBirthdayReminderMessage(student);
				await this.sendMessageToUser(student.teacher.telegrams[0].telegram_id, message);
			}
		}
	}

	private createBirthdayReminderMessage(student: any): string {
		const reminderEmoji = '📅';
		const cakeEmoji = '🎂';
		const bellEmoji = '🔔';
		const noteEmoji = '📝';

		const age = calculateAgeFromBirthDate(student.birth_date) ?? '?';

		return `
		${bellEmoji} НАПОМИНАНИЕ О ДНЕ РОЖДЕНИЯ ${bellEmoji}
		
		${reminderEmoji} У ${student.name} сегодня день рождения!
		${cakeEmoji} Исполняется ${age}!
		
		${noteEmoji} Не забудьте поздравить с Днем рождения!
			`.trim();
	}

	// 	async sendReport(sendReportDto: SendReportDto) {
	// 		const { studentId, start_date, end_date } = sendReportDto;

	// 		const report = await this.buildReportMessage(studentId, start_date, end_date);

	// 		const monthsOnRus = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];
	// 		const currentMonth = monthsOnRus[new Date().getMonth()];

	// 		const lessons = report.lessons.map((lesson: any) => {
	// 			return `${lesson.corrected_time.toLocaleDateString('ru-RU', { day: '2-digit', timeZone: 'Europe/Minsk' })} ${lesson.corrected_time.toLocaleDateString('ru-RU', { month: 'long', timeZone: 'Europe/Minsk' })} (${lesson.corrected_time.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'Europe/Minsk' })}) ${lesson.corrected_time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Minsk' })}`;
	// 		});

	// 		const plans = await this.prisma.plan.findMany();

	// 		const groupedLessonsByPlan = plans.map(plan => {
	// 			return report.lessons.filter((lesson: any) => lesson.plan_id === plan.id);
	// 		}); // [[], [], []]

	// 		const lessonsResultMessage = groupedLessonsByPlan
	// 			.filter(lessons => lessons.length > 0)
	// 			.map(lessons => {
	// 				const plan = plans.find(plan => plan.id === lessons[0].plan_id);
	// 				return `🔸${lessons.length} урок(ов) ${(plan?.plan_type === "INDIVIDUAL" ? "индивидуально" : "в паре")} × ${plan?.plan_price}р = ${lessons.length * (plan?.plan_price ?? 0)}р`;
	// 			});

	// 		const message = `
	// 		📅 РАСПИСАНИЕ НА ${currentMonth} (${report.student_name.split(' ')[0]})

	// ${lessons.join('\n')}

	// ${lessonsResultMessage.join('\n')}
	// 📌 Итого: ${report.lessons.reduce((acc, lesson) => acc + lesson.plan.plan_price, 0)}р

	// 💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) и  отправить чек для подтверждения 😊
	// 		`
	// 		await this.telegramService.sendMessageToAdmin(message);

	// 		return report;
	// 	}
	//!
	// @Cron(CronExpression.EVERY_10_SECONDS)
	// async sendNotificationAboutLesson() {
	// 	const currentMoment = new Date();

	// 	const startOfDay = new Date();
	// 	startOfDay.setHours(0, 0, 0, 0);

	// 	const endOfDay = new Date();
	// 	endOfDay.setHours(23, 59, 59, 999);

	// 	const allTodayLessons = await this.prismaService.lesson.findMany({
	// 		where: {
	// 			start_date: {
	// 				gte: startOfDay,
	// 				lte: endOfDay,
	// 			},
	// 		},
	// 		include: {
	// 			student: {
	// 				include: {
	// 					telegrams: true,
	// 				},
	// 			},
	// 		},
	// 	});

	// 	for (const lesson of allTodayLessons) {
	// 		const startDate = new Date(lesson.start_date);
	// 		const diffMs = startDate.getTime() - currentMoment.getTime();
	// 		const diffMinutes = Math.floor(diffMs / 60000);

	// 		if (diffMinutes <= 20 && diffMinutes > 0) {
	// 			const alreadyNotified = await this.prismaService.lessonNotification.findUnique({
	// 				where: {
	// 					lesson_id: lesson.id,
	// 				},
	// 			});

	// 			if (!alreadyNotified) {// занятие начинается в 14:00
	// 				console.log(`⏰ До начала занятия осталось ${diffMinutes} мин. ID занятия: ${lesson.id}. Начало в ${startDate}`);
	// 				await this.sendMessageToTelegram(lesson.student_id, `⏰ До начала занятия осталось ${diffMinutes} мин. Начало в ${startDate}`);

	// 				await this.prismaService.lessonNotification.create({
	// 					data: {
	// 						lesson_id: lesson.id,
	// 					},
	// 				});
	// 			}
	// 		}
	// 	}
	// }

}