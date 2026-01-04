import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { LessonOutputDto } from "src/modules/lesson/dto/lesson.output.dto";

export const GetLessonsForRescheduleSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all rescheduled lessons for current teacher, or if current teacher is admin, get rescheduled lessons by teacher ID in query or admin's lessons",
		}),
		ApiQuery({
			name: 'teacher_id',
			description: 'Teacher ID',
			required: false,
			type: String,
		}),
		ApiOkResponse({
			description: `Rescheduled lessons have been successfully retrieved`,
			type: [LessonOutputDto],
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
