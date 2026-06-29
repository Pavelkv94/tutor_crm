import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	MessageEvent,
	Param,
	Patch,
	Post,
	Sse,
	UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable, from, interval, merge } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { TasksEventsService } from './tasks-events.service';
import { JwtPayloadDto } from '@/modules/auth/dto/jwt.payload.dto';
import { ExtractTeacherFromRequest } from '@/shared/decorators/param/extract-teacher-from-request';
import { CreateTaskSwagger } from '@/shared/decorators/swagger/tasks/create-task-swagger.decorator';
import { DeleteTaskSwagger } from '@/shared/decorators/swagger/tasks/delete-task-swagger.decorator';
import { GetMyTasksSwagger } from '@/shared/decorators/swagger/tasks/get-my-tasks-swagger.decorator';
import { GetTasksPendingCountSwagger } from '@/shared/decorators/swagger/tasks/get-tasks-pending-count-swagger.decorator';
import { GetTaskByIdSwagger } from '@/shared/decorators/swagger/tasks/get-task-by-id-swagger.decorator';
import { GetTasksByTeacherSwagger } from '@/shared/decorators/swagger/tasks/get-tasks-by-teacher-swagger.decorator';
import { GetTeachersWithTaskCountsSwagger } from '@/shared/decorators/swagger/tasks/get-teachers-with-task-counts-swagger.decorator';
import { UpdateTaskSwagger } from '@/shared/decorators/swagger/tasks/update-task-swagger.decorator';
import { AdminAccessGuard } from '@/shared/guards/admin-access.guard';
import { JwtAccessGuard } from '@/shared/guards/jwt-access.guard';
import { CreateTaskDto } from './dto/requests/create-task.dto';
import { UpdateTaskDto } from './dto/requests/update-task.dto';
import { TaskDto } from './dto/responses/task.dto';
import { TasksPendingCountDto } from './dto/responses/tasks-pending-count.dto';
import { TeacherTasksSummaryDto } from './dto/responses/teacher-tasks-summary.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
	constructor(
		private readonly tasksService: TasksService,
		private readonly tasksEvents: TasksEventsService,
	) {}

	@GetTeachersWithTaskCountsSwagger()
	@Get('teachers')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async getTeachersWithTaskCounts(): Promise<TeacherTasksSummaryDto[]> {
		return await this.tasksService.getTeachersWithTaskCounts();
	}

	@GetMyTasksSwagger()
	@Get('my')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async getMyTasks(@ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<TaskDto[]> {
		return await this.tasksService.getMyTasks(teacher);
	}

	@GetTasksPendingCountSwagger()
	@Get('pending-count')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async getPendingTasksCount(
		@ExtractTeacherFromRequest() teacher: JwtPayloadDto,
	): Promise<TasksPendingCountDto> {
		return await this.tasksService.getPendingTasksCount(teacher);
	}

	@Sse('pending-count/stream')
	@UseGuards(JwtAccessGuard)
	getPendingTasksCountStream(
		@ExtractTeacherFromRequest() teacher: JwtPayloadDto,
	): Observable<MessageEvent> {
		const changes$ = merge(this.tasksEvents.stream$, interval(25000).pipe(map(() => null)));

		return changes$.pipe(
			startWith(undefined),
			switchMap(() => from(this.tasksService.getPendingTasksCount(teacher))),
			map((dto) => dto.count),
			distinctUntilChanged(),
			map((count) => ({ data: { count } }) as MessageEvent),
		);
	}

	@GetTasksByTeacherSwagger()
	@Get('teachers/:teacherId')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async getTasksByTeacherId(@Param('teacherId') teacherId: string): Promise<TaskDto[]> {
		return await this.tasksService.getTasksByTeacherId(+teacherId);
	}

	@GetTaskByIdSwagger()
	@Get(':id')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async getTaskById(
		@Param('id') id: string,
		@ExtractTeacherFromRequest() teacher: JwtPayloadDto,
	): Promise<TaskDto> {
		return await this.tasksService.getTaskById(id, teacher);
	}

	@CreateTaskSwagger()
	@Post()
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async createTask(@Body() createTaskDto: CreateTaskDto): Promise<TaskDto> {
		return await this.tasksService.createTask(createTaskDto);
	}

	@UpdateTaskSwagger()
	@Patch(':id')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async updateTask(
		@Param('id') id: string,
		@Body() updateTaskDto: UpdateTaskDto,
		@ExtractTeacherFromRequest() teacher: JwtPayloadDto,
	): Promise<TaskDto> {
		return await this.tasksService.updateTask(id, updateTaskDto, teacher);
	}

	@DeleteTaskSwagger()
	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async deleteTask(@Param('id') id: string): Promise<void> {
		await this.tasksService.deleteTask(id);
	}
}
