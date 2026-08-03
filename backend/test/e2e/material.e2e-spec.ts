import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { createTestApp, generateTestAccessToken, getAuthConfig, getJwtService, closeTestApp } from '../helpers/test-utils';
import { TeacherRole, FileType } from '../../src/infrastructure/prisma/generated/client';
import { BcryptService } from '../../src/infrastructure/bcrypt/bcrypt.service';

describe('MaterialController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let bcryptService: BcryptService;
	let module: TestingModule;

	const testAdmin = {
		login: 'test_admin_material_e2e',
		password: 'testPassword123',
		name: 'Test Admin Material E2E',
	};

	const testTeacher = {
		login: 'test_teacher_material_e2e',
		password: 'testPassword123',
		name: 'Test Teacher Material E2E',
	};

	const courseNames = [
		'Test Course E2E',
		'Test Course E2E 2',
		'Test Course With Files E2E',
		'Test Course Updated E2E',
		'Test Course With Materials E2E',
		'Test Course Upload Init E2E',
		'Test Course View Url E2E',
	];

	const cleanupTestData = async () => {
		const courses = await prisma.course.findMany({
			where: { name: { in: courseNames } },
		});
		const courseIds = courses.map((course) => course.id);
		if (courseIds.length > 0) {
			const files = await prisma.file.findMany({ where: { course_id: { in: courseIds } } });
			const fileIds = files.map((file) => file.id);
			if (fileIds.length > 0) {
				await prisma.fileAccess.deleteMany({ where: { file_id: { in: fileIds } } });
			}
			await prisma.file.deleteMany({ where: { course_id: { in: courseIds } } });
			await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
		}
		await prisma.teacher.deleteMany({
			where: { login: { in: [testAdmin.login, testTeacher.login] } },
		});
	};

	const createAdminToken = async (): Promise<string> => {
		const passwordHash = await bcryptService.generateHash(testAdmin.password);
		const admin = await prisma.teacher.create({
			data: { ...testAdmin, password: passwordHash, role: TeacherRole.ADMIN },
		});
		const jwtService = getJwtService(module);
		const authConfig = getAuthConfig(module);
		return generateTestAccessToken(jwtService, authConfig, {
			id: admin.id.toString(),
			login: admin.login,
			name: admin.name,
			role: admin.role,
		});
	};

	const createTokenForTeacher = (teacher: { id: number; login: string; name: string; role: TeacherRole }): Promise<string> => {
		const jwtService = getJwtService(module);
		const authConfig = getAuthConfig(module);
		return generateTestAccessToken(jwtService, authConfig, {
			id: teacher.id.toString(),
			login: teacher.login,
			name: teacher.name,
			role: teacher.role,
		});
	};

	const createTeacherToken = async (): Promise<string> => {
		const passwordHash = await bcryptService.generateHash(testTeacher.password);
		const teacher = await prisma.teacher.create({
			data: { ...testTeacher, password: passwordHash, role: TeacherRole.TEACHER },
		});
		return createTokenForTeacher(teacher);
	};

	beforeAll(async () => {
		const testContext = await createTestApp();
		app = testContext.app;
		module = testContext.module;
		prisma = module.get<PrismaService>(PrismaService);
		bcryptService = module.get<BcryptService>(BcryptService);
	});

	afterAll(async () => {
		if (prisma) {
			await cleanupTestData();
		}
		if (app) {
			await closeTestApp(app);
		}
	});

	beforeEach(async () => {
		if (prisma) {
			await cleanupTestData();
		}
	});

	describe('POST /materials/courses', () => {
		it('should succeed creating course with admin JWT', async () => {
			const adminToken = await createAdminToken();

			const response = await request(app.getHttpServer())
				.post('/materials/courses')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ name: 'Test Course E2E' })
				.expect(201);

			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('name', 'Test Course E2E');
			expect(response.body).toHaveProperty('created_at');

			const createdCourse = await prisma.course.findFirst({ where: { id: response.body.id } });
			expect(createdCourse).toBeDefined();
			expect(createdCourse?.name).toBe('Test Course E2E');
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.post('/materials/courses')
				.send({ name: 'Test Course E2E' })
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			const teacherToken = await createTeacherToken();

			await request(app.getHttpServer())
				.post('/materials/courses')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({ name: 'Test Course E2E' })
				.expect(401);
		});

		it('should return 400 for invalid data', async () => {
			const adminToken = await createAdminToken();

			await request(app.getHttpServer())
				.post('/materials/courses')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ name: '' })
				.expect(400);
		});
	});

	describe('GET /materials/courses', () => {
		it('should succeed with any authenticated user', async () => {
			await prisma.course.create({ data: { name: 'Test Course E2E' } });
			await prisma.course.create({ data: { name: 'Test Course E2E 2' } });

			const teacherToken = await createTeacherToken();

			const response = await request(app.getHttpServer())
				.get('/materials/courses')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			const names = response.body.map((course: any) => course.name);
			expect(names).toContain('Test Course E2E');
			expect(names).toContain('Test Course E2E 2');
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer()).get('/materials/courses').expect(401);
		});
	});

	describe('GET /materials/courses/:id/materials', () => {
		it('should return only uploaded materials of the course for any authenticated user', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course With Materials E2E' } });
			const uploadedFile = await prisma.file.create({
				data: {
					storage_key: 'test-storage-key-uploaded.pdf',
					original_name: 'uploaded.pdf',
					mime_type: 'application/pdf',
					size_bytes: 1024,
					type: FileType.PDF,
					course_id: course.id,
					upload_status: 'UPLOADED',
				},
			});
			await prisma.file.create({
				data: {
					storage_key: 'test-storage-key-uploading.pdf',
					original_name: 'uploading.pdf',
					mime_type: 'application/pdf',
					size_bytes: 2048,
					type: FileType.PDF,
					course_id: course.id,
					upload_status: 'UPLOADING',
				},
			});
			const teacherToken = await createTeacherToken();

			const response = await request(app.getHttpServer())
				.get(`/materials/courses/${course.id}/materials`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(response.body).toHaveLength(1);
			expect(response.body[0]).toMatchObject({ id: uploadedFile.id, originalName: 'uploaded.pdf', status: 'UPLOADED' });
		});

		it('should return 401 without token', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course With Materials E2E' } });

			await request(app.getHttpServer()).get(`/materials/courses/${course.id}/materials`).expect(401);
		});

		it('should return 404 if course not found', async () => {
			const teacherToken = await createTeacherToken();

			await request(app.getHttpServer())
				.get('/materials/courses/999999/materials')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(404);
		});
	});

	describe('POST /materials/upload/init', () => {
		it('should create a pending material and grant access to the given teachers', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course Upload Init E2E' } });
			const teacher = await prisma.teacher.create({
				data: { ...testTeacher, password: await bcryptService.generateHash(testTeacher.password), role: TeacherRole.TEACHER },
			});
			const adminToken = await createAdminToken();

			const response = await request(app.getHttpServer())
				.post('/materials/upload/init')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					courseId: course.id,
					teachers: [teacher.id],
					fileName: 'lesson1.pdf',
					mimeType: 'application/pdf',
					contentType: 'application/pdf',
					sizeBytes: 1024,
				})
				.expect(200);

			expect(response.body).toHaveProperty('materialId');
			expect(response.body).toHaveProperty('uploadUrl');

			const fileAccess = await prisma.fileAccess.findFirst({
				where: { teacher_id: teacher.id, file_id: response.body.materialId },
			});
			expect(fileAccess).not.toBeNull();
		});

		it('should accept an empty teachers array', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course Upload Init E2E' } });
			const adminToken = await createAdminToken();

			await request(app.getHttpServer())
				.post('/materials/upload/init')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					courseId: course.id,
					teachers: [],
					fileName: 'lesson1.pdf',
					mimeType: 'application/pdf',
					contentType: 'application/pdf',
					sizeBytes: 1024,
				})
				.expect(200);
		});

		it('should return 401 with non-admin token', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course Upload Init E2E' } });
			const teacherToken = await createTeacherToken();

			await request(app.getHttpServer())
				.post('/materials/upload/init')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({
					courseId: course.id,
					teachers: [],
					fileName: 'lesson1.pdf',
					mimeType: 'application/pdf',
					contentType: 'application/pdf',
					sizeBytes: 1024,
				})
				.expect(401);
		});
	});

	describe('POST /materials/:id/view-url', () => {
		it('should return a presigned view url when the teacher has access', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course View Url E2E' } });
			const teacher = await prisma.teacher.create({
				data: { ...testTeacher, password: await bcryptService.generateHash(testTeacher.password), role: TeacherRole.TEACHER },
			});
			const file = await prisma.file.create({
				data: {
					storage_key: 'test-storage-key-view.pdf',
					original_name: 'view.pdf',
					mime_type: 'application/pdf',
					size_bytes: 1024,
					type: FileType.PDF,
					course_id: course.id,
					upload_status: 'UPLOADED',
				},
			});
			await prisma.fileAccess.create({ data: { teacher_id: teacher.id, file_id: file.id } });
			const teacherToken = await createTokenForTeacher(teacher);

			const response = await request(app.getHttpServer())
				.post(`/materials/${file.id}/view-url`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('url');
			expect(typeof response.body.url).toBe('string');
		});

		it('should return a presigned view url for an admin without an explicit file access record', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course View Url E2E' } });
			const file = await prisma.file.create({
				data: {
					storage_key: 'test-storage-key-admin.pdf',
					original_name: 'admin.pdf',
					mime_type: 'application/pdf',
					size_bytes: 1024,
					type: FileType.PDF,
					course_id: course.id,
					upload_status: 'UPLOADED',
				},
			});
			const adminToken = await createAdminToken();

			const response = await request(app.getHttpServer())
				.post(`/materials/${file.id}/view-url`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('url');
		});

		it('should return 403 when the teacher has no access', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course View Url E2E' } });
			const file = await prisma.file.create({
				data: {
					storage_key: 'test-storage-key-no-access.pdf',
					original_name: 'no-access.pdf',
					mime_type: 'application/pdf',
					size_bytes: 1024,
					type: FileType.PDF,
					course_id: course.id,
					upload_status: 'UPLOADED',
				},
			});
			const teacherToken = await createTeacherToken();

			await request(app.getHttpServer())
				.post(`/materials/${file.id}/view-url`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(403);
		});

		it('should return 400 when the material upload is not completed', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course View Url E2E' } });
			const teacher = await prisma.teacher.create({
				data: { ...testTeacher, password: await bcryptService.generateHash(testTeacher.password), role: TeacherRole.TEACHER },
			});
			const file = await prisma.file.create({
				data: {
					storage_key: 'test-storage-key-uploading.pdf',
					original_name: 'uploading.pdf',
					mime_type: 'application/pdf',
					size_bytes: 1024,
					type: FileType.PDF,
					course_id: course.id,
					upload_status: 'UPLOADING',
				},
			});
			await prisma.fileAccess.create({ data: { teacher_id: teacher.id, file_id: file.id } });
			const teacherToken = await createTokenForTeacher(teacher);

			await request(app.getHttpServer())
				.post(`/materials/${file.id}/view-url`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(400);
		});

		it('should return 404 if material not found', async () => {
			const teacherToken = await createTeacherToken();

			await request(app.getHttpServer())
				.post('/materials/999999/view-url')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(404);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer()).post('/materials/1/view-url').expect(401);
		});
	});

	describe('PUT /materials/courses/:id', () => {
		it('should succeed updating course with admin JWT', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course E2E' } });
			const adminToken = await createAdminToken();

			const response = await request(app.getHttpServer())
				.put(`/materials/courses/${course.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ name: 'Test Course Updated E2E' })
				.expect(200);

			expect(response.body).toHaveProperty('id', course.id);
			expect(response.body).toHaveProperty('name', 'Test Course Updated E2E');

			const updatedCourse = await prisma.course.findUnique({ where: { id: course.id } });
			expect(updatedCourse?.name).toBe('Test Course Updated E2E');
		});

		it('should return 401 without token', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course E2E' } });

			await request(app.getHttpServer())
				.put(`/materials/courses/${course.id}`)
				.send({ name: 'Test Course Updated E2E' })
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course E2E' } });
			const teacherToken = await createTeacherToken();

			await request(app.getHttpServer())
				.put(`/materials/courses/${course.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({ name: 'Test Course Updated E2E' })
				.expect(401);
		});

		it('should return 404 if course not found', async () => {
			const adminToken = await createAdminToken();

			await request(app.getHttpServer())
				.put('/materials/courses/999999')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ name: 'Test Course Updated E2E' })
				.expect(404);
		});

		it('should return 400 for invalid data', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course E2E' } });
			const adminToken = await createAdminToken();

			await request(app.getHttpServer())
				.put(`/materials/courses/${course.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ name: '' })
				.expect(400);
		});
	});

	describe('DELETE /materials/courses/:id', () => {
		it('should succeed deleting course without files with admin JWT', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course E2E' } });
			const adminToken = await createAdminToken();

			await request(app.getHttpServer())
				.delete(`/materials/courses/${course.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			const deletedCourse = await prisma.course.findUnique({ where: { id: course.id } });
			expect(deletedCourse).toBeNull();
		});

		it('should return 409 when course has files', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course With Files E2E' } });
			await prisma.file.create({
				data: {
					storage_key: 'test-storage-key.pdf',
					original_name: 'test.pdf',
					mime_type: 'application/pdf',
					size_bytes: 1024,
					type: FileType.PDF,
					course_id: course.id,
				},
			});
			const adminToken = await createAdminToken();

			await request(app.getHttpServer())
				.delete(`/materials/courses/${course.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(409);

			const notDeletedCourse = await prisma.course.findUnique({ where: { id: course.id } });
			expect(notDeletedCourse).not.toBeNull();
		});

		it('should return 401 without token', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course E2E' } });

			await request(app.getHttpServer())
				.delete(`/materials/courses/${course.id}`)
				.expect(401);
		});

		it('should return 401 with non-admin token', async () => {
			const course = await prisma.course.create({ data: { name: 'Test Course E2E' } });
			const teacherToken = await createTeacherToken();

			await request(app.getHttpServer())
				.delete(`/materials/courses/${course.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(401);
		});

		it('should return 404 if course not found', async () => {
			const adminToken = await createAdminToken();

			await request(app.getHttpServer())
				.delete('/materials/courses/999999')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(404);
		});
	});
});
