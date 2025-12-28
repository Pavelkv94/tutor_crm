import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { LessonOutputDto } from "src/modules/lesson/dto/lesson.output.dto";

export const GetLessonsForPeriodSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all lessons for a period for current teacher, or if current teacher is admin, get lessons by teacher ID in query or admin's lessons",
		}),
		ApiQuery({
			name: 'start_date',
			description: 'Start date',
			required: true,
			type: String,
		}),
		ApiQuery({
			name: 'end_date',
			description: 'End date',
			required: true,
			type: String,
		}),
		ApiQuery({
			name: 'teacher_id',
			description: 'Teacher ID',
			required: false,
			type: String,
		}),
		ApiOkResponse({
			description: `Lessons have been successfully retrieved`,
			type: [LessonOutputDto],
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
