import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export const DeleteTaskSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: 'Delete a task',
		}),
		ApiParam({
			name: 'id',
			description: 'Task ID',
			type: String,
		}),
		ApiResponse({
			status: HttpStatus.NO_CONTENT,
			description: 'Task has been successfully deleted.',
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: 'Task not found',
		}),
	];

	return applyDecorators(...decorators);
};
