import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOperation,
	ApiParam,
	ApiResponse,
} from '@nestjs/swagger';
import { TaskDto } from '@/modules/tasks/dto/responses/task.dto';

export const GetTaskByIdSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: 'Get a task by ID',
		}),
		ApiParam({
			name: 'id',
			description: 'Task ID',
			type: String,
		}),
		ApiResponse({
			status: HttpStatus.OK,
			description: 'Task has been successfully retrieved.',
			type: TaskDto,
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: 'Task not found',
		}),
		ApiForbiddenResponse({
			description: 'Access denied',
		}),
	];

	return applyDecorators(...decorators);
};
