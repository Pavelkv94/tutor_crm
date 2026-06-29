import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskDto {
	@ApiProperty({ description: 'Описание задачи', example: 'Проверить домашнее задание' })
	@IsString()
	@IsNotEmpty()
	description: string;

	@ApiProperty({ description: 'ID исполнителя (учителя)', example: 1 })
	@IsInt()
	@IsNotEmpty()
	teacher_id: number;
}
