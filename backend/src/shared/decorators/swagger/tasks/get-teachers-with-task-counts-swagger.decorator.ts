import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TeacherTasksSummaryDto } from '@/modules/tasks/dto/responses/teacher-tasks-summary.dto';

export const GetTeachersWithTaskCountsSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: 'Get all active teachers with task counts by status',
		}),
		ApiResponse({
			status: HttpStatus.OK,
			description: 'Teachers with task counts have been successfully retrieved.',
			type: [TeacherTasksSummaryDto],
		}),
		ApiBearerAuth(),
	];

	return applyDecorators(...decorators);
};
