import { Test, TestingModule } from '@nestjs/testing';
import { Subject } from 'rxjs';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';
import { CreateTaskDto } from '../../../src/modules/tasks/dto/requests/create-task.dto';
import { UpdateTaskDto } from '../../../src/modules/tasks/dto/requests/update-task.dto';
import { TaskDto } from '../../../src/modules/tasks/dto/responses/task.dto';
import { TaskStatusEnum } from '../../../src/modules/tasks/dto/task-status.enum';
import { TasksEventsService } from '../../../src/modules/tasks/tasks-events.service';
import { TasksController } from '../../../src/modules/tasks/tasks.controller';
import { TasksService } from '../../../src/modules/tasks/tasks.service';

describe('TasksController', () => {
	let controller: TasksController;
	let tasksService: TasksService;

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

	const teacher: JwtPayloadDto = {
		id: '1',
		login: 'teacher',
		name: 'Teacher',
		role: TeacherRoleEnum.TEACHER,
	};

	const mockTasksService = {
		getTeachersWithTaskCounts: jest.fn(),
		getMyTasks: jest.fn(),
		getPendingTasksCount: jest.fn(),
		getTasksByTeacherId: jest.fn(),
		getTaskById: jest.fn(),
		createTask: jest.fn(),
		updateTask: jest.fn(),
		deleteTask: jest.fn(),
	};

	const mockTasksEventsService = {
		stream$: new Subject<void>().asObservable(),
		emitChanged: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [TasksController],
			providers: [
				{ provide: TasksService, useValue: mockTasksService },
				{ provide: TasksEventsService, useValue: mockTasksEventsService },
			],
		}).compile();

		controller = module.get<TasksController>(TasksController);
		tasksService = module.get<TasksService>(TasksService);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('getTeachersWithTaskCounts', () => {
		it('should delegate to service', async () => {
			const summary = [{ id: 1, name: 'T', login: 'l', role: 'TEACHER', tasks_count: { IN_PROGRESS: 0, ON_APPROVAL: 0, COMPLETED: 0 } }];
			jest.spyOn(tasksService, 'getTeachersWithTaskCounts').mockResolvedValue(summary);

			const result = await controller.getTeachersWithTaskCounts();

			expect(result).toEqual(summary);
			expect(tasksService.getTeachersWithTaskCounts).toHaveBeenCalled();
		});
	});

	describe('getMyTasks', () => {
		it('should delegate to service with teacher payload', async () => {
			jest.spyOn(tasksService, 'getMyTasks').mockResolvedValue([mockTask]);

			const result = await controller.getMyTasks(teacher);

			expect(result).toEqual([mockTask]);
			expect(tasksService.getMyTasks).toHaveBeenCalledWith(teacher);
		});
	});

	describe('getPendingTasksCount', () => {
		it('should delegate to service with teacher payload', async () => {
			jest.spyOn(tasksService, 'getPendingTasksCount').mockResolvedValue({ count: 3 });

			const result = await controller.getPendingTasksCount(teacher);

			expect(result).toEqual({ count: 3 });
			expect(tasksService.getPendingTasksCount).toHaveBeenCalledWith(teacher);
		});
	});

	describe('getTasksByTeacherId', () => {
		it('should convert teacherId string to number and delegate to service', async () => {
			jest.spyOn(tasksService, 'getTasksByTeacherId').mockResolvedValue([mockTask]);

			const result = await controller.getTasksByTeacherId('1');

			expect(result).toEqual([mockTask]);
			expect(tasksService.getTasksByTeacherId).toHaveBeenCalledWith(1);
		});
	});

	describe('getTaskById', () => {
		it('should delegate to service with id and teacher payload', async () => {
			jest.spyOn(tasksService, 'getTaskById').mockResolvedValue(mockTask);

			const result = await controller.getTaskById('uuid-1', teacher);

			expect(result).toEqual(mockTask);
			expect(tasksService.getTaskById).toHaveBeenCalledWith('uuid-1', teacher);
		});
	});

	describe('createTask', () => {
		it('should delegate to service', async () => {
			const dto: CreateTaskDto = { description: 'New task', teacher_id: 1 };
			jest.spyOn(tasksService, 'createTask').mockResolvedValue(mockTask);

			const result = await controller.createTask(dto);

			expect(result).toEqual(mockTask);
			expect(tasksService.createTask).toHaveBeenCalledWith(dto);
		});
	});

	describe('updateTask', () => {
		it('should delegate to service with id, dto and teacher payload', async () => {
			const dto: UpdateTaskDto = { status: TaskStatusEnum.ON_APPROVAL };
			const updatedTask = { ...mockTask, status: TaskStatusEnum.ON_APPROVAL };
			jest.spyOn(tasksService, 'updateTask').mockResolvedValue(updatedTask);

			const result = await controller.updateTask('uuid-1', dto, teacher);

			expect(result).toEqual(updatedTask);
			expect(tasksService.updateTask).toHaveBeenCalledWith('uuid-1', dto, teacher);
		});
	});

	describe('deleteTask', () => {
		it('should delegate to service', async () => {
			jest.spyOn(tasksService, 'deleteTask').mockResolvedValue(undefined);

			await controller.deleteTask('uuid-1');

			expect(tasksService.deleteTask).toHaveBeenCalledWith('uuid-1');
		});
	});
});
