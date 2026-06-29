import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiNotFoundResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateTaskDto } from '@/modules/tasks/dto/requests/create-task.dto';
import { TaskDto } from '@/modules/tasks/dto/responses/task.dto';
import { BadRequestErrorResponse } from '@/shared/exceptions/simple-exception';

export const CreateTaskSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: 'Create a new task',
		}),
		ApiResponse({
			status: HttpStatus.CREATED,
			description: 'Task has been successfully created.',
			type: TaskDto,
		}),
		ApiBody({
			description: 'Task data',
			type: CreateTaskDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: 'Bad request',
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: 'Teacher not found',
		}),
	];

	return applyDecorators(...decorators);
};
