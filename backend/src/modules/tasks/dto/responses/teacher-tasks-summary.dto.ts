import { ApiProperty } from '@nestjs/swagger';

export class TaskStatusCountDto {
	@ApiProperty({ example: 2 })
	IN_PROGRESS: number;

	@ApiProperty({ example: 1 })
	ON_APPROVAL: number;

	@ApiProperty({ example: 3 })
	COMPLETED: number;
}

export class TeacherTasksSummaryDto {
	@ApiProperty({ example: 1 })
	id: number;

	@ApiProperty({ example: 'John Doe' })
	name: string;

	@ApiProperty({ example: 'john.doe' })
	login: string;

	@ApiProperty({ example: 'TEACHER' })
	role: string;

	@ApiProperty({ type: TaskStatusCountDto })
	tasks_count: TaskStatusCountDto;
}
