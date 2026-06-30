import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { TaskStatus, TeacherRole } from '../../src/infrastructure/prisma/generated/client';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { BcryptService } from '../../src/infrastructure/bcrypt/bcrypt.service';
import {
	closeTestApp,
	createTestApp,
	generateTestAccessToken,
	getAuthConfig,
	getJwtService,
} from '../helpers/test-utils';

describe('TasksController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let bcryptService: BcryptService;
	let module: TestingModule;

	const testAdmin = {
		login: 'test_admin_tasks_e2e',
		password: 'testPassword123',
		name: 'Test Admin Tasks E2E',
	};

	const testTeacher = {
		login: 'test_teacher_tasks_e2e',
		password: 'testPassword123',
		name: 'Test Teacher Tasks E2E',
	};

	const testTeacher2 = {
		login: 'test_teacher2_tasks_e2e',
		password: 'testPassword123',
		name: 'Test Teacher2 Tasks E2E',
	};

	let adminId: number;
	let teacherId: number;
	let teacher2Id: number;
	let adminToken: string;
	let teacherToken: string;
	let teacher2Token: string;

	async function cleanupTasks() {
		if (!prisma) return;
		const testTeacherRecords = await prisma.teacher.findMany({
			where: { login: { in: [testAdmin.login, testTeacher.login, testTeacher2.login] } },
			select: { id: true },
		});
		if (testTeacherRecords.length === 0) return;
		await prisma.task.deleteMany({
			where: { teacher_id: { in: testTeacherRecords.map((t) => t.id) } },
		});
	}

	async function cleanupAll() {
		await cleanupTasks();
		if (!prisma) return;
		await prisma.teacher.deleteMany({
			where: { login: { in: [testAdmin.login, testTeacher.login, testTeacher2.login] } },
		});
	}

	beforeAll(async () => {
		const testContext = await createTestApp();
		app = testContext.app;
		module = testContext.module;
		prisma = module.get<PrismaService>(PrismaService);
		bcryptService = module.get<BcryptService>(BcryptService);

		await cleanupAll();

		const jwtService = getJwtService(module);
		const authConfig = getAuthConfig(module);

		const adminHash = await bcryptService.generateHash(testAdmin.password);
		const admin = await prisma.teacher.create({
			data: { ...testAdmin, password: adminHash, role: TeacherRole.ADMIN },
		});
		adminId = admin.id;
		adminToken = await generateTestAccessToken(jwtService, authConfig, {
			id: admin.id.toString(),
			login: admin.login,
			name: admin.name,
			role: admin.role,
		});

		const teacherHash = await bcryptService.generateHash(testTeacher.password);
		const teacher = await prisma.teacher.create({
			data: { ...testTeacher, password: teacherHash, role: TeacherRole.TEACHER },
		});
		teacherId = teacher.id;
		teacherToken = await generateTestAccessToken(jwtService, authConfig, {
			id: teacher.id.toString(),
			login: teacher.login,
			name: teacher.name,
			role: teacher.role,
		});

		const teacher2Hash = await bcryptService.generateHash(testTeacher2.password);
		const teacher2 = await prisma.teacher.create({
			data: { ...testTeacher2, password: teacher2Hash, role: TeacherRole.TEACHER },
		});
		teacher2Id = teacher2.id;
		teacher2Token = await generateTestAccessToken(jwtService, authConfig, {
			id: teacher2.id.toString(),
			login: teacher2.login,
			name: teacher2.name,
			role: teacher2.role,
		});
	});

	afterAll(async () => {
		await cleanupAll();
		if (app) {
			await closeTestApp(app);
		}
	});

	beforeEach(async () => {
		await cleanupTasks();
	});

	describe('GET /tasks/teachers', () => {
		it('should return teachers with task counts for admin', async () => {
			const response = await request(app.getHttpServer())
				.get('/tasks/teachers')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			const teacherEntry = response.body.find((t: any) => t.id === teacherId);
			expect(teacherEntry).toBeDefined();
			expect(teacherEntry.tasks_count).toHaveProperty('IN_PROGRESS');
			expect(teacherEntry.tasks_count).toHaveProperty('ON_APPROVAL');
			expect(teacherEntry.tasks_count).toHaveProperty('COMPLETED');
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.get('/tasks/teachers')
				.expect(401);
		});

		it('should return 401 for non-admin', async () => {
			await request(app.getHttpServer())
				.get('/tasks/teachers')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(401);
		});
	});

	describe('POST /tasks', () => {
		it('should create task as admin with correct fields', async () => {
			const response = await request(app.getHttpServer())
				.post('/tasks')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ description: 'Test task', teacher_id: teacherId })
				.expect(201);

			expect(response.body).toHaveProperty('id');
			expect(response.body.description).toBe('Test task');
			expect(response.body.teacher_id).toBe(teacherId);
			expect(response.body.status).toBe(TaskStatus.IN_PROGRESS);
			expect(response.body).toHaveProperty('color');
			expect(response.body).toHaveProperty('created_at');
			expect(response.body).toHaveProperty('updated_at');
		});

		it('should assign the first color to the first task', async () => {
			await cleanupTasks();

			const response = await request(app.getHttpServer())
				.post('/tasks')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ description: 'First task', teacher_id: teacherId })
				.expect(201);

			expect(response.body.color).toBe('bg-yellow-200');
		});

		it('should cycle colors across tasks', async () => {
			const colors: string[] = [];
			for (let i = 0; i < 7; i++) {
				const response = await request(app.getHttpServer())
					.post('/tasks')
					.set('Authorization', `Bearer ${adminToken}`)
					.send({ description: `Task ${i}`, teacher_id: teacherId })
					.expect(201);
				colors.push(response.body.color);
			}
			expect(colors[0]).toBe(colors[6]);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.post('/tasks')
				.send({ description: 'Test task', teacher_id: teacherId })
				.expect(401);
		});

		it('should return 401 for non-admin', async () => {
			await request(app.getHttpServer())
				.post('/tasks')
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({ description: 'Test task', teacher_id: teacherId })
				.expect(401);
		});

		it('should return 404 for non-existent teacher', async () => {
			await request(app.getHttpServer())
				.post('/tasks')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ description: 'Test task', teacher_id: 999999 })
				.expect(404);
		});

		it('should return 400 for invalid body', async () => {
			await request(app.getHttpServer())
				.post('/tasks')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ description: '', teacher_id: 'not-a-number' })
				.expect(400);
		});
	});

	describe('GET /tasks/my', () => {
		it('should return only tasks belonging to the authenticated teacher', async () => {
			await prisma.task.create({
				data: { description: 'My task', teacher_id: teacherId, color: 'bg-yellow-200' },
			});
			await prisma.task.create({
				data: { description: 'Other task', teacher_id: teacher2Id, color: 'bg-pink-200' },
			});

			const response = await request(app.getHttpServer())
				.get('/tasks/my')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			const descriptions = response.body.map((t: any) => t.description);
			expect(descriptions).toContain('My task');
			expect(descriptions).not.toContain('Other task');
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.get('/tasks/my')
				.expect(401);
		});
	});

	describe('GET /tasks/pending-count', () => {
		it('should return own in-progress count for non-admin teacher', async () => {
			await prisma.task.create({
				data: { description: 'In progress', teacher_id: teacherId, color: 'bg-yellow-200', status: TaskStatus.IN_PROGRESS },
			});
			await prisma.task.create({
				data: { description: 'Completed', teacher_id: teacherId, color: 'bg-pink-200', status: TaskStatus.COMPLETED },
			});

			const response = await request(app.getHttpServer())
				.get('/tasks/pending-count')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(response.body.count).toBe(1);
		});

		it('should return own in-progress plus other teachers on-approval for admin', async () => {
			await prisma.task.create({
				data: { description: 'Admin in progress', teacher_id: adminId, color: 'bg-yellow-200', status: TaskStatus.IN_PROGRESS },
			});
			await prisma.task.create({
				data: { description: 'Teacher on approval', teacher_id: teacherId, color: 'bg-pink-200', status: TaskStatus.ON_APPROVAL },
			});

			const response = await request(app.getHttpServer())
				.get('/tasks/pending-count')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(response.body.count).toBe(2);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.get('/tasks/pending-count')
				.expect(401);
		});
	});

	describe('GET /tasks/teachers/:teacherId', () => {
		it('should return tasks for specific teacher as admin', async () => {
			await prisma.task.create({
				data: { description: 'Teacher task', teacher_id: teacherId, color: 'bg-yellow-200' },
			});

			const response = await request(app.getHttpServer())
				.get(`/tasks/teachers/${teacherId}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.some((t: any) => t.description === 'Teacher task')).toBe(true);
		});

		it('should return 401 for non-admin', async () => {
			await request(app.getHttpServer())
				.get(`/tasks/teachers/${teacherId}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(401);
		});

		it('should return 404 for non-existent teacher', async () => {
			await request(app.getHttpServer())
				.get('/tasks/teachers/999999')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(404);
		});
	});

	describe('GET /tasks/:id', () => {
		it('should return task for the owning teacher', async () => {
			const task = await prisma.task.create({
				data: { description: 'Task for me', teacher_id: teacherId, color: 'bg-yellow-200' },
			});

			const response = await request(app.getHttpServer())
				.get(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(200);

			expect(response.body.id).toBe(task.id);
			expect(response.body.description).toBe('Task for me');
		});

		it('should return task for admin regardless of owner', async () => {
			const task = await prisma.task.create({
				data: { description: 'Teacher task', teacher_id: teacherId, color: 'bg-yellow-200' },
			});

			const response = await request(app.getHttpServer())
				.get(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(response.body.id).toBe(task.id);
		});

		it('should return 403 for teacher accessing another teacher task', async () => {
			const task = await prisma.task.create({
				data: { description: 'Teacher2 task', teacher_id: teacher2Id, color: 'bg-yellow-200' },
			});

			await request(app.getHttpServer())
				.get(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(403);
		});

		it('should return 404 for non-existent task', async () => {
			await request(app.getHttpServer())
				.get('/tasks/00000000-0000-0000-0000-000000000000')
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(404);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.get('/tasks/some-id')
				.expect(401);
		});
	});

	describe('PATCH /tasks/:id', () => {
		it('should allow teacher to update own task status to ON_APPROVAL', async () => {
			const task = await prisma.task.create({
				data: { description: 'In progress', teacher_id: teacherId, color: 'bg-yellow-200', status: TaskStatus.IN_PROGRESS },
			});

			const response = await request(app.getHttpServer())
				.patch(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({ status: 'ON_APPROVAL' })
				.expect(200);

			expect(response.body.status).toBe('ON_APPROVAL');
		});

		it('should return 403 for teacher trying to update description', async () => {
			const task = await prisma.task.create({
				data: { description: 'In progress', teacher_id: teacherId, color: 'bg-yellow-200', status: TaskStatus.IN_PROGRESS },
			});

			await request(app.getHttpServer())
				.patch(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({ description: 'New description' })
				.expect(403);
		});

		it('should return 403 for teacher accessing another teacher task', async () => {
			const task = await prisma.task.create({
				data: { description: 'Teacher2 task', teacher_id: teacher2Id, color: 'bg-yellow-200', status: TaskStatus.IN_PROGRESS },
			});

			await request(app.getHttpServer())
				.patch(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({ status: 'ON_APPROVAL' })
				.expect(403);
		});

		it('should return 400 for teacher trying to set status to COMPLETED', async () => {
			const task = await prisma.task.create({
				data: { description: 'In progress', teacher_id: teacherId, color: 'bg-yellow-200', status: TaskStatus.IN_PROGRESS },
			});

			await request(app.getHttpServer())
				.patch(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.send({ status: 'COMPLETED' })
				.expect(400);
		});

		it('should allow admin to update description and status', async () => {
			const task = await prisma.task.create({
				data: { description: 'Original', teacher_id: teacherId, color: 'bg-yellow-200', status: TaskStatus.IN_PROGRESS },
			});

			const response = await request(app.getHttpServer())
				.patch(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ description: 'Updated', status: 'COMPLETED' })
				.expect(200);

			expect(response.body.description).toBe('Updated');
			expect(response.body.status).toBe('COMPLETED');
		});

		it('should allow admin to reassign task to another teacher', async () => {
			const task = await prisma.task.create({
				data: { description: 'Task', teacher_id: teacherId, color: 'bg-yellow-200' },
			});

			const response = await request(app.getHttpServer())
				.patch(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ teacher_id: teacher2Id })
				.expect(200);

			expect(response.body.teacher_id).toBe(teacher2Id);
		});

		it('should return 404 for non-existent task', async () => {
			await request(app.getHttpServer())
				.patch('/tasks/00000000-0000-0000-0000-000000000000')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ description: 'Updated' })
				.expect(404);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.patch('/tasks/some-id')
				.send({ status: 'ON_APPROVAL' })
				.expect(401);
		});
	});

	describe('DELETE /tasks/:id', () => {
		it('should delete task as admin and return 204', async () => {
			const task = await prisma.task.create({
				data: { description: 'To be deleted', teacher_id: teacherId, color: 'bg-yellow-200' },
			});

			await request(app.getHttpServer())
				.delete(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(204);

			const deletedTask = await prisma.task.findUnique({ where: { id: task.id } });
			expect(deletedTask).toBeNull();
		});

		it('should return 401 for non-admin', async () => {
			const task = await prisma.task.create({
				data: { description: 'Task', teacher_id: teacherId, color: 'bg-yellow-200' },
			});

			await request(app.getHttpServer())
				.delete(`/tasks/${task.id}`)
				.set('Authorization', `Bearer ${teacherToken}`)
				.expect(401);
		});

		it('should return 404 for non-existent task', async () => {
			await request(app.getHttpServer())
				.delete('/tasks/00000000-0000-0000-0000-000000000000')
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(404);
		});

		it('should return 401 without token', async () => {
			await request(app.getHttpServer())
				.delete('/tasks/some-id')
				.expect(401);
		});
	});
});
