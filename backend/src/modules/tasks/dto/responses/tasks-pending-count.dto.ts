import { ApiProperty } from '@nestjs/swagger';

export class TasksPendingCountDto {
	@ApiProperty({
		description:
			'For teacher: count of own IN_PROGRESS tasks. For admin: own IN_PROGRESS tasks plus ON_APPROVAL tasks of other teachers.',
		example: 3,
	})
	count: number;
}
