import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { createTestApp, generateTestAdminToken, generateTestAccessToken, getCoreEnvConfig, getJwtService } from '../helpers/test-utils';
import { TeacherRole, PlanType, PlanCurrency } from '@prisma/client';
import { BcryptService } from '../../src/modules/auth/bcrypt.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CancelationStatusEnum } from '../../src/modules/lesson/dto/cancel-lesson.dto';
import { WeekDay } from '../../src/modules/lesson/dto/regular-lesson.input.dto';

describe('LessonController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let bcryptService: BcryptService;
	let module: TestingModule;

	const testAdmin = {
		login: 'test_admin_lesson_e2e',
		password: 'testPassword123',
		name: 'Test Admin Lesson E2E',
		telegram_id: '123456789',
	};

	const testTeacher = {
		login: 'test_teacher_lesson_e2e',
		password: 'testPassword123',
		name: 'Test Teacher Lesson E2E',
		telegram_id: '987654321',
	};

	const testTeacher2 = {
		login: 'test_teacher2_lesson_e2e',
		password: 'testPassword123',
		name: 'Test Teacher 2 Lesson E2E',
		telegram_id: '111222333',
	};

	const testStudent = {
		name: 'Test Student Lesson',
		class: 5,
		birth_date: new Date('2010-01-15'),
	};

	const testPlan = {
		plan_type: PlanType.INDIVIDUAL,
		plan_currency: PlanCurrency.USD,
		plan_price: 100000,
		duration: 10,
		plan_name: 'Test Plan Lesson 10 minutes',
	};

	const testPlanPair = {
		plan_type: PlanType.PAIR,
		plan_currency: PlanCurrency.USD,
		plan_price: 150000,
		duration: 20,
		plan_name: 'Test Plan Pair Lesson 20 minutes',
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

		await app.init();
	});

	afterAll(async () => {
		// Clean up test data
		if (prisma) {
			// Delete lessons
			await prisma.lesson.deleteMany({
				where: {
					student: {
						name: testStudent.name,
					},
				},
			});
			await prisma.regularLesson.deleteMany({
				where: {
					student: {
						name: testStudent.name,
					},
				},
			});
			// Delete students
			await prisma.student.deleteMany({
				where: {
					name: testStudent.name,
				},
			});
			// Delete plans
			await prisma.plan.deleteMany({
				where: {
					plan_name: {
						in: [testPlan.plan_name, testPlanPair.plan_name],
					},
				},
			});
			// Delete teachers
			await prisma.teacher.deleteMany({
				where: {
					login: {
						in: [testAdmin.login, testTeacher.login, testTeacher2.login],
					},
				},
			});
		}
		if (app) {
			await app.close();
		}
	});

	beforeEach(async () => {
		// Clean up before each test
		if (prisma) {
			await prisma.lesson.deleteMany({
				where: {
					student: {
						name: testStudent.name,
					},
				},
			});
			await prisma.regularLesson.deleteMany({
				where: {
					student: {
						name: testStudent.name,
					},
				},
			});
			await prisma.student.deleteMany({
				where: {
					name: testStudent.name,
				},
			});
			await prisma.plan.deleteMany({
				where: {
					plan_name: {
						in: [testPlan.plan_name, testPlanPair.plan_name],
					},
				},
			});
			await prisma.teacher.deleteMany({
				where: {
					login: {
						in: [testAdmin.login, testTeacher.login, testTeacher2.login],
					},
				},
			});
		}
	});

	describe('POST /lessons/single', () => {
		it('should succeed creating single lesson with admin JWT', async () => {
			// Create teacher
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
				data: testPlan,
			});

			// Create admin
			const adminPasswordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: adminPasswordHash,
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

			const startDate = new Date();
			startDate.setHours(startDate.getHours() + 1); // 1 hour from now

			const response = await request(app.getHttpServer())
				.post('/lessons/single')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					plan_id: plan.id,
					student_id: student.id,
					teacher_id: teacher.id,
					start_date: startDate.toISOString(),
					isFree: false,
				})
				.expect(201);

			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('student');
			expect(response.body.student).toHaveProperty('id', student.id);
			expect(response.body).toHaveProperty('teacher');
			expect(response.body.teacher).toHaveProperty('id', teacher.id);
			expect(response.body).toHaveProperty('plan');
			expect(response.body.plan).toHaveProperty('id', plan.id);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.post('/lessons/single')
				.send({
					plan_id: 1,
					student_id: 1,
					teacher_id: 1,
					start_date: new Date().toISOString(),
					isFree: false,
				})
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
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
				.post('/lessons/single')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					plan_id: 1,
					student_id: 1,
					teacher_id: 1,
					start_date: new Date().toISOString(),
					isFree: false,
				})
				.expect(401);
		});

		it('should return 404 if plan not found', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const adminPasswordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: adminPasswordHash,
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
				.post('/lessons/single')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					plan_id: 99999,
					student_id: student.id,
					teacher_id: teacher.id,
					start_date: new Date().toISOString(),
					isFree: false,
				})
				.expect(404);
		});

		it('should return 404 if student not found', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const adminPasswordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: adminPasswordHash,
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
				.post('/lessons/single')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					plan_id: plan.id,
					student_id: 99999,
					teacher_id: teacher.id,
					start_date: new Date().toISOString(),
					isFree: false,
				})
				.expect(404);
		});
	});

	describe('GET /lessons', () => {
		it('should succeed getting lessons for period with teacher JWT', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const startDate = new Date();
			startDate.setHours(startDate.getHours() + 1);
			const endDate = new Date(startDate);
			endDate.setDate(endDate.getDate() + 7);

			// Create a lesson
			await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: startDate,
					is_free: false,
					is_regular: false,
					status: 'PENDING_UNPAID',
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

			const response = await request(app.getHttpServer())
				.get(`/lessons?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThanOrEqual(1);
		});

		it('should succeed getting lessons for period with admin JWT and teacher_id filter', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const adminPasswordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: adminPasswordHash,
					role: TeacherRole.ADMIN,
				},
			});

			const startDate = new Date();
			startDate.setHours(startDate.getHours() + 1);
			const endDate = new Date(startDate);
			endDate.setDate(endDate.getDate() + 7);

			// Create a lesson
			await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: startDate,
					is_free: false,
					is_regular: false,
					status: 'PENDING_UNPAID',
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
				.get(`/lessons?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&teacher_id=${teacher.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThanOrEqual(1);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.get('/lessons?start_date=2024-01-01&end_date=2024-01-31')
				.expect(401);
		});
	});

	describe('POST /lessons/regular/:student_id', () => {
		it('should succeed creating regular lessons with admin JWT', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const adminPasswordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: adminPasswordHash,
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

			const startPeriod = new Date();
			startPeriod.setDate(startPeriod.getDate() + 1);
			const endPeriod = new Date(startPeriod);
			endPeriod.setDate(endPeriod.getDate() + 14);

			const startTime = new Date();
			startTime.setHours(10, 0, 0, 0);

			const response = await request(app.getHttpServer())
				.post(`/lessons/regular/${student.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					lessons: [
						{
							teacher_id: teacher.id,
							plan_id: plan.id,
							start_time: startTime.toISOString(),
							week_day: WeekDay.MONDAY,
							start_period_date: startPeriod.toISOString(),
							end_period_date: endPeriod.toISOString(),
						},
					],
				})
				.expect(201);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThan(0);
			expect(response.body[0]).toHaveProperty('id');
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.post('/lessons/regular/1')
				.send({
					lessons: [],
				})
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
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
				.post('/lessons/regular/1')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					lessons: [],
				})
				.expect(401);
		});
	});

	describe('GET /lessons/assigned', () => {
		it('should succeed getting assigned lessons with teacher JWT', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const startDate = new Date();
			startDate.setHours(10, 0, 0, 0);

			// Create a lesson
			await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: startDate,
					is_free: false,
					is_regular: false,
					status: 'PENDING_UNPAID',
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

			const response = await request(app.getHttpServer())
				.get(`/lessons/assigned?start_date=${startDate.toISOString()}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.get('/lessons/assigned?start_date=2024-01-01')
				.expect(401);
		});
	});

	describe('PATCH /lessons/:id/teacher', () => {
		it('should succeed changing teacher with admin JWT', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const teacher2PasswordHash = await bcryptService.generateHash(testTeacher2.password);
			const teacher2 = await prisma.teacher.create({
				data: {
					...testTeacher2,
					password: teacher2PasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const startDate = new Date();
			startDate.setHours(startDate.getHours() + 1);

			const lesson = await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: startDate,
					is_free: false,
					is_regular: false,
					status: 'PENDING_UNPAID',
				},
			});

			const adminPasswordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: adminPasswordHash,
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
				.patch(`/lessons/${lesson.id}/teacher`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					teacher_id: teacher2.id,
				})
				.expect(204);

			// Verify teacher was changed
			const updatedLesson = await prisma.lesson.findUnique({
				where: { id: lesson.id },
			});
			expect(updatedLesson?.teacher_id).toBe(teacher2.id);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.patch('/lessons/1/teacher')
				.send({
					teacher_id: 1,
				})
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
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
				.patch('/lessons/1/teacher')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					teacher_id: 1,
				})
				.expect(401);
		});

		it('should return 404 if teacher not found', async () => {
			const adminPasswordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: adminPasswordHash,
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
				.patch('/lessons/1/teacher')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					teacher_id: 99999,
				})
				.expect(404);
		});
	});

	describe('PATCH /lessons/:id/cancel', () => {
		it('should succeed canceling lesson with teacher JWT (own student)', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const startDate = new Date();
			startDate.setHours(startDate.getHours() + 1);

			const lesson = await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: startDate,
					is_free: false,
					is_regular: false,
					status: 'PENDING_UNPAID',
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
				.patch(`/lessons/${lesson.id}/cancel`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					status: CancelationStatusEnum.CANCELLED,
					comment: 'Test cancellation',
				})
				.expect(204);

			// Verify lesson was cancelled
			const cancelledLesson = await prisma.lesson.findUnique({
				where: { id: lesson.id },
			});
			expect(cancelledLesson?.status).toBe('CANCELLED');
		});

		it('should succeed canceling lesson with admin JWT', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const startDate = new Date();
			startDate.setHours(startDate.getHours() + 1);

			const lesson = await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: startDate,
					is_free: false,
					is_regular: false,
					status: 'PENDING_UNPAID',
				},
			});

			const adminPasswordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: adminPasswordHash,
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
				.patch(`/lessons/${lesson.id}/cancel`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					status: CancelationStatusEnum.CANCELLED,
					comment: 'Admin cancellation',
				})
				.expect(204);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.patch('/lessons/1/cancel')
				.send({
					status: CancelationStatusEnum.CANCELLED,
				})
				.expect(401);
		});

		it('should return 400 if lesson already cancelled', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id,
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const startDate = new Date();
			startDate.setHours(startDate.getHours() + 1);

			const lesson = await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: startDate,
					is_free: false,
					is_regular: false,
					status: 'CANCELLED',
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
				.patch(`/lessons/${lesson.id}/cancel`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					status: CancelationStatusEnum.CANCELLED,
				})
				.expect(400);
		});

		it('should return 400 if teacher tries to cancel lesson for another teacher\'s student', async () => {
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			const teacher = await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const teacher2PasswordHash = await bcryptService.generateHash(testTeacher2.password);
			const teacher2 = await prisma.teacher.create({
				data: {
					...testTeacher2,
					password: teacher2PasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const student = await prisma.student.create({
				data: {
					...testStudent,
					birth_date: testStudent.birth_date,
					teacher_id: teacher.id, // Student belongs to teacher, not teacher2
				},
			});

			const plan = await prisma.plan.create({
				data: testPlan,
			});

			const startDate = new Date();
			startDate.setHours(startDate.getHours() + 1);

			const lesson = await prisma.lesson.create({
				data: {
					student_id: student.id,
					teacher_id: teacher.id,
					plan_id: plan.id,
					date: startDate,
					is_free: false,
					is_regular: false,
					status: 'PENDING_UNPAID',
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const teacher2Token = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: teacher2.id.toString(),
				login: teacher2.login,
				name: teacher2.name,
				role: teacher2.role,
			});

			await request(app.getHttpServer())
				.patch(`/lessons/${lesson.id}/cancel`)
				.set('Authorization', `Bearer ${teacher2Token}`)
				.send({
					status: CancelationStatusEnum.CANCELLED,
				})
				.expect(400);
		});
	});
});

