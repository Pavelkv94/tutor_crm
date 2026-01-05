import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TelegramService } from '../../../src/modules/telegram/telegram.service';
import { CoreEnvConfig } from '../../../src/core/core.config';
import { TeacherService } from '../../../src/modules/teacher/teacher.service';
import { StudentService } from '../../../src/modules/student/student.service';
import { TelegramRepository } from '../../../src/modules/telegram/telegram.repository';
import { LessonService } from '../../../src/modules/lesson/lesson.service';
import { TelegramLinkInputDto } from '../../../src/modules/telegram/dto/telegram-link.input.dto';
import { LessonsCostFiltersDto } from '../../../src/modules/telegram/dto/lessons-cost-filter.input.dto';
import { TelegramUserEnum } from '../../../src/modules/telegram/dto/telegram-user.enum';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRole } from '@prisma/client';
import { LessonStatusEnum } from '../../../src/modules/lesson/dto/lesson-status.enum';

describe('TelegramService', () => {
	let service: TelegramService;
	let teacherService: TeacherService;
	let studentService: StudentService;
	let telegramRepository: TelegramRepository;
	let lessonService: LessonService;
	let coreEnvConfig: CoreEnvConfig;

	const mockCoreEnvConfig = {
		telegramBotToken: 'test_bot_token',
		telegramBotName: 'test_bot',
		telegramAdminId: '123456789',
	} as CoreEnvConfig;

	const mockTeacher = {
		id: 1,
		name: 'Test Teacher',
		deleted_at: null,
	};

	const mockStudent = {
		id: 1,
		name: 'Test Student',
		class: 5,
		deleted_at: null,
	};

	const mockTelegramToken = {
		id: 1,
		token: 'test-token-uuid',
		expired_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
		teacher_id: 1,
		student_id: null,
		type: TelegramUserEnum.TEACHER,
	};

	const mockTelegramUser = {
		id: 1,
		telegram_id: '123456789',
		username: 'testuser',
		first_name: 'Test',
		type: TelegramUserEnum.TEACHER,
		teacher_id: 1,
		student_id: null,
	};

	const mockTeacherPayload: JwtPayloadDto = {
		id: '1',
		login: 'testuser',
		name: 'Test Teacher',
		role: TeacherRole.TEACHER,
	};

	const mockLessons = [
		{
			id: 1,
			is_free: false,
			plan: {
				plan_price: 100,
				plan_currency: 'BYN',
			},
		},
		{
			id: 2,
			is_free: true,
			plan: {
				plan_price: 0,
				plan_currency: 'BYN',
			},
		},
		{
			id: 3,
			is_free: false,
			plan: {
				plan_price: 150,
				plan_currency: 'BYN',
			},
		},
	];

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TelegramService,
				{
					provide: CoreEnvConfig,
					useValue: mockCoreEnvConfig,
				},
				{
					provide: TeacherService,
					useValue: {
						getTeacherById: jest.fn(),
					},
				},
				{
					provide: StudentService,
					useValue: {
						findById: jest.fn(),
						findAllActiveWithBirthdays: jest.fn(),
					},
				},
				{
					provide: TelegramRepository,
					useValue: {
						createTelegramToken: jest.fn(),
						getTelegramTokenByToken: jest.fn(),
						deleteTelegramToken: jest.fn(),
						findTelegramByTelegramId: jest.fn(),
						createTelegramUser: jest.fn(),
					},
				},
				{
					provide: LessonService,
					useValue: {
						findPendingUnpaidLessonsForPeriodAndStudent: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<TelegramService>(TelegramService);
		teacherService = module.get<TeacherService>(TeacherService);
		studentService = module.get<StudentService>(StudentService);
		telegramRepository = module.get<TelegramRepository>(TelegramRepository);
		lessonService = module.get<LessonService>(LessonService);
		coreEnvConfig = module.get<CoreEnvConfig>(CoreEnvConfig);

		// Mock telegram.sendMessage
		(service as any).telegram = {
			sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
		};
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('generateTelegramLink', () => {
		it('should generate link for teacher', async () => {
			const dto: TelegramLinkInputDto = {
				teacher_id: 1,
				student_id: null,
			};

			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);
			jest.spyOn(telegramRepository, 'createTelegramToken').mockResolvedValue(mockTelegramToken as any);

			const result = await service.generateTelegramLink(dto);

			expect(result).toHaveProperty('link');
			expect(result.link).toContain('https://t.me/test_bot?start=');
			expect(result.link).toContain(mockTelegramToken.token);
			expect(teacherService.getTeacherById).toHaveBeenCalledWith(1);
			expect(telegramRepository.createTelegramToken).toHaveBeenCalled();
		});

		it('should generate link for student', async () => {
			const dto: TelegramLinkInputDto = {
				teacher_id: null,
				student_id: 1,
			};

			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(telegramRepository, 'createTelegramToken').mockResolvedValue({
				...mockTelegramToken,
				student_id: 1,
				teacher_id: null,
				type: TelegramUserEnum.STUDENT,
			} as any);

			const result = await service.generateTelegramLink(dto);

			expect(result).toHaveProperty('link');
			expect(result.link).toContain('https://t.me/test_bot?start=');
			expect(studentService.findById).toHaveBeenCalledWith(1);
			expect(telegramRepository.createTelegramToken).toHaveBeenCalled();
		});

		it('should throw BadRequestException when neither teacher_id nor student_id provided', async () => {
			const dto: TelegramLinkInputDto = {
				teacher_id: null,
				student_id: null,
			};

			await expect(service.generateTelegramLink(dto)).rejects.toThrow(BadRequestException);
			await expect(service.generateTelegramLink(dto)).rejects.toThrow('Необходимо указать teacher_id или student_id');
		});

		it('should throw NotFoundException when teacher not found', async () => {
			const dto: TelegramLinkInputDto = {
				teacher_id: 1,
				student_id: null,
			};

			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(null);

			await expect(service.generateTelegramLink(dto)).rejects.toThrow(NotFoundException);
			await expect(service.generateTelegramLink(dto)).rejects.toThrow('Преподаватель не найден');
		});

		it('should throw BadRequestException when teacher is deleted', async () => {
			const dto: TelegramLinkInputDto = {
				teacher_id: 1,
				student_id: null,
			};

			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue({
				...mockTeacher,
				deleted_at: new Date(),
			} as any);

			await expect(service.generateTelegramLink(dto)).rejects.toThrow(BadRequestException);
			await expect(service.generateTelegramLink(dto)).rejects.toThrow('Преподаватель удален');
		});

		it('should throw NotFoundException when student not found', async () => {
			const dto: TelegramLinkInputDto = {
				teacher_id: null,
				student_id: 1,
			};

			jest.spyOn(studentService, 'findById').mockResolvedValue(null as any);

			await expect(service.generateTelegramLink(dto)).rejects.toThrow(NotFoundException);
			await expect(service.generateTelegramLink(dto)).rejects.toThrow('Студент не найден');
		});

		it('should throw BadRequestException when student is deleted', async () => {
			const dto: TelegramLinkInputDto = {
				teacher_id: null,
				student_id: 1,
			};

			jest.spyOn(studentService, 'findById').mockResolvedValue({
				...mockStudent,
				deleted_at: new Date(),
			} as any);

			await expect(service.generateTelegramLink(dto)).rejects.toThrow(BadRequestException);
			await expect(service.generateTelegramLink(dto)).rejects.toThrow('Студент удален');
		});
	});

	describe('sendMessageToAdmin', () => {
		it('should send message to admin', async () => {
			const message = 'Test message';
			jest.spyOn(telegramRepository, 'findTelegramByTelegramId').mockResolvedValue(mockTelegramUser as any);

			await service.sendMessageToAdmin(message);

			expect(telegramRepository.findTelegramByTelegramId).toHaveBeenCalledWith('123456789');
			expect((service as any).telegram.sendMessage).toHaveBeenCalledWith(mockTelegramUser.telegram_id, message);
		});

		it('should throw NotFoundException when admin not found', async () => {
			const message = 'Test message';
			jest.spyOn(telegramRepository, 'findTelegramByTelegramId').mockResolvedValue(null);

			await expect(service.sendMessageToAdmin(message)).rejects.toThrow(NotFoundException);
			await expect(service.sendMessageToAdmin(message)).rejects.toThrow('Администратор не найден');
		});
	});

	describe('sendMessageToUser', () => {
		it('should send message to user', async () => {
			const telegramId = '987654321';
			const message = 'Test message';
			jest.spyOn(telegramRepository, 'findTelegramByTelegramId').mockResolvedValue(mockTelegramUser as any);

			await service.sendMessageToUser(telegramId, message);

			expect(telegramRepository.findTelegramByTelegramId).toHaveBeenCalledWith(telegramId);
			expect((service as any).telegram.sendMessage).toHaveBeenCalledWith(mockTelegramUser.telegram_id, message);
		});

		it('should not throw when user not found', async () => {
			const telegramId = '987654321';
			const message = 'Test message';
			jest.spyOn(telegramRepository, 'findTelegramByTelegramId').mockResolvedValue(null);

			await expect(service.sendMessageToUser(telegramId, message)).resolves.not.toThrow();
			expect((service as any).telegram.sendMessage).not.toHaveBeenCalled();
		});
	});

	describe('sendLessonsCostToAdmin', () => {
		it('should send lessons cost report to admin', async () => {
			const dto: LessonsCostFiltersDto = {
				student_id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
			};

			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonService, 'findPendingUnpaidLessonsForPeriodAndStudent').mockResolvedValue(mockLessons as any);
			jest.spyOn(telegramRepository, 'findTelegramByTelegramId').mockResolvedValue(mockTelegramUser as any);

			await service.sendLessonsCostToAdmin(dto, mockTeacherPayload);

			expect(studentService.findById).toHaveBeenCalledWith(1);
			expect(lessonService.findPendingUnpaidLessonsForPeriodAndStudent).toHaveBeenCalledWith(
				1,
				dto.start_date,
				dto.end_date,
				mockTeacherPayload
			);
			expect((service as any).telegram.sendMessage).toHaveBeenCalled();
		});

		it('should throw NotFoundException when student not found', async () => {
			const dto: LessonsCostFiltersDto = {
				student_id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
			};

			jest.spyOn(studentService, 'findById').mockResolvedValue(null as any);

			await expect(service.sendLessonsCostToAdmin(dto, mockTeacherPayload)).rejects.toThrow(NotFoundException);
			await expect(service.sendLessonsCostToAdmin(dto, mockTeacherPayload)).rejects.toThrow('Студент не найден');
		});

		it('should throw BadRequestException when no pending unpaid lessons', async () => {
			const dto: LessonsCostFiltersDto = {
				student_id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
			};

			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonService, 'findPendingUnpaidLessonsForPeriodAndStudent').mockResolvedValue([]);

			await expect(service.sendLessonsCostToAdmin(dto, mockTeacherPayload)).rejects.toThrow(BadRequestException);
			await expect(service.sendLessonsCostToAdmin(dto, mockTeacherPayload)).rejects.toThrow('По заданному периоду нет ожидающих оплату уроков');
		});
	});

	describe('formatDateToRussian', () => {
		it('should format date correctly', () => {
			const dateString = '2024-01-15';
			const result = (service as any).formatDateToRussian(dateString);

			expect(result).toBe('15 января 2024');
		});
	});

	describe('calculateAge', () => {
		it('should calculate age correctly', () => {
			const birthDate = new Date('2010-01-15');
			const result = (service as any).calculateAge(birthDate);

			// Age calculation depends on current date, so we just check it's a number
			expect(typeof result).toBe('number');
			expect(result).toBeGreaterThan(0);
		});
	});

	describe('onStart', () => {
		it('should send welcome message for unauthorized user without token', async () => {
			const ctx = {
				message: {
					from: {
						username: 'testuser',
						first_name: 'Test',
					},
					chat: {
						id: 999999999,
					},
					text: '/start',
				},
				replyWithHTML: jest.fn(),
				reply: jest.fn(),
			};

			jest.spyOn(telegramRepository, 'getTelegramTokenByToken').mockResolvedValue(null);

			await service.onStart(ctx);

			expect(ctx.replyWithHTML).toHaveBeenCalled();
		});

		it('should handle valid token and create telegram user', async () => {
			const ctx = {
				message: {
					from: {
						username: 'testuser',
						first_name: 'Test',
					},
					chat: {
						id: 123456789,
					},
					text: '/start test-token-uuid',
				},
				replyWithHTML: jest.fn(),
				reply: jest.fn(),
			};

			jest.spyOn(telegramRepository, 'getTelegramTokenByToken').mockResolvedValue(mockTelegramToken as any);
			jest.spyOn(telegramRepository, 'findTelegramByTelegramId').mockResolvedValue(null);
			jest.spyOn(telegramRepository, 'createTelegramUser').mockResolvedValue(mockTelegramUser as any);
			jest.spyOn(telegramRepository, 'deleteTelegramToken').mockResolvedValue(undefined);

			await service.onStart(ctx);

			expect(telegramRepository.getTelegramTokenByToken).toHaveBeenCalledWith('test-token-uuid');
			expect(telegramRepository.findTelegramByTelegramId).toHaveBeenCalled();
			expect(telegramRepository.createTelegramUser).toHaveBeenCalled();
			expect(telegramRepository.deleteTelegramToken).toHaveBeenCalled();
			expect(ctx.reply).toHaveBeenCalled();
		});

		it('should handle expired token', async () => {
			const ctx = {
				message: {
					from: {
						username: 'testuser',
						first_name: 'Test',
					},
					chat: {
						id: 123456789,
					},
					text: '/start expired-token',
				},
				replyWithHTML: jest.fn(),
				reply: jest.fn(),
			};

			const expiredToken = {
				...mockTelegramToken,
				expired_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
			};

			jest.spyOn(telegramRepository, 'getTelegramTokenByToken').mockResolvedValue(expiredToken as any);

			await service.onStart(ctx);

			expect(ctx.reply).toHaveBeenCalled();
		});

		it('should handle invalid token', async () => {
			const ctx = {
				message: {
					from: {
						username: 'testuser',
						first_name: 'Test',
					},
					chat: {
						id: 123456789,
					},
					text: '/start invalid-token',
				},
				replyWithHTML: jest.fn(),
				reply: jest.fn(),
			};

			jest.spyOn(telegramRepository, 'getTelegramTokenByToken').mockResolvedValue(null);

			await service.onStart(ctx);

			expect(ctx.reply).toHaveBeenCalled();
		});

		it('should handle already connected telegram user', async () => {
			const ctx = {
				message: {
					from: {
						username: 'testuser',
						first_name: 'Test',
					},
					chat: {
						id: 123456789,
					},
					text: '/start test-token-uuid',
				},
				replyWithHTML: jest.fn(),
				reply: jest.fn(),
			};

			jest.spyOn(telegramRepository, 'getTelegramTokenByToken').mockResolvedValue(mockTelegramToken as any);
			jest.spyOn(telegramRepository, 'findTelegramByTelegramId').mockResolvedValue(mockTelegramUser as any);

			await service.onStart(ctx);

			expect(ctx.reply).toHaveBeenCalled();
			expect(telegramRepository.createTelegramUser).not.toHaveBeenCalled();
		});
	});

	describe('birthdayRemind', () => {
		it('should send birthday reminders for students with birthdays today', async () => {
			const today = new Date();
			const studentsWithBirthday = [
				{
					id: 1,
					name: 'Student 1',
					birth_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
					teacher: {
						telegrams: [
							{
								telegram_id: '123456789',
							},
						],
					},
				},
			];

			jest.spyOn(studentService, 'findAllActiveWithBirthdays').mockResolvedValue(studentsWithBirthday as any);
			jest.spyOn(telegramRepository, 'findTelegramByTelegramId').mockResolvedValue(mockTelegramUser as any);

			await service.birthdayRemind();

			expect(studentService.findAllActiveWithBirthdays).toHaveBeenCalled();
			expect(telegramRepository.findTelegramByTelegramId).toHaveBeenCalledWith('123456789');
			expect((service as any).telegram.sendMessage).toHaveBeenCalled();
		});

		it('should not send reminders when no students have birthdays today', async () => {
			const today = new Date();
			const studentsWithoutBirthday = [
				{
					id: 1,
					name: 'Student 1',
					birth_date: new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()), // Different month
					teacher: {
						telegrams: [
							{
								telegram_id: '123456789',
							},
						],
					},
				},
			];

			jest.spyOn(studentService, 'findAllActiveWithBirthdays').mockResolvedValue(studentsWithoutBirthday as any);

			await service.birthdayRemind();

			expect(studentService.findAllActiveWithBirthdays).toHaveBeenCalled();
			expect((service as any).telegram.sendMessage).not.toHaveBeenCalled();
		});
	});
});

