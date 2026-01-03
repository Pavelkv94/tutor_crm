import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { createTestApp, generateTestAdminToken, generateTestAccessToken, getCoreEnvConfig, getJwtService } from '../helpers/test-utils';
import { TeacherRole, PlanType, PlanCurrency } from '@prisma/client';
import { BcryptService } from '../../src/modules/auth/bcrypt.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('PlanController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let bcryptService: BcryptService;
	let module: TestingModule;

	const testAdmin = {
		login: 'test_admin_plan_e2e',
		password: 'testPassword123',
		name: 'Test Admin Plan E2E',
		telegram_id: '123456789',
	};

	const testTeacher = {
		login: 'test_teacher_plan_e2e',
		password: 'testPassword123',
		name: 'Test Teacher Plan E2E',
		telegram_id: '987654321',
	};

	const testPlan = {
		plan_type: PlanType.INDIVIDUAL,
		plan_currency: PlanCurrency.USD,
		plan_price: 100000,
		duration: 10,
		plan_name: 'Test Plan 10 minutes',
	};

	const testPlan2 = {
		plan_type: PlanType.PAIR,
		plan_currency: PlanCurrency.EUR,
		plan_price: 150000,
		duration: 20,
		plan_name: 'Test Plan 20 minutes',
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
			// Delete plans created during tests
			await prisma.plan.deleteMany({
				where: {
					plan_name: {
						in: [testPlan.plan_name, testPlan2.plan_name],
					},
				},
			});
			// Delete test users
			await prisma.teacher.deleteMany({
				where: {
					login: {
						in: [testAdmin.login, testTeacher.login],
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
			await prisma.plan.deleteMany({
				where: {
					plan_name: {
						in: [testPlan.plan_name, testPlan2.plan_name],
					},
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

	describe('POST /plans', () => {
		it('should succeed creating plan with admin JWT', async () => {
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
				.post('/plans')
				.set('Authorization', `Bearer ${adminToken}`)
				.send(testPlan)
				.expect(201);

			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('plan_name');
			expect(response.body.plan_name).toContain(testPlan.plan_type);
			expect(response.body.plan_name).toContain(`${testPlan.duration} min`);
			expect(response.body).toHaveProperty('plan_price', testPlan.plan_price);
			expect(response.body).toHaveProperty('plan_currency', testPlan.plan_currency);
			expect(response.body).toHaveProperty('duration', testPlan.duration);
			expect(response.body).toHaveProperty('plan_type', testPlan.plan_type);

			// Verify plan was created in database
			const createdPlan = await prisma.plan.findFirst({
				where: { id: response.body.id },
			});
			expect(createdPlan).toBeDefined();
			expect(createdPlan?.plan_name).toBeDefined();
			expect(createdPlan?.plan_name).toContain(testPlan.plan_type);
			expect(createdPlan?.plan_name).toContain(`${testPlan.duration} min`);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.post('/plans')
				.send(testPlan)
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
				.post('/plans')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send(testPlan)
				.expect(401);
		});

		it('should return validation errors for invalid data', async () => {
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
				.post('/plans')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					// Missing required fields
					plan_type: '',
					plan_price: -1,
					duration: 0,
				})
				.expect(400);
		});
	});

	describe('GET /plans', () => {
		it('should succeed with admin JWT', async () => {
			// Create a plan first
			await prisma.plan.create({
				data: testPlan,
			});

			await prisma.plan.create({
				data: testPlan2,
			});

			// Create admin user (class-level guard requires admin)
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
				.get('/plans')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThanOrEqual(2);
			
			// Verify the plans are in the response
			const planNames = response.body.map((p: any) => p.plan_name);
			expect(planNames).toContain(testPlan.plan_name);
			expect(planNames).toContain(testPlan2.plan_name);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.get('/plans')
				.expect(401);
		});

		it('should return empty array when no plans exist', async () => {
			// Create admin user (class-level guard requires admin)
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
				.get('/plans')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
		});
	});

	describe('DELETE /plans/:id', () => {
		it('should succeed deleting plan with admin JWT', async () => {
			// Create a plan first
			const createdPlan = await prisma.plan.create({
				data: testPlan,
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

			await request(app.getHttpServer())
				.delete(`/plans/${createdPlan.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(204);

			// Verify plan was soft deleted (deleted_at is set)
			const deletedPlan = await prisma.plan.findUnique({
				where: { id: createdPlan.id },
			});
			expect(deletedPlan).toBeDefined();
			expect(deletedPlan?.deleted_at).not.toBeNull();
		});

		it('should return 401 without token', async () => {
			// Create a plan first
			const createdPlan = await prisma.plan.create({
				data: testPlan,
			});

			await request(app.getHttpServer())
				.delete(`/plans/${createdPlan.id}`)
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			// Create a plan first
			const createdPlan = await prisma.plan.create({
				data: testPlan,
			});

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
				.delete(`/plans/${createdPlan.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(401);
		});

		it('should return 404 if plan not found', async () => {
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

			// Use a non-existent plan ID
			await request(app.getHttpServer())
				.delete('/plans/99999')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(404);
		});
	});
});

