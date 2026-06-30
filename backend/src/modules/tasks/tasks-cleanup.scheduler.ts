import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksRepositoryPort } from './ports/tasks.repository.port';

const COMPLETED_TASK_RETENTION_DAYS = 60;

@Injectable()
export class TasksCleanupScheduler {
	private readonly logger = new Logger(TasksCleanupScheduler.name);

	constructor(private readonly tasksRepository: TasksRepositoryPort) {}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async deleteOldCompletedTasks(): Promise<void> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - COMPLETED_TASK_RETENTION_DAYS);

		const deletedCount = await this.tasksRepository.deleteCompletedTasksOlderThan(cutoffDate);

		if (deletedCount > 0) {
			this.logger.log(`Deleted ${deletedCount} completed task(s) older than ${COMPLETED_TASK_RETENTION_DAYS} days`);
		}
	}
}
