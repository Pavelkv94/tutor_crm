import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
	ApiBadRequestResponse,
	ApiBearerAuth,
	ApiBody,
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOperation,
	ApiParam,
	ApiResponse,
} from '@nestjs/swagger';
import { UpdateTaskDto } from '@/modules/tasks/dto/requests/update-task.dto';
import { TaskDto } from '@/modules/tasks/dto/responses/task.dto';
import { BadRequestErrorResponse } from '@/shared/exceptions/simple-exception';

export const UpdateTaskSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: 'Update a task',
			description:
				'Admin can update description, assignee and status. Teacher can only change status from IN_PROGRESS to ON_APPROVAL for own tasks.',
		}),
		ApiParam({
			name: 'id',
			description: 'Task ID',
			type: String,
		}),
		ApiResponse({
			status: HttpStatus.OK,
			description: 'Task has been successfully updated.',
			type: TaskDto,
		}),
		ApiBody({
			description: 'Task update data',
			type: UpdateTaskDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: 'Bad request',
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: 'Task or teacher not found',
		}),
		ApiForbiddenResponse({
			description: 'Access denied',
		}),
	];

	return applyDecorators(...decorators);
};
