import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaskDto } from '@/modules/tasks/dto/responses/task.dto';

export const GetMyTasksSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: 'Get tasks assigned to the current user',
		}),
		ApiResponse({
			status: HttpStatus.OK,
			description: 'Tasks have been successfully retrieved.',
			type: [TaskDto],
		}),
		ApiBearerAuth(),
	];

	return applyDecorators(...decorators);
};
