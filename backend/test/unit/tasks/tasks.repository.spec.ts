import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '../../../src/infrastructure/prisma/generated/client';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';
import { CreateTaskDto } from '../../../src/modules/tasks/dto/requests/create-task.dto';
import { TaskStatusEnum } from '../../../src/modules/tasks/dto/task-status.enum';
import { TasksRepository } from '../../../src/modules/tasks/tasks.repository';

describe('TasksRepository', () => {
	let repository: TasksRepository;
	let prisma: PrismaService;

	const now = new Date();

	const mockPrismaTask = {
		id: 'uuid-1',
		description: 'Test task',
		status: TaskStatus.IN_PROGRESS,
		color: 'bg-yellow-200',
		teacher_id: 1,
		created_at: now,
		updated_at: now,
		teacher: { id: 1, name: 'John Doe' },
	};

	const expectedTaskDto = {
		id: 'uuid-1',
		description: 'Test task',
		status: TaskStatusEnum.IN_PROGRESS,
		color: 'bg-yellow-200',
		teacher_id: 1,
		created_at: now,
		updated_at: now,
		teacher: { id: 1, name: 'John Doe' },
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TasksRepository,
				{
					provide: PrismaService,
					useValue: {
						teacher: {
							findMany: jest.fn(),
						},
						task: {
							findMany: jest.fn(),
							findUnique: jest.fn(),
							count: jest.fn(),
							groupBy: jest.fn(),
							create: jest.fn(),
							update: jest.fn(),
							delete: jest.fn(),
							deleteMany: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<TasksRepository>(TasksRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('getTeachersWithTaskCounts', () => {
		it('should return teachers with aggregated task status counts', async () => {
			const mockTeachers = [{ id: 1, name: 'Teacher', login: 'teacher', role: 'TEACHER' }];
			const mockGroupedCounts = [
				{ teacher_id: 1, status: 'IN_PROGRESS', _count: { id: 2 } },
				{ teacher_id: 1, status: 'COMPLETED', _count: { id: 3 } },
			];
			jest.spyOn(prisma.teacher, 'findMany').mockResolvedValue(mockTeachers as any);
			jest.spyOn(prisma.task, 'groupBy').mockResolvedValue(mockGroupedCounts as any);

			const result = await repository.getTeachersWithTaskCounts();

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(1);
			expect(result[0].name).toBe('Teacher');
			expect(result[0].tasks_count.IN_PROGRESS).toBe(2);
			expect(result[0].tasks_count.COMPLETED).toBe(3);
			expect(result[0].tasks_count.ON_APPROVAL).toBe(0);
		});

		it('should return empty array when no teachers', async () => {
			jest.spyOn(prisma.teacher, 'findMany').mockResolvedValue([]);
			jest.spyOn(prisma.task, 'groupBy').mockResolvedValue([]);

			const result = await repository.getTeachersWithTaskCounts();

			expect(result).toEqual([]);
		});

		it('should ignore task counts for teachers not in the result', async () => {
			const mockTeachers = [{ id: 1, name: 'Teacher', login: 'teacher', role: 'TEACHER' }];
			const mockGroupedCounts = [
				{ teacher_id: 999, status: 'IN_PROGRESS', _count: { id: 10 } },
			];
			jest.spyOn(prisma.teacher, 'findMany').mockResolvedValue(mockTeachers as any);
			jest.spyOn(prisma.task, 'groupBy').mockResolvedValue(mockGroupedCounts as any);

			const result = await repository.getTeachersWithTaskCounts();

			expect(result[0].tasks_count.IN_PROGRESS).toBe(0);
		});
	});

	describe('getTasksByTeacherId', () => {
		it('should return tasks mapped to DTOs', async () => {
			jest.spyOn(prisma.task, 'findMany').mockResolvedValue([mockPrismaTask] as any);

			const result = await repository.getTasksByTeacherId(1);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(expectedTaskDto);
		});

		it('should sort IN_PROGRESS tasks before COMPLETED', async () => {
			const oldDate = new Date('2026-01-01');
			const newDate = new Date('2026-06-01');
			const inProgressTask = { ...mockPrismaTask, id: 'uuid-1', status: TaskStatus.IN_PROGRESS, updated_at: oldDate };
			const completedTask = { ...mockPrismaTask, id: 'uuid-2', status: TaskStatus.COMPLETED, updated_at: newDate };
			jest.spyOn(prisma.task, 'findMany').mockResolvedValue([completedTask, inProgressTask] as any);

			const result = await repository.getTasksByTeacherId(1);

			expect(result[0].status).toBe(TaskStatusEnum.IN_PROGRESS);
			expect(result[1].status).toBe(TaskStatusEnum.COMPLETED);
		});

		it('should sort more recently updated tasks first within same status', async () => {
			const olderTask = { ...mockPrismaTask, id: 'uuid-1', status: TaskStatus.IN_PROGRESS, updated_at: new Date('2026-01-01') };
			const newerTask = { ...mockPrismaTask, id: 'uuid-2', status: TaskStatus.IN_PROGRESS, updated_at: new Date('2026-06-01') };
			jest.spyOn(prisma.task, 'findMany').mockResolvedValue([olderTask, newerTask] as any);

			const result = await repository.getTasksByTeacherId(1);

			expect(result[0].id).toBe('uuid-2');
			expect(result[1].id).toBe('uuid-1');
		});

		it('should return empty array when teacher has no tasks', async () => {
			jest.spyOn(prisma.task, 'findMany').mockResolvedValue([]);

			const result = await repository.getTasksByTeacherId(1);

			expect(result).toEqual([]);
		});
	});

	describe('getTaskById', () => {
		it('should return task DTO when found', async () => {
			jest.spyOn(prisma.task, 'findUnique').mockResolvedValue(mockPrismaTask as any);

			const result = await repository.getTaskById('uuid-1');

			expect(result).toEqual(expectedTaskDto);
		});

		it('should return null when task not found', async () => {
			jest.spyOn(prisma.task, 'findUnique').mockResolvedValue(null);

			const result = await repository.getTaskById('nonexistent');

			expect(result).toBeNull();
		});

		it('should map teacher to undefined when null', async () => {
			const taskWithoutTeacher = { ...mockPrismaTask, teacher: null };
			jest.spyOn(prisma.task, 'findUnique').mockResolvedValue(taskWithoutTeacher as any);

			const result = await repository.getTaskById('uuid-1');

			expect(result?.teacher).toBeUndefined();
		});
	});

	describe('countTasksByTeacherAndStatus', () => {
		it('should count tasks by teacher and status', async () => {
			jest.spyOn(prisma.task, 'count').mockResolvedValue(5);

			const result = await repository.countTasksByTeacherAndStatus(1, TaskStatusEnum.IN_PROGRESS);

			expect(result).toBe(5);
			expect(prisma.task.count).toHaveBeenCalledWith({
				where: { teacher_id: 1, status: TaskStatus.IN_PROGRESS },
			});
		});
	});

	describe('countTasksByStatusExcludingTeacher', () => {
		it('should count tasks with given status excluding teacher', async () => {
			jest.spyOn(prisma.task, 'count').mockResolvedValue(3);

			const result = await repository.countTasksByStatusExcludingTeacher(TaskStatusEnum.ON_APPROVAL, 1);

			expect(result).toBe(3);
			expect(prisma.task.count).toHaveBeenCalledWith({
				where: { status: TaskStatus.ON_APPROVAL, teacher_id: { not: 1 } },
			});
		});
	});

	describe('getTasksCount', () => {
		it('should return total number of tasks', async () => {
			jest.spyOn(prisma.task, 'count').mockResolvedValue(42);

			const result = await repository.getTasksCount();

			expect(result).toBe(42);
			expect(prisma.task.count).toHaveBeenCalled();
		});
	});

	describe('createTask', () => {
		it('should create task and return DTO', async () => {
			const dto: CreateTaskDto = { description: 'New task', teacher_id: 1 };
			jest.spyOn(prisma.task, 'create').mockResolvedValue(mockPrismaTask as any);

			const result = await repository.createTask(dto, 'bg-yellow-200');

			expect(result).toEqual(expectedTaskDto);
			expect(prisma.task.create).toHaveBeenCalledWith({
				data: { description: dto.description, teacher_id: dto.teacher_id, color: 'bg-yellow-200' },
				include: { teacher: { select: { id: true, name: true } } },
			});
		});
	});

	describe('updateTask', () => {
		it('should return null when task does not exist', async () => {
			jest.spyOn(prisma.task, 'findUnique').mockResolvedValue(null);

			const result = await repository.updateTask('nonexistent', { description: 'Updated' });

			expect(result).toBeNull();
			expect(prisma.task.update).not.toHaveBeenCalled();
		});

		it('should update and return updated task DTO', async () => {
			const updatedPrismaTask = { ...mockPrismaTask, description: 'Updated' };
			jest.spyOn(prisma.task, 'findUnique').mockResolvedValue(mockPrismaTask as any);
			jest.spyOn(prisma.task, 'update').mockResolvedValue(updatedPrismaTask as any);

			const result = await repository.updateTask('uuid-1', { description: 'Updated' });

			expect(result?.description).toBe('Updated');
		});

		it('should only set fields that are provided', async () => {
			jest.spyOn(prisma.task, 'findUnique').mockResolvedValue(mockPrismaTask as any);
			jest.spyOn(prisma.task, 'update').mockResolvedValue({ ...mockPrismaTask, status: TaskStatus.ON_APPROVAL } as any);

			await repository.updateTask('uuid-1', { status: TaskStatusEnum.ON_APPROVAL });

			expect(prisma.task.update).toHaveBeenCalledWith(
				expect.objectContaining({ data: { status: TaskStatus.ON_APPROVAL } }),
			);
		});

		it('should not include undefined fields in the update data', async () => {
			jest.spyOn(prisma.task, 'findUnique').mockResolvedValue(mockPrismaTask as any);
			jest.spyOn(prisma.task, 'update').mockResolvedValue(mockPrismaTask as any);

			await repository.updateTask('uuid-1', { description: undefined, status: undefined, teacher_id: undefined });

			expect(prisma.task.update).toHaveBeenCalledWith(
				expect.objectContaining({ data: {} }),
			);
		});
	});

	describe('deleteTask', () => {
		it('should return false when task does not exist', async () => {
			jest.spyOn(prisma.task, 'findUnique').mockResolvedValue(null);

			const result = await repository.deleteTask('nonexistent');

			expect(result).toBe(false);
			expect(prisma.task.delete).not.toHaveBeenCalled();
		});

		it('should delete task and return true', async () => {
			jest.spyOn(prisma.task, 'findUnique').mockResolvedValue(mockPrismaTask as any);
			jest.spyOn(prisma.task, 'delete').mockResolvedValue(mockPrismaTask as any);

			const result = await repository.deleteTask('uuid-1');

			expect(result).toBe(true);
			expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
		});
	});

	describe('deleteCompletedTasksOlderThan', () => {
		it('should delete completed tasks older than given date and return count', async () => {
			jest.spyOn(prisma.task, 'deleteMany').mockResolvedValue({ count: 7 });
			const cutoffDate = new Date('2026-01-01');

			const result = await repository.deleteCompletedTasksOlderThan(cutoffDate);

			expect(result).toBe(7);
			expect(prisma.task.deleteMany).toHaveBeenCalledWith({
				where: { status: TaskStatus.COMPLETED, updated_at: { lte: cutoffDate } },
			});
		});

		it('should return 0 when no tasks match', async () => {
			jest.spyOn(prisma.task, 'deleteMany').mockResolvedValue({ count: 0 });

			const result = await repository.deleteCompletedTasksOlderThan(new Date());

			expect(result).toBe(0);
		});
	});
});
