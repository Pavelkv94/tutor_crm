import { ApiProperty } from '@nestjs/swagger';

export class TaskCommentDto {
	@ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
	id: string;

	@ApiProperty({ example: 'Готово, проверьте пожалуйста' })
	comment: string;

	@ApiProperty({ example: '2026-06-29T12:00:00.000Z' })
	created_at: Date;

	@ApiProperty({ example: 'John Doe' })
	commenter_name: string;
}
