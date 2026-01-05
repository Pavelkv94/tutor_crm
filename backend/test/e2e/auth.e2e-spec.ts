import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { createTestApp, generateTestRefreshToken, getCoreEnvConfig, getJwtService, closeTestApp } from '../helpers/test-utils';
import { TeacherRole } from '@prisma/client';
import { BcryptService } from '../../src/modules/auth/bcrypt.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let bcryptService: BcryptService;
	let module: TestingModule;

	const testAdmin = {
		login: 'test_admin',
		password: 'testPassword123',
		name: 'Test Admin',
		telegram_id: '123456789',
	};

	const testTeacher = {
		login: 'test_teacher',
		password: 'testPassword123',
		name: 'Test Teacher',
		telegram_id: '987654321',
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
		await prisma.teacher.deleteMany({
			where: {
				login: {
					in: [testAdmin.login, testTeacher.login],
				},
			},
		});
	});

	describe('POST /auth/login', () => {
		it('should succeed with valid credentials', async () => {
			// Create a test teacher
			const passwordHash = await bcryptService.generateHash(testTeacher.password);
			await prisma.teacher.create({
				data: {
					...testTeacher,
					password: passwordHash,
					role: TeacherRole.TEACHER,
				},
			});

			const response = await request(app.getHttpServer())
				.post('/auth/login')
				.send({
					login: testTeacher.login,
					password: testTeacher.password,
				})
				.expect(200);

			expect(response.body).toHaveProperty('accessToken');
			expect(response.body.accessToken).toBeDefined();
			expect(response.headers['set-cookie']).toBeDefined();
			expect(response.headers['set-cookie'][0]).toContain('refreshToken');
		});

		it('should return 401 with invalid login', async () => {
			await request(app.getHttpServer())
				.post('/auth/login')
				.send({
					login: 'nonexistent',
					password: 'password123',
				})
				.expect(401);
		});

		it('should return 401 with wrong password', async () => {
			// Create a test teacher
			const passwordHash = await bcryptService.generateHash(testTeacher.password);
			await prisma.teacher.create({
				data: {
					...testTeacher,
					password: passwordHash,
					role: TeacherRole.TEACHER,
				},
			});

			await request(app.getHttpServer())
				.post('/auth/login')
				.send({
					login: testTeacher.login,
					password: 'wrongPassword',
				})
				.expect(401);
		});
	});

	describe('POST /auth/register-admin', () => {
		it('should succeed with valid secret key', async () => {
			const coreEnvConfig = getCoreEnvConfig(module);
			const response = await request(app.getHttpServer())
				.post('/auth/register-admin')
				.send({
					login: testAdmin.login,
					password: testAdmin.password,
					name: testAdmin.name,
					telegram_id: testAdmin.telegram_id,
					secret_key: coreEnvConfig.adminRegistrationSecretKey,
				})
				.expect(201);

			expect(response.body).toHaveProperty('message');
			expect(response.body.message).toBe('Admin registered successfully');

			// Verify admin was created in database
			const admin = await prisma.teacher.findUnique({
				where: { login: testAdmin.login },
			});
			expect(admin).toBeDefined();
		});

		it('should return 401 with invalid secret key', async () => {
			await request(app.getHttpServer())
				.post('/auth/register-admin')
				.send({
					login: testAdmin.login,
					password: testAdmin.password,
					name: testAdmin.name,
					telegram_id: testAdmin.telegram_id,
					secret_key: 'wrong_secret_key',
				})
				.expect(401);
		});

		it('should return 400 if admin exists', async () => {
			const coreEnvConfig = getCoreEnvConfig(module);
			const passwordHash = await bcryptService.generateHash(testAdmin.password);

			// Create admin first
			await prisma.teacher.create({
				data: {
					...testAdmin,
					password: passwordHash,
					role: TeacherRole.ADMIN,
				},
			});

			await request(app.getHttpServer())
				.post('/auth/register-admin')
				.send({
					login: testAdmin.login,
					password: testAdmin.password,
					name: testAdmin.name,
					telegram_id: testAdmin.telegram_id,
					secret_key: coreEnvConfig.adminRegistrationSecretKey,
				})
				.expect(400);
		});
	});

	describe('POST /auth/refresh-token', () => {
		it('should succeed with valid refresh token', async () => {
			// Create a test teacher
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
			const refreshToken = await generateTestRefreshToken(jwtService, coreEnvConfig, {
				id: teacher.id.toString(),
				login: teacher.login,
				name: teacher.name,
				role: teacher.role,
			});

			const response = await request(app.getHttpServer())
				.post('/auth/refresh-token')
				.set('Cookie', `refreshToken=${refreshToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('accessToken');
			expect(response.body.accessToken).toBeDefined();
			expect(response.headers['set-cookie']).toBeDefined();
			expect(response.headers['set-cookie'][0]).toContain('refreshToken');
		});

		it('should return 401 with invalid/missing token', async () => {
			await request(app.getHttpServer())
				.post('/auth/refresh-token')
				.expect(401);

			await request(app.getHttpServer())
				.post('/auth/refresh-token')
				.set('Cookie', 'refreshToken=invalid_token')
				.expect(401);
		});
	});
});

