import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherService } from '../../../src/modules/teacher/application/teacher.service';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';
import { TasksEventsService } from '../../../src/modules/tasks/tasks-events.service';
import { TasksService } from '../../../src/modules/tasks/tasks.service';
import { TaskStatusEnum } from '../../../src/modules/tasks/dto/task-status.enum';
import { TaskDto } from '../../../src/modules/tasks/dto/responses/task.dto';
import { TasksRepositoryPort } from '../../../src/modules/tasks/ports/tasks.repository.port';

describe('TasksService', () => {
	let service: TasksService;
	let tasksRepository: TasksRepositoryPort;
	let teacherService: TeacherService;
	let tasksEvents: TasksEventsService;

	const now = new Date();

	const mockTask: TaskDto = {
		id: 'uuid-1',
		description: 'Test task',
		status: TaskStatusEnum.IN_PROGRESS,
		color: 'bg-yellow-200',
		teacher_id: 1,
		created_at: now,
		updated_at: now,
		teacher: { id: 1, name: 'John Doe' },
	};

	const adminTeacher: JwtPayloadDto = {
		id: '99',
		login: 'admin',
		name: 'Admin',
		role: TeacherRoleEnum.ADMIN,
	};

	const regularTeacher: JwtPayloadDto = {
		id: '1',
		login: 'teacher',
		name: 'Teacher',
		role: TeacherRoleEnum.TEACHER,
	};

	const mockTeacherDto = {
		id: 1,
		name: 'John Doe',
		login: 'john.doe',
		role: TeacherRoleEnum.TEACHER,
		timezone: 'BY' as any,
		deleted_at: null,
		created_at: now,
		telegrams: [],
	};

	const mockTasksRepository = {
		getTeachersWithTaskCounts: jest.fn(),
		getTasksByTeacherId: jest.fn(),
		getTaskById: jest.fn(),
		countTasksByTeacherAndStatus: jest.fn(),
		countTasksByStatusExcludingTeacher: jest.fn(),
		getTasksCount: jest.fn(),
		createTask: jest.fn(),
		updateTask: jest.fn(),
		deleteTask: jest.fn(),
		deleteCompletedTasksOlderThan: jest.fn(),
	};

	const mockTeacherService = {
		getTeacherById: jest.fn(),
	};

	const mockTasksEvents = {
		emitChanged: jest.fn(),
		stream$: null,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TasksService,
				{ provide: TasksRepositoryPort, useValue: mockTasksRepository },
				{ provide: TeacherService, useValue: mockTeacherService },
				{ provide: TasksEventsService, useValue: mockTasksEvents },
			],
		}).compile();

		service = module.get<TasksService>(TasksService);
		tasksRepository = module.get<TasksRepositoryPort>(TasksRepositoryPort);
		teacherService = module.get<TeacherService>(TeacherService);
		tasksEvents = module.get<TasksEventsService>(TasksEventsService);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getTeachersWithTaskCounts', () => {
		it('should delegate to repository', async () => {
			const summary = [{ id: 1, name: 'Teacher', login: 'teacher', role: 'TEACHER', tasks_count: { IN_PROGRESS: 0, ON_APPROVAL: 0, COMPLETED: 0 } }];
			jest.spyOn(tasksRepository, 'getTeachersWithTaskCounts').mockResolvedValue(summary);

			const result = await service.getTeachersWithTaskCounts();

			expect(result).toEqual(summary);
			expect(tasksRepository.getTeachersWithTaskCounts).toHaveBeenCalled();
		});
	});

	describe('getMyTasks', () => {
		it('should return tasks for the current teacher by numeric id', async () => {
			jest.spyOn(tasksRepository, 'getTasksByTeacherId').mockResolvedValue([mockTask]);

			const result = await service.getMyTasks(regularTeacher);

			expect(result).toEqual([mockTask]);
			expect(tasksRepository.getTasksByTeacherId).toHaveBeenCalledWith(1);
		});
	});

	describe('getPendingTasksCount', () => {
		it('should return own in-progress count for non-admin teacher', async () => {
			jest.spyOn(tasksRepository, 'countTasksByTeacherAndStatus').mockResolvedValue(3);

			const result = await service.getPendingTasksCount(regularTeacher);

			expect(result).toEqual({ count: 3 });
			expect(tasksRepository.countTasksByTeacherAndStatus).toHaveBeenCalledWith(1, TaskStatusEnum.IN_PROGRESS);
			expect(tasksRepository.countTasksByStatusExcludingTeacher).not.toHaveBeenCalled();
		});

		it('should return own in-progress plus other teachers on-approval count for admin', async () => {
			jest.spyOn(tasksRepository, 'countTasksByTeacherAndStatus').mockResolvedValue(2);
			jest.spyOn(tasksRepository, 'countTasksByStatusExcludingTeacher').mockResolvedValue(5);

			const result = await service.getPendingTasksCount(adminTeacher);

			expect(result).toEqual({ count: 7 });
			expect(tasksRepository.countTasksByTeacherAndStatus).toHaveBeenCalledWith(99, TaskStatusEnum.IN_PROGRESS);
			expect(tasksRepository.countTasksByStatusExcludingTeacher).toHaveBeenCalledWith(TaskStatusEnum.ON_APPROVAL, 99);
		});

		it('should return zero when admin has no tasks', async () => {
			jest.spyOn(tasksRepository, 'countTasksByTeacherAndStatus').mockResolvedValue(0);
			jest.spyOn(tasksRepository, 'countTasksByStatusExcludingTeacher').mockResolvedValue(0);

			const result = await service.getPendingTasksCount(adminTeacher);

			expect(result).toEqual({ count: 0 });
		});
	});

	describe('getTasksByTeacherId', () => {
		it('should return tasks when teacher exists and is not deleted', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacherDto as any);
			jest.spyOn(tasksRepository, 'getTasksByTeacherId').mockResolvedValue([mockTask]);

			const result = await service.getTasksByTeacherId(1);

			expect(result).toEqual([mockTask]);
			expect(tasksRepository.getTasksByTeacherId).toHaveBeenCalledWith(1);
		});

		it('should throw NotFoundException if teacher is not found', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(null);

			await expect(service.getTasksByTeacherId(999)).rejects.toThrow(NotFoundException);
			await expect(service.getTasksByTeacherId(999)).rejects.toThrow('Преподаватель не найден');
		});

		it('should throw NotFoundException if teacher is deleted', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue({ ...mockTeacherDto, deleted_at: now } as any);

			await expect(service.getTasksByTeacherId(1)).rejects.toThrow(NotFoundException);
			await expect(service.getTasksByTeacherId(1)).rejects.toThrow('Преподаватель не найден');
		});
	});

	describe('getTaskById', () => {
		it('should throw NotFoundException if task does not exist', async () => {
			jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(null);

			await expect(service.getTaskById('uuid-1', regularTeacher)).rejects.toThrow(NotFoundException);
			await expect(service.getTaskById('uuid-1', regularTeacher)).rejects.toThrow('Задача не найдена');
		});

		it('should return task for admin regardless of ownership', async () => {
			const otherTeachersTask = { ...mockTask, teacher_id: 2 };
			jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(otherTeachersTask);

			const result = await service.getTaskById('uuid-1', adminTeacher);

			expect(result).toEqual(otherTeachersTask);
		});

		it('should return task when teacher owns it', async () => {
			jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);

			const result = await service.getTaskById('uuid-1', regularTeacher);

			expect(result).toEqual(mockTask);
		});

		it('should throw ForbiddenException when non-admin accesses another teacher task', async () => {
			const otherTeachersTask = { ...mockTask, teacher_id: 2 };
			jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(otherTeachersTask);

			await expect(service.getTaskById('uuid-1', regularTeacher)).rejects.toThrow(ForbiddenException);
			await expect(service.getTaskById('uuid-1', regularTeacher)).rejects.toThrow('Доступ запрещен');
		});
	});

	describe('createTask', () => {
		const createDto = { description: 'New task', teacher_id: 1 };

		it('should create task with color based on total task count', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacherDto as any);
			jest.spyOn(tasksRepository, 'getTasksCount').mockResolvedValue(0);
			jest.spyOn(tasksRepository, 'createTask').mockResolvedValue(mockTask);

			const result = await service.createTask(createDto);

			expect(result).toEqual(mockTask);
			expect(tasksRepository.createTask).toHaveBeenCalledWith(createDto, 'bg-yellow-200');
			expect(tasksEvents.emitChanged).toHaveBeenCalled();
		});

		it('should pick second color when total count is 1', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacherDto as any);
			jest.spyOn(tasksRepository, 'getTasksCount').mockResolvedValue(1);
			jest.spyOn(tasksRepository, 'createTask').mockResolvedValue({ ...mockTask, color: 'bg-pink-200' });

			await service.createTask(createDto);

			expect(tasksRepository.createTask).toHaveBeenCalledWith(createDto, 'bg-pink-200');
		});

		it('should throw NotFoundException when teacher does not exist', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(null);

			await expect(service.createTask(createDto)).rejects.toThrow(NotFoundException);
			await expect(service.createTask(createDto)).rejects.toThrow('Преподаватель не найден');
			expect(tasksRepository.createTask).not.toHaveBeenCalled();
		});

		it('should throw NotFoundException when teacher is deleted', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue({ ...mockTeacherDto, deleted_at: now } as any);

			await expect(service.createTask(createDto)).rejects.toThrow(NotFoundException);
			expect(tasksRepository.createTask).not.toHaveBeenCalled();
		});

		it('should emit changed event after creation', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacherDto as any);
			jest.spyOn(tasksRepository, 'getTasksCount').mockResolvedValue(0);
			jest.spyOn(tasksRepository, 'createTask').mockResolvedValue(mockTask);

			await service.createTask(createDto);

			expect(tasksEvents.emitChanged).toHaveBeenCalledTimes(1);
		});
	});

	describe('updateTask', () => {
		it('should throw NotFoundException if task does not exist', async () => {
			jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(null);

			await expect(service.updateTask('uuid-1', { description: 'x' }, adminTeacher)).rejects.toThrow(NotFoundException);
			await expect(service.updateTask('uuid-1', { description: 'x' }, adminTeacher)).rejects.toThrow('Задача не найдена');
		});

		describe('as admin', () => {
			it('should update description successfully', async () => {
				const updatedTask = { ...mockTask, description: 'Updated' };
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);
				jest.spyOn(tasksRepository, 'updateTask').mockResolvedValue(updatedTask);

				const result = await service.updateTask('uuid-1', { description: 'Updated' }, adminTeacher);

				expect(result).toEqual(updatedTask);
				expect(tasksEvents.emitChanged).toHaveBeenCalled();
			});

			it('should validate teacher existence when teacher_id is provided', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);
				jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacherDto as any);
				jest.spyOn(tasksRepository, 'updateTask').mockResolvedValue({ ...mockTask, teacher_id: 2 });

				await service.updateTask('uuid-1', { teacher_id: 2 }, adminTeacher);

				expect(teacherService.getTeacherById).toHaveBeenCalledWith(2);
			});

			it('should throw NotFoundException when new teacher_id does not exist', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);
				jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(null);

				await expect(service.updateTask('uuid-1', { teacher_id: 999 }, adminTeacher)).rejects.toThrow(NotFoundException);
				await expect(service.updateTask('uuid-1', { teacher_id: 999 }, adminTeacher)).rejects.toThrow('Преподаватель не найден');
			});

			it('should throw BadRequestException when no fields are provided', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);

				await expect(service.updateTask('uuid-1', {}, adminTeacher)).rejects.toThrow(BadRequestException);
				await expect(service.updateTask('uuid-1', {}, adminTeacher)).rejects.toThrow('Не указаны поля для обновления');
			});

			it('should throw NotFoundException when update returns null', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);
				jest.spyOn(tasksRepository, 'updateTask').mockResolvedValue(null);

				await expect(service.updateTask('uuid-1', { description: 'Updated' }, adminTeacher)).rejects.toThrow(NotFoundException);
			});

			it('should skip teacher validation when teacher_id is not in dto', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);
				jest.spyOn(tasksRepository, 'updateTask').mockResolvedValue({ ...mockTask, status: TaskStatusEnum.COMPLETED });

				await service.updateTask('uuid-1', { status: TaskStatusEnum.COMPLETED }, adminTeacher);

				expect(teacherService.getTeacherById).not.toHaveBeenCalled();
			});
		});

		describe('as teacher', () => {
			it('should throw ForbiddenException when updating a task owned by another teacher', async () => {
				const otherTask = { ...mockTask, teacher_id: 2 };
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(otherTask);

				await expect(service.updateTask('uuid-1', { status: TaskStatusEnum.ON_APPROVAL }, regularTeacher)).rejects.toThrow(ForbiddenException);
				await expect(service.updateTask('uuid-1', { status: TaskStatusEnum.ON_APPROVAL }, regularTeacher)).rejects.toThrow('Доступ запрещен');
			});

			it('should throw ForbiddenException when trying to change description', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);

				await expect(service.updateTask('uuid-1', { description: 'New desc' }, regularTeacher)).rejects.toThrow(ForbiddenException);
				await expect(service.updateTask('uuid-1', { description: 'New desc' }, regularTeacher)).rejects.toThrow('Доступ запрещен');
			});

			it('should throw ForbiddenException when trying to change teacher_id', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);

				await expect(service.updateTask('uuid-1', { teacher_id: 2 }, regularTeacher)).rejects.toThrow(ForbiddenException);
				await expect(service.updateTask('uuid-1', { teacher_id: 2 }, regularTeacher)).rejects.toThrow('Доступ запрещен');
			});

			it('should throw BadRequestException when no status is provided', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);

				await expect(service.updateTask('uuid-1', {}, regularTeacher)).rejects.toThrow(BadRequestException);
				await expect(service.updateTask('uuid-1', {}, regularTeacher)).rejects.toThrow('Не указаны поля для обновления');
			});

			it('should throw BadRequestException when trying to set status other than ON_APPROVAL', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);

				await expect(service.updateTask('uuid-1', { status: TaskStatusEnum.COMPLETED }, regularTeacher)).rejects.toThrow(BadRequestException);
				await expect(service.updateTask('uuid-1', { status: TaskStatusEnum.COMPLETED }, regularTeacher)).rejects.toThrow('Можно изменить статус только на ON_APPROVAL');
			});

			it('should throw BadRequestException when task is not IN_PROGRESS', async () => {
				const onApprovalTask = { ...mockTask, status: TaskStatusEnum.ON_APPROVAL };
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(onApprovalTask);

				await expect(service.updateTask('uuid-1', { status: TaskStatusEnum.ON_APPROVAL }, regularTeacher)).rejects.toThrow(BadRequestException);
				await expect(service.updateTask('uuid-1', { status: TaskStatusEnum.ON_APPROVAL }, regularTeacher)).rejects.toThrow('Статус можно изменить только из IN_PROGRESS');
			});

			it('should update status to ON_APPROVAL for own in-progress task', async () => {
				const updatedTask = { ...mockTask, status: TaskStatusEnum.ON_APPROVAL };
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);
				jest.spyOn(tasksRepository, 'updateTask').mockResolvedValue(updatedTask);

				const result = await service.updateTask('uuid-1', { status: TaskStatusEnum.ON_APPROVAL }, regularTeacher);

				expect(result).toEqual(updatedTask);
				expect(tasksRepository.updateTask).toHaveBeenCalledWith('uuid-1', { status: TaskStatusEnum.ON_APPROVAL });
				expect(tasksEvents.emitChanged).toHaveBeenCalled();
			});

			it('should throw NotFoundException when update returns null', async () => {
				jest.spyOn(tasksRepository, 'getTaskById').mockResolvedValue(mockTask);
				jest.spyOn(tasksRepository, 'updateTask').mockResolvedValue(null);

				await expect(service.updateTask('uuid-1', { status: TaskStatusEnum.ON_APPROVAL }, regularTeacher)).rejects.toThrow(NotFoundException);
			});
		});
	});

	describe('deleteTask', () => {
		it('should delete task and emit changed event', async () => {
			jest.spyOn(tasksRepository, 'deleteTask').mockResolvedValue(true);

			await service.deleteTask('uuid-1');

			expect(tasksRepository.deleteTask).toHaveBeenCalledWith('uuid-1');
			expect(tasksEvents.emitChanged).toHaveBeenCalledTimes(1);
		});

		it('should throw NotFoundException when task does not exist', async () => {
			jest.spyOn(tasksRepository, 'deleteTask').mockResolvedValue(false);

			await expect(service.deleteTask('uuid-1')).rejects.toThrow(NotFoundException);
			await expect(service.deleteTask('uuid-1')).rejects.toThrow('Задача не найдена');
		});

		it('should not emit changed event when task is not found', async () => {
			jest.spyOn(tasksRepository, 'deleteTask').mockResolvedValue(false);

			await service.deleteTask('uuid-1').catch(() => {});

			expect(tasksEvents.emitChanged).not.toHaveBeenCalled();
		});
	});
});
