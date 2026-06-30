import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Task, TaskStatus, Teacher } from '@/infrastructure/prisma/generated/client';
import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/requests/create-task.dto';
import { UpdateTaskDto } from './dto/requests/update-task.dto';
import { TaskDto } from './dto/responses/task.dto';
import { TaskStatusCountDto, TeacherTasksSummaryDto } from './dto/responses/teacher-tasks-summary.dto';
import { TaskStatusEnum } from './dto/task-status.enum';
import { TasksRepositoryPort } from './ports/tasks.repository.port';

type TaskWithTeacher = Task & {
	teacher: Pick<Teacher, 'id' | 'name'> | null;
};

const TASK_STATUS_SORT_ORDER: Record<TaskStatusEnum, number> = {
	[TaskStatusEnum.IN_PROGRESS]: 0,
	[TaskStatusEnum.ON_APPROVAL]: 1,
	[TaskStatusEnum.COMPLETED]: 2,
};

@Injectable()
export class TasksRepository implements TasksRepositoryPort {
	constructor(private readonly prisma: PrismaService) {}

	async getTeachersWithTaskCounts(): Promise<TeacherTasksSummaryDto[]> {
		const teachers = await this.prisma.teacher.findMany({
			where: { deleted_at: null },
			select: {
				id: true,
				name: true,
				login: true,
				role: true,
			},
			orderBy: [{ role: 'desc' }, { name: 'asc' }],
		});

		const groupedCounts = await this.prisma.task.groupBy({
			by: ['teacher_id', 'status'],
			_count: { id: true },
		});

		const countsByTeacher = new Map<number, TaskStatusCountDto>();

		for (const teacher of teachers) {
			countsByTeacher.set(teacher.id, {
				IN_PROGRESS: 0,
				ON_APPROVAL: 0,
				COMPLETED: 0,
			});
		}

		for (const row of groupedCounts) {
			const counts = countsByTeacher.get(row.teacher_id);
			if (!counts) {
				continue;
			}
			counts[row.status as keyof TaskStatusCountDto] = row._count.id;
		}

		return teachers.map((teacher) => ({
			id: teacher.id,
			name: teacher.name,
			login: teacher.login,
			role: teacher.role,
			tasks_count: countsByTeacher.get(teacher.id) ?? {
				IN_PROGRESS: 0,
				ON_APPROVAL: 0,
				COMPLETED: 0,
			},
		}));
	}

	async getTasksByTeacherId(teacherId: number): Promise<TaskDto[]> {
		const tasks = await this.prisma.task.findMany({
			where: { teacher_id: teacherId },
			include: {
				teacher: {
					select: { id: true, name: true },
				},
			},
		});

		return this.sortTasks(tasks.map((task) => this.mapTaskToDto(task)));
	}

	async getTaskById(id: string): Promise<TaskDto | null> {
		const task = await this.prisma.task.findUnique({
			where: { id },
			include: {
				teacher: {
					select: { id: true, name: true },
				},
			},
		});

		if (!task) {
			return null;
		}

		return this.mapTaskToDto(task);
	}

	async countTasksByTeacherAndStatus(teacherId: number, status: TaskStatusEnum): Promise<number> {
		return await this.prisma.task.count({
			where: {
				teacher_id: teacherId,
				status: status as TaskStatus,
			},
		});
	}

	async countTasksByStatusExcludingTeacher(
		status: TaskStatusEnum,
		excludeTeacherId: number,
	): Promise<number> {
		return await this.prisma.task.count({
			where: {
				status: status as TaskStatus,
				teacher_id: { not: excludeTeacherId },
			},
		});
	}

	async getTasksCount(): Promise<number> {
		return await this.prisma.task.count();
	}

	async createTask(data: CreateTaskDto, color: string): Promise<TaskDto> {
		const task = await this.prisma.task.create({
			data: {
				description: data.description,
				teacher_id: data.teacher_id,
				color,
			},
			include: {
				teacher: {
					select: { id: true, name: true },
				},
			},
		});

		return this.mapTaskToDto(task);
	}

	async updateTask(id: string, data: UpdateTaskDto): Promise<TaskDto | null> {
		const existingTask = await this.prisma.task.findUnique({ where: { id } });
		if (!existingTask) {
			return null;
		}

		const task = await this.prisma.task.update({
			where: { id },
			data: {
				...(data.description !== undefined && { description: data.description }),
				...(data.teacher_id !== undefined && { teacher_id: data.teacher_id }),
				...(data.status !== undefined && { status: data.status as TaskStatus }),
			},
			include: {
				teacher: {
					select: { id: true, name: true },
				},
			},
		});

		return this.mapTaskToDto(task);
	}

	async deleteTask(id: string): Promise<boolean> {
		const existingTask = await this.prisma.task.findUnique({ where: { id } });
		if (!existingTask) {
			return false;
		}

		await this.prisma.task.delete({ where: { id } });
		return true;
	}

	private sortTasks(tasks: TaskDto[]): TaskDto[] {
		return [...tasks].sort((firstTask, secondTask) => {
			const statusOrderDiff =
				TASK_STATUS_SORT_ORDER[firstTask.status] - TASK_STATUS_SORT_ORDER[secondTask.status];

			if (statusOrderDiff !== 0) {
				return statusOrderDiff;
			}

			return secondTask.updated_at.getTime() - firstTask.updated_at.getTime();
		});
	}

	private mapTaskToDto(task: TaskWithTeacher): TaskDto {
		return {
			id: task.id,
			description: task.description,
			status: task.status as TaskStatusEnum,
			color: task.color,
			teacher_id: task.teacher_id,
			created_at: task.created_at,
			updated_at: task.updated_at,
			teacher: task.teacher
				? {
						id: task.teacher.id,
						name: task.teacher.name,
					}
				: undefined,
		};
	}
}
