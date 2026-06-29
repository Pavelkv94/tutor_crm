import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TaskStatusEnum } from '../task-status.enum';

export class UpdateTaskDto {
	@ApiPropertyOptional({ description: 'Описание задачи', example: 'Проверить домашнее задание' })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	description?: string;

	@ApiPropertyOptional({ description: 'ID исполнителя (учителя)', example: 1 })
	@IsOptional()
	@IsInt()
	teacher_id?: number;

	@ApiPropertyOptional({ enum: TaskStatusEnum, description: 'Статус задачи' })
	@IsOptional()
	@IsEnum(TaskStatusEnum)
	status?: TaskStatusEnum;
}
