import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { createTestApp, generateTestAdminToken, generateTestAccessToken, getCoreEnvConfig, getJwtService } from '../helpers/test-utils';
import { TeacherRole } from '@prisma/client';
import { BcryptService } from '../../src/modules/auth/bcrypt.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('TeacherController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let bcryptService: BcryptService;
	let module: TestingModule;

	const testAdmin = {
		login: 'test_admin_e2e',
		password: 'testPassword123',
		name: 'Test Admin E2E',
		telegram_id: '123456789',
	};

	const testTeacher = {
		login: 'test_teacher_e2e',
		password: 'testPassword123',
		name: 'Test Teacher E2E',
		telegram_id: '987654321',
	};

	const newTeacher = {
		login: 'new_teacher',
		password: 'newPassword123',
		name: 'New Teacher',
		telegram_id: '111222333',
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
			await prisma.teacher.deleteMany({
				where: {
					login: {
						in: [testAdmin.login, testTeacher.login, newTeacher.login],
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
		await prisma.teacher.deleteMany({
			where: {
				login: {
					in: [testAdmin.login, testTeacher.login, newTeacher.login],
				},
			},
		});
	});

	describe('GET /teachers', () => {
		it('should succeed with admin JWT', async () => {
			// Create admin user
			const passwordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: passwordHash,
					role: TeacherRole.ADMIN,
				},
			});

			// Create test teacher
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const jwtService = getJwtService(module);
			const coreEnvConfig = getCoreEnvConfig(module);
			const adminToken = await generateTestAdminToken(jwtService, coreEnvConfig);

			// Override with actual admin data
			const actualAdminToken = await generateTestAccessToken(jwtService, coreEnvConfig, {
				id: admin.id.toString(),
				login: admin.login,
				name: admin.name,
				role: admin.role,
			});

			const response = await request(app.getHttpServer())
				.get('/teachers')
				.set('Authorization', `Bearer ${actualAdminToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThanOrEqual(2);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.get('/teachers')
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
				.get('/teachers')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(401);
		});
	});

	describe('POST /teachers', () => {
		it('should succeed creating teacher', async () => {
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
				.post('/teachers')
				.set('Authorization', `Bearer ${adminToken}`)
				.send(newTeacher)
				.expect(201);

			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('login', newTeacher.login);
			expect(response.body).toHaveProperty('name', newTeacher.name);
			expect(response.body).toHaveProperty('role', TeacherRole.TEACHER);

			// Verify teacher was created in database
			const createdTeacher = await prisma.teacher.findUnique({
				where: { login: newTeacher.login },
			});
			expect(createdTeacher).toBeDefined();
			expect(createdTeacher?.login).toBe(newTeacher.login);
		});

		it('should return 400 if teacher exists', async () => {
			// Create admin user
			const passwordHash = await bcryptService.generateHash(testAdmin.password);
			const admin = await prisma.teacher.create({
				data: {
					...testAdmin,
					password: passwordHash,
					role: TeacherRole.ADMIN,
				},
			});

			// Create existing teacher
			const teacherPasswordHash = await bcryptService.generateHash(testTeacher.password);
			await prisma.teacher.create({
				data: {
					...testTeacher,
					password: teacherPasswordHash,
					role: TeacherRole.TEACHER,
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
				.post('/teachers')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					login: testTeacher.login,
					password: 'password123',
					name: 'Duplicate Teacher',
					telegram_id: null,
				})
				.expect(400);
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
				.post('/teachers')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					// Missing required fields
					login: '',
					password: '',
				})
				.expect(400);
		});
	});
});

