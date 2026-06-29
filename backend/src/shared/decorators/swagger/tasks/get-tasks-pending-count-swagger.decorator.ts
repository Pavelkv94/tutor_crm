import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TasksPendingCountDto } from '@/modules/tasks/dto/responses/tasks-pending-count.dto';

export const GetTasksPendingCountSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: 'Get pending tasks count for badge',
			description:
				'Returns count of own IN_PROGRESS tasks for a teacher. For admin, adds the sum of ON_APPROVAL tasks assigned to other teachers.',
		}),
		ApiResponse({
			status: HttpStatus.OK,
			description: 'Pending tasks count has been successfully retrieved.',
			type: TasksPendingCountDto,
		}),
		ApiBearerAuth(),
	];

	return applyDecorators(...decorators);
};
