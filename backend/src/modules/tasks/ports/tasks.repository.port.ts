import { CreateTaskDto } from '../dto/requests/create-task.dto';
import { UpdateTaskDto } from '../dto/requests/update-task.dto';
import { TaskDto } from '../dto/responses/task.dto';
import { TeacherTasksSummaryDto } from '../dto/responses/teacher-tasks-summary.dto';
import { TaskStatusEnum } from '../dto/task-status.enum';

export abstract class TasksRepositoryPort {
	abstract getTeachersWithTaskCounts(): Promise<TeacherTasksSummaryDto[]>;
	abstract getTasksByTeacherId(teacherId: number): Promise<TaskDto[]>;
	abstract getTaskById(id: string): Promise<TaskDto | null>;
	abstract countTasksByTeacherAndStatus(teacherId: number, status: TaskStatusEnum): Promise<number>;
	abstract countTasksByStatusExcludingTeacher(status: TaskStatusEnum, excludeTeacherId: number): Promise<number>;
	abstract getTasksCount(): Promise<number>;
	abstract createTask(data: CreateTaskDto, color: string): Promise<TaskDto>;
	abstract updateTask(id: string, data: UpdateTaskDto): Promise<TaskDto | null>;
	abstract deleteTask(id: string): Promise<boolean>;
	abstract deleteCompletedTasksOlderThan(date: Date): Promise<number>;
}
