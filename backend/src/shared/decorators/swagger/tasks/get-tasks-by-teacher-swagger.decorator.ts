import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { TaskDto } from '@/modules/tasks/dto/responses/task.dto';

export const GetTasksByTeacherSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: 'Get tasks assigned to a specific teacher',
		}),
		ApiParam({
			name: 'teacherId',
			description: 'Teacher ID',
			type: Number,
		}),
		ApiResponse({
			status: HttpStatus.OK,
			description: 'Tasks have been successfully retrieved.',
			type: [TaskDto],
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: 'Teacher not found',
		}),
	];

	return applyDecorators(...decorators);
};
