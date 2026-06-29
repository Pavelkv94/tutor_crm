import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { createTestApp, generateTestRefreshToken, getAuthConfig, getJwtService, closeTestApp } from '../helpers/test-utils';
import { TeacherRole } from '../../src/infrastructure/prisma/generated/client';
import { BcryptService } from '../../src/infrastructure/bcrypt/bcrypt.service';

describe('AuthController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let bcryptService: BcryptService;
	let module: TestingModule;

	const testAdmin = {
		login: 'test_admin',
		password: 'testPassword123',
		name: 'Test Admin',
	};

	const testTeacher = {
		login: 'test_teacher',
		password: 'testPassword123',
		name: 'Test Teacher',
	};

	beforeAll(async () => {
		const testContext = await createTestApp();
		app = testContext.app;
		module = testContext.module;
		prisma = module.get<PrismaService>(PrismaService);
		bcryptService = module.get<BcryptService>(BcryptService);
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
			const authConfig = getAuthConfig(module);
			const response = await request(app.getHttpServer())
				.post('/auth/register-admin')
				.send({
					login: testAdmin.login,
					password: testAdmin.password,
					name: testAdmin.name,
					secret_key: authConfig.adminRegistrationSecretKey,
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
					secret_key: 'wrong_secret_key',
				})
				.expect(401);
		});

		it('should return 400 if admin exists', async () => {
			const authConfig = getAuthConfig(module);
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
					secret_key: authConfig.adminRegistrationSecretKey,
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
			const authConfig = getAuthConfig(module);
			const refreshToken = await generateTestRefreshToken(jwtService, authConfig, {
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

