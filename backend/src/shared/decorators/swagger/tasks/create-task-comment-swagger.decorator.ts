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
import { CreateTaskCommentDto } from '@/modules/tasks/dto/requests/create-task-comment.dto';
import { TaskCommentDto } from '@/modules/tasks/dto/responses/task-comment.dto';
import { BadRequestErrorResponse } from '@/shared/exceptions/simple-exception';

export const CreateTaskCommentSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: 'Add a comment to a task',
		}),
		ApiParam({
			name: 'id',
			description: 'Task ID',
			type: String,
		}),
		ApiBody({
			description: 'Comment data',
			type: CreateTaskCommentDto,
		}),
		ApiResponse({
			status: HttpStatus.CREATED,
			description: 'Comment has been successfully created.',
			type: TaskCommentDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: 'Bad request',
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: 'Task not found',
		}),
		ApiForbiddenResponse({
			description: 'Access denied',
		}),
	];

	return applyDecorators(...decorators);
};
