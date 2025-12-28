import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { createTestApp, generateTestAdminToken, generateTestAccessToken, getCoreEnvConfig, getJwtService } from '../helpers/test-utils';
import { TeacherRole } from '@prisma/client';
import { BcryptService } from '../../src/modules/auth/bcrypt.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('StudentController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let bcryptService: BcryptService;
	let module: TestingModule;

	const testAdmin = {
		login: 'test_admin_student_e2e',
		password: 'testPassword123',
		name: 'Test Admin Student E2E',
		telegram_id: '123456789',
	};

	const testTeacher = {
		login: 'test_teacher_student_e2e',
		password: 'testPassword123',
		name: 'Test Teacher Student E2E',
		telegram_id: '987654321',
	};

	const testStudent = {
		name: 'Test Student',
		class: 5,
		birth_date: new Date('2010-01-15'),
	};

	const testStudent2 = {
		name: 'Test Student 2',
		class: 6,
		birth_date: new Date('2009-03-20'),
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
			// Soft delete students created during tests
			await prisma.student.updateMany({
				where: {
					name: {
						in: [testStudent.name, testStudent2.name],
					},
				},
				data: {
					deleted_at: new Date(),
				},
			});
			// Hard delete for cleanup
			await prisma.student.deleteMany({
				where: {
					name: {
						in: [testStudent.name, testStudent2.name],
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
			// Hard delete students from previous tests
			await prisma.student.deleteMany({
				where: {
					name: {
						in: [testStudent.name, testStudent2.name],
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

	describe('POST /students', () => {
		it('should succeed creating student with admin JWT', async () => {
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
				.post('/students')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					name: testStudent.name,
					class: testStudent.class,
					birth_date: testStudent.birth_date.toISOString(), // Send as ISO string, will be transformed to Date
				})
				.expect(201);

			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('name', testStudent.name);
			expect(response.body).toHaveProperty('class', testStudent.class);
			expect(response.body).toHaveProperty('birth_date');

			// Verify student was created in database
			const createdStudent = await prisma.student.findFirst({
				where: { name: testStudent.name },
			});
			expect(createdStudent).toBeDefined();
			expect(createdStudent?.name).toBe(testStudent.name);
			expect(createdStudent?.class).toBe(testStudent.class);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.post('/students')
				.send(testStudent)
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
				.post('/students')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send(testStudent)
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
				.post('/students')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					// Missing required fields
					name: '',
					class: 'invalid',
					birth_date: 'invalid-date',
				})
				.expect(400);
		});
	});

	describe('GET /students', () => {
		it('should succeed with valid JWT', async () => {
			// Create students first
			await prisma.student.create({
				data: testStudent,
			});

			await prisma.student.create({
				data: testStudent2,
			});

			// Create teacher user (any authenticated user can access)
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

			const response = await request(app.getHttpServer())
				.get('/students')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThanOrEqual(2);
			
			// Verify the students are in the response
			const studentNames = response.body.map((s: any) => s.name);
			expect(studentNames).toContain(testStudent.name);
			expect(studentNames).toContain(testStudent2.name);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.get('/students')
				.expect(401);
		});

		it('should not return deleted students', async () => {
			// Create a student
			const student = await prisma.student.create({
				data: testStudent,
			});

			// Soft delete the student
			await prisma.student.update({
				where: { id: student.id },
				data: { deleted_at: new Date() },
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

			const response = await request(app.getHttpServer())
				.get('/students')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			// Deleted student should not be in the list
			const studentNames = response.body.map((s: any) => s.name);
			expect(studentNames).not.toContain(testStudent.name);
		});
	});

	describe('GET /students/:id', () => {
		it('should succeed with admin JWT', async () => {
			// Create a student first
			const createdStudent = await prisma.student.create({
				data: testStudent,
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
				.get(`/students/${createdStudent.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('id', createdStudent.id);
			expect(response.body).toHaveProperty('name', testStudent.name);
			expect(response.body).toHaveProperty('class', testStudent.class);
			expect(response.body).toHaveProperty('balance');
			expect(response.body).toHaveProperty('bookUntilCancellation');
			expect(response.body).toHaveProperty('notifyAboutBirthday');
			expect(response.body).toHaveProperty('notifyAboutLessons');
		});

		it('should return 401 without token', async () => {
			// Create a student first
			const createdStudent = await prisma.student.create({
				data: testStudent,
			});

			await request(app.getHttpServer())
				.get(`/students/${createdStudent.id}`)
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			// Create a student first
			const createdStudent = await prisma.student.create({
				data: testStudent,
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
				.get(`/students/${createdStudent.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(401);
		});

		it('should return 404 if student not found', async () => {
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

			// Use a non-existent student ID
			await request(app.getHttpServer())
				.get('/students/99999')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(404);
		});
	});

	describe('PATCH /students/:id', () => {
		it('should succeed updating student with admin JWT', async () => {
			// Create a student first
			const createdStudent = await prisma.student.create({
				data: testStudent,
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

			const updateData = {
				name: 'Updated Student Name',
				class: 7,
			};

			await request(app.getHttpServer())
				.patch(`/students/${createdStudent.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send(updateData)
				.expect(204);

			// Verify student was updated in database
			const updatedStudent = await prisma.student.findUnique({
				where: { id: createdStudent.id },
			});
			expect(updatedStudent).toBeDefined();
			expect(updatedStudent?.name).toBe(updateData.name);
			expect(updatedStudent?.class).toBe(updateData.class);
		});

		it('should return 401 without token', async () => {
			// Create a student first
			const createdStudent = await prisma.student.create({
				data: testStudent,
			});

			await request(app.getHttpServer())
				.patch(`/students/${createdStudent.id}`)
				.send({ name: 'Updated Name' })
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			// Create a student first
			const createdStudent = await prisma.student.create({
				data: testStudent,
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
				.patch(`/students/${createdStudent.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({ name: 'Updated Name' })
				.expect(401);
		});

		it('should return 404 if student not found', async () => {
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

			// Use a non-existent student ID
			await request(app.getHttpServer())
				.patch('/students/99999')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ name: 'Updated Name' })
				.expect(404);
		});
	});

	describe('DELETE /students/:id', () => {
		it('should succeed deleting student with admin JWT (soft delete)', async () => {
			// Create a student first
			const createdStudent = await prisma.student.create({
				data: testStudent,
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
				.delete(`/students/${createdStudent.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(204);

			// Verify student was soft deleted (deleted_at is set)
			const deletedStudent = await prisma.student.findUnique({
				where: { id: createdStudent.id },
			});
			expect(deletedStudent).toBeDefined();
			expect(deletedStudent?.deleted_at).not.toBeNull();
		});

		it('should return 401 without token', async () => {
			// Create a student first
			const createdStudent = await prisma.student.create({
				data: testStudent,
			});

			await request(app.getHttpServer())
				.delete(`/students/${createdStudent.id}`)
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			// Create a student first
			const createdStudent = await prisma.student.create({
				data: testStudent,
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
				.delete(`/students/${createdStudent.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(401);
		});

		it('should return 404 if student not found', async () => {
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

			// Use a non-existent student ID
			await request(app.getHttpServer())
				.delete('/students/99999')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(404);
		});
	});
});

