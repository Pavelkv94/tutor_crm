import { Test, TestingModule } from '@nestjs/testing';
import { TasksCleanupScheduler } from '../../../src/modules/tasks/tasks-cleanup.scheduler';
import { TasksRepositoryPort } from '../../../src/modules/tasks/ports/tasks.repository.port';

describe('TasksCleanupScheduler', () => {
	let scheduler: TasksCleanupScheduler;
	let tasksRepository: TasksRepositoryPort;

	const mockTasksRepository = {
		deleteCompletedTasksOlderThan: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TasksCleanupScheduler,
				{ provide: TasksRepositoryPort, useValue: mockTasksRepository },
			],
		}).compile();

		scheduler = module.get<TasksCleanupScheduler>(TasksCleanupScheduler);
		tasksRepository = module.get<TasksRepositoryPort>(TasksRepositoryPort);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(scheduler).toBeDefined();
	});

	describe('deleteOldCompletedTasks', () => {
		it('should call repository with cutoff date 60 days in the past', async () => {
			jest.spyOn(tasksRepository, 'deleteCompletedTasksOlderThan').mockResolvedValue(0);

			await scheduler.deleteOldCompletedTasks();

			expect(tasksRepository.deleteCompletedTasksOlderThan).toHaveBeenCalledTimes(1);

			const callArg: Date = (tasksRepository.deleteCompletedTasksOlderThan as jest.Mock).mock.calls[0][0];
			expect(callArg).toBeInstanceOf(Date);

			const expectedCutoff = new Date();
			expectedCutoff.setDate(expectedCutoff.getDate() - 60);
			expect(Math.abs(callArg.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
		});

		it('should log when tasks are deleted', async () => {
			jest.spyOn(tasksRepository, 'deleteCompletedTasksOlderThan').mockResolvedValue(5);
			const logSpy = jest.spyOn((scheduler as any).logger, 'log').mockImplementation();

			await scheduler.deleteOldCompletedTasks();

			expect(logSpy).toHaveBeenCalledTimes(1);
			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('5'));
		});

		it('should not log when no tasks are deleted', async () => {
			jest.spyOn(tasksRepository, 'deleteCompletedTasksOlderThan').mockResolvedValue(0);
			const logSpy = jest.spyOn((scheduler as any).logger, 'log').mockImplementation();

			await scheduler.deleteOldCompletedTasks();

			expect(logSpy).not.toHaveBeenCalled();
		});
	});
});
