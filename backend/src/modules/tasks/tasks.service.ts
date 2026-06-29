import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { JwtPayloadDto } from '@/modules/auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '@/modules/teacher/interface/dto/teacherRole';
import { TeacherService } from '@/modules/teacher/application/teacher.service';
import { pickTaskColor } from './constants/task-colors.constant';
import { CreateTaskDto } from './dto/requests/create-task.dto';
import { UpdateTaskDto } from './dto/requests/update-task.dto';
import { TaskDto } from './dto/responses/task.dto';
import { TasksPendingCountDto } from './dto/responses/tasks-pending-count.dto';
import { TeacherTasksSummaryDto } from './dto/responses/teacher-tasks-summary.dto';
import { TaskStatusEnum } from './dto/task-status.enum';
import { TasksEventsService } from './tasks-events.service';
import { TasksRepositoryPort } from './ports/tasks.repository.port';

@Injectable()
export class TasksService {
	constructor(
		private readonly tasksRepository: TasksRepositoryPort,
		private readonly teacherService: TeacherService,
		private readonly tasksEvents: TasksEventsService,
	) {}

	async getTeachersWithTaskCounts(): Promise<TeacherTasksSummaryDto[]> {
		return await this.tasksRepository.getTeachersWithTaskCounts();
	}

	async getMyTasks(teacher: JwtPayloadDto): Promise<TaskDto[]> {
		return await this.tasksRepository.getTasksByTeacherId(+teacher.id);
	}

	async getPendingTasksCount(teacher: JwtPayloadDto): Promise<TasksPendingCountDto> {
		const ownInProgressCount = await this.tasksRepository.countTasksByTeacherAndStatus(
			+teacher.id,
			TaskStatusEnum.IN_PROGRESS,
		);

		if (teacher.role !== TeacherRoleEnum.ADMIN) {
			return { count: ownInProgressCount };
		}

		const otherTeachersOnApprovalCount =
			await this.tasksRepository.countTasksByStatusExcludingTeacher(
				TaskStatusEnum.ON_APPROVAL,
				+teacher.id,
			);

		return { count: ownInProgressCount + otherTeachersOnApprovalCount };
	}

	async getTasksByTeacherId(teacherId: number): Promise<TaskDto[]> {
		await this.ensureTeacherExists(teacherId);
		return await this.tasksRepository.getTasksByTeacherId(teacherId);
	}

	async getTaskById(id: string, teacher: JwtPayloadDto): Promise<TaskDto> {
		const task = await this.tasksRepository.getTaskById(id);
		if (!task) {
			throw new NotFoundException('Задача не найдена');
		}

		this.ensureTaskAccess(task, teacher);
		return task;
	}

	async createTask(createTaskDto: CreateTaskDto): Promise<TaskDto> {
		await this.ensureTeacherExists(createTaskDto.teacher_id);

		const totalTasksCount = await this.tasksRepository.getTasksCount();
		const color = pickTaskColor(totalTasksCount);

		const task = await this.tasksRepository.createTask(createTaskDto, color);
		this.tasksEvents.emitChanged();
		return task;
	}

	async updateTask(id: string, updateTaskDto: UpdateTaskDto, teacher: JwtPayloadDto): Promise<TaskDto> {
		const task = await this.tasksRepository.getTaskById(id);
		if (!task) {
			throw new NotFoundException('Задача не найдена');
		}

		let updatedTask: TaskDto;
		if (teacher.role === TeacherRoleEnum.ADMIN) {
			updatedTask = await this.updateTaskAsAdmin(task, updateTaskDto);
		} else {
			updatedTask = await this.updateTaskAsTeacher(task, updateTaskDto, teacher);
		}

		this.tasksEvents.emitChanged();
		return updatedTask;
	}

	async deleteTask(id: string): Promise<void> {
		const isDeleted = await this.tasksRepository.deleteTask(id);
		if (!isDeleted) {
			throw new NotFoundException('Задача не найдена');
		}
		this.tasksEvents.emitChanged();
	}

	private async updateTaskAsAdmin(task: TaskDto, updateTaskDto: UpdateTaskDto): Promise<TaskDto> {
		if (updateTaskDto.teacher_id !== undefined) {
			await this.ensureTeacherExists(updateTaskDto.teacher_id);
		}

		if (
			updateTaskDto.description === undefined &&
			updateTaskDto.teacher_id === undefined &&
			updateTaskDto.status === undefined
		) {
			throw new BadRequestException('Не указаны поля для обновления');
		}

		const updatedTask = await this.tasksRepository.updateTask(task.id, updateTaskDto);
		if (!updatedTask) {
			throw new NotFoundException('Задача не найдена');
		}

		return updatedTask;
	}

	private async updateTaskAsTeacher(
		task: TaskDto,
		updateTaskDto: UpdateTaskDto,
		teacher: JwtPayloadDto,
	): Promise<TaskDto> {
		if (task.teacher_id !== +teacher.id) {
			throw new ForbiddenException('Доступ запрещен');
		}

		if (updateTaskDto.description !== undefined || updateTaskDto.teacher_id !== undefined) {
			throw new ForbiddenException('Доступ запрещен');
		}

		if (updateTaskDto.status === undefined) {
			throw new BadRequestException('Не указаны поля для обновления');
		}

		if (updateTaskDto.status !== TaskStatusEnum.ON_APPROVAL) {
			throw new BadRequestException('Можно изменить статус только на ON_APPROVAL');
		}

		if (task.status !== TaskStatusEnum.IN_PROGRESS) {
			throw new BadRequestException('Статус можно изменить только из IN_PROGRESS');
		}

		const updatedTask = await this.tasksRepository.updateTask(task.id, {
			status: TaskStatusEnum.ON_APPROVAL,
		});
		if (!updatedTask) {
			throw new NotFoundException('Задача не найдена');
		}

		return updatedTask;
	}

	private ensureTaskAccess(task: TaskDto, teacher: JwtPayloadDto): void {
		if (teacher.role === TeacherRoleEnum.ADMIN) {
			return;
		}

		if (task.teacher_id !== +teacher.id) {
			throw new ForbiddenException('Доступ запрещен');
		}
	}

	private async ensureTeacherExists(teacherId: number): Promise<void> {
		const existingTeacher = await this.teacherService.getTeacherById(teacherId);
		if (!existingTeacher || existingTeacher.deleted_at) {
			throw new NotFoundException('Преподаватель не найден');
		}
	}
}
