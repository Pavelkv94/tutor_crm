import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatusEnum } from '../task-status.enum';

export class TaskTeacherDto {
	@ApiProperty({ example: 1 })
	id: number;

	@ApiProperty({ example: 'John Doe' })
	name: string;
}

export class TaskDto {
	@ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
	id: string;

	@ApiProperty({ example: 'Проверить домашнее задание' })
	description: string;

	@ApiProperty({ enum: TaskStatusEnum })
	status: TaskStatusEnum;

	@ApiProperty({ example: 'bg-yellow-200' })
	color: string;

	@ApiProperty({ example: 1 })
	teacher_id: number;

	@ApiProperty({ example: '2026-06-29T12:00:00.000Z' })
	created_at: Date;

	@ApiProperty({ example: '2026-06-29T12:00:00.000Z' })
	updated_at: Date;

	@ApiPropertyOptional({ type: TaskTeacherDto })
	teacher?: TaskTeacherDto;
}
