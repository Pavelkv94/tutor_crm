import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { LessonOutputDto } from "src/modules/lesson/dto/lesson.output.dto";

export const GetAssignedLessonsSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all assigned lessons for a date for current teacher",
		}),
		ApiQuery({
			name: 'start_date',
			description: 'Start date',
			required: true,
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
