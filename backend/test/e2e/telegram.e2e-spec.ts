import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { createTestApp, generateTestAdminToken, generateTestAccessToken, getCoreEnvConfig, getJwtService, closeTestApp } from '../helpers/test-utils';
import { TeacherRole, PlanType, PlanCurrency } from '@prisma/client';
import { BcryptService } from '../../src/modules/auth/bcrypt.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TelegramService } from '../../src/modules/telegram/telegram.service';
import { TelegramUserEnum } from '../../src/modules/telegram/dto/telegram-user.enum';
import { LessonStatusEnum } from '../../src/modules/lesson/dto/lesson-status.enum';

describe('TelegramController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let bcryptService: BcryptService;
	let module: TestingModule;
	let telegramService: TelegramService;

	const testAdmin = {
		login: 'test_admin_telegram_e2e',
		password: 'testPassword123',
		name: 'Test Admin Telegram E2E',
		telegram_id: '123456789',
	};

	const testTeacher = {
		login: 'test_teacher_telegram_e2e',
		password: 'testPassword123',
		name: 'Test Teacher Telegram E2E',
		telegram_id: '987654321',
	};

	const testStudent = {
		name: 'Test Student Telegram',
		class: 5,
		birth_date: new Date('2010-01-15'),
	};

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideGuard(ThrottlerGuard)
			.useValue({
				canActivate: () => true,
			})
			.compile();

		app = await createTestApp();
		prisma = module.get<PrismaService>(PrismaService);
		bcryptService = module.get<BcryptService>(BcryptService);
		telegramService = module.get<TelegramService>(TelegramService);

		// Mock telegram.sendMessage to avoid actual Telegram API calls
		(telegramService as any).telegram = {
			sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
		};

		await app.init();
	});

	afterAll(async () => {
		// Clean up test data
		if (prisma) {
			await prisma.telegramToken.deleteMany({
				where: {
					token: {
						contains: 'test-token',
					},
				},
			});
			await prisma.telegram.deleteMany({
				where: {
					telegram_id: {
						in: ['123456789', '987654321'],
					},
				},
			});
			await prisma.student.deleteMany({
				where: {
					name: testStudent.name,
				},
			});
			await prisma.teacher.deleteMany({
				where: {
					login: {
						in: [testAdmin.login, testTeacher.login],
					},
				},
			});
		}
		if (app) {
			await closeTestApp(app);
		}
	});

	beforeEach(async () => {
		// Clean up before each test
		if (prisma) {
			await prisma.telegramToken.deleteMany({
				where: {
					token: {
						contains: 'test-token',
					},
				},
			});
			await prisma.telegram.deleteMany({
				where: {
					telegram_id: {
						in: ['123456789', '987654321'],
					},
				},
			});
			await prisma.student.deleteMany({
				where: {
					name: testStudent.name,
				},
			});
			await prisma.teacher.deleteMany({
				where: {
					login: {
						in: [testAdmin.login, testTeacher.login],
					},
				},
			});
		}
	});

	describe('POST /telegram/generate-telegram-link', () => {
		it('should generate telegram link for teacher with admin JWT', async () => {
			// Create teacher first
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			// Create admin user
			const passwordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: passwordHash,
					role: TeacherRole.ADMIN,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const adminToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: admin.id.toString(),
				login: admin.login,
				name: admin.name,
				role: admin.role,
			});

			const response = await request(app.getHttpServer())
				.post('/telegram/generate-telegram-link')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					teacher_id: teacher.id,
					student_id: null,
				})
				.expect(200);

			expect(response.body).toHaveProperty('link');
			expect(response.body.link).toContain('https://t.me/');
			expect(response.body.link).toContain('?start=');

			// Verify token was created in database
			const token = await prisma.telegramToken.findFirst({
				where: {
					teacher_id: teacher.id,
				},
			});
			expect(token).toBeDefined();
			expect(token?.type).toBe(TelegramUserEnum.TEACHER);
		});

		it('should generate telegram link for student with admin JWT', async () => {
			// Create teacher first
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			// Create student
			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			// Create admin user
			const passwordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: passwordHash,
					role: TeacherRole.ADMIN,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const adminToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: admin.id.toString(),
				login: admin.login,
				name: admin.name,
				role: admin.role,
			});

			const response = await request(app.getHttpServer())
				.post('/telegram/generate-telegram-link')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					teacher_id: null,
					student_id: student.id,
				})
				.expect(200);

			expect(response.body).toHaveProperty('link');
			expect(response.body.link).toContain('https://t.me/');
			expect(response.body.link).toContain('?start=');

			// Verify token was created in database
			const token = await prisma.telegramToken.findFirst({
				where: {
					student_id: student.id,
				},
			});
			expect(token).toBeDefined();
			expect(token?.type).toBe(TelegramUserEnum.STUDENT);
		});

		it('should return 400 when neither teacher_id nor student_id provided', async () => {
			// Create admin user
			const passwordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: passwordHash,
					role: TeacherRole.ADMIN,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const adminToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: admin.id.toString(),
				login: admin.login,
				name: admin.name,
				role: admin.role,
			});

			await request(app.getHttpServer())
				.post('/telegram/generate-telegram-link')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					teacher_id: null,
					student_id: null,
				})
				.expect(400);
		});

		it('should return 404 when teacher not found', async () => {
			// Create admin user
			const passwordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: passwordHash,
					role: TeacherRole.ADMIN,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const adminToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: admin.id.toString(),
				login: admin.login,
				name: admin.name,
				role: admin.role,
			});

			await request(app.getHttpServer())
				.post('/telegram/generate-telegram-link')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					teacher_id: 99999,
					student_id: null,
				})
				.expect(404);
		});

		it('should return 404 when student not found', async () => {
			// Create admin user
			const passwordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: passwordHash,
					role: TeacherRole.ADMIN,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const adminToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: admin.id.toString(),
				login: admin.login,
				name: admin.name,
				role: admin.role,
			});

			await request(app.getHttpServer())
				.post('/telegram/generate-telegram-link')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					teacher_id: null,
					student_id: 99999,
				})
				.expect(404);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.post('/telegram/generate-telegram-link')
				.send({
					teacher_id: 1,
					student_id: null,
				})
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			// Create teacher user
			const passwordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: passwordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const teacherToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: teacher.id.toString(),
				login: teacher.login,
				name: teacher.name,
				role: teacher.role,
			});

			await request(app.getHttpServer())
				.post('/telegram/generate-telegram-link')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					teacher_id: teacher.id,
					student_id: null,
				})
				.expect(401);
		});
	});

	describe('POST /telegram/send-lessons-cost-to-admin', () => {
		it('should send lessons cost to admin with teacher JWT', async () => {
			// Create teacher first
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			// Create student
			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			// Create plan
			const plan = await prisma.plan.create({
				data: {
					plan_name: 'Test Plan',
					plan_price: 100,
					plan_currency: PlanCurrency.BYN,
					plan_type: PlanType.INDIVIDUAL,
					duration: 60,
				},
			});

			// Create lessons
			const lesson1 = await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: new Date('2024-01-15'),
					status: LessonStatusEnum.PENDING_UNPAID,
					is_trial: false,
					is_free: false,
				},
			});

			const lesson2 = await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: new Date('2024-01-20'),
					status: LessonStatusEnum.PENDING_UNPAID,
					is_trial: false,
					is_free: true,
				},
			});

			// Create admin telegram user
			const adminPasswordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: adminPasswordHash,
					role: TeacherRole.ADMIN,
				},
			});

			await prisma.telegram.create({
				data: {
					telegram_id: '123456789',
					username: 'admin',
					first_name: 'Admin',
					type: TelegramUserEnum.TEACHER,
					teacher_id: admin.id,
					student_id: null,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const teacherToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: teacher.id.toString(),
				login: teacher.login,
				name: teacher.name,
				role: teacher.role,
			});

			await request(app.getHttpServer())
				.post('/telegram/send-lessons-cost-to-admin')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					student_id: student.id,
					start_date: '2024-01-01',
					end_date: '2024-01-31',
				})
				.expect(204);

			// Verify message was sent (mocked)
			expect((telegramService as any).telegram.sendMessage).toHaveBeenCalled();
		});

		it('should return 404 when student not found', async () => {
			// Create teacher user
			const passwordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: passwordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const teacherToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: teacher.id.toString(),
				login: teacher.login,
				name: teacher.name,
				role: teacher.role,
			});

			await request(app.getHttpServer())
				.post('/telegram/send-lessons-cost-to-admin')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					student_id: 99999,
					start_date: '2024-01-01',
					end_date: '2024-01-31',
				})
				.expect(404);
		});

		it('should return 400 when no pending unpaid lessons', async () => {
			// Create teacher first
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			// Create student
			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const teacherToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: teacher.id.toString(),
				login: teacher.login,
				name: teacher.name,
				role: teacher.role,
			});

			await request(app.getHttpServer())
				.post('/telegram/send-lessons-cost-to-admin')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					student_id: student.id,
					start_date: '2024-01-01',
					end_date: '2024-01-31',
				})
				.expect(400);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.post('/telegram/send-lessons-cost-to-admin')
				.send({
					student_id: 1,
					start_date: '2024-01-01',
					end_date: '2024-01-31',
				})
				.expect(401);
		});

		it('should return validation errors for invalid data', async () => {
			// Create teacher user
			const passwordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: passwordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const teacherToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: teacher.id.toString(),
				login: teacher.login,
				name: teacher.name,
				role: teacher.role,
			});

			await request(app.getHttpServer())
				.post('/telegram/send-lessons-cost-to-admin')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					student_id: 'invalid',
					start_date: '',
					end_date: '',
				})
				.expect(400);
		});
	});
});

