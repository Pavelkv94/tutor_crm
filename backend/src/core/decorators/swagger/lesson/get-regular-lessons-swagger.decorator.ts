import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam } from "@nestjs/swagger";
import { RegularLessonOutputDto } from "src/modules/lesson/dto/regular-lesson.output.dto";

export const GetRegularLessonsSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all regular lessons for a student",
		}),
		ApiParam({
			name: 'student_id',
			description: 'Student ID',
			required: true,
			type: String,
		}),
		ApiOkResponse({
			description: `Regular lessons have been successfully retrieved`,
			type: [RegularLessonOutputDto],
		}),
		ApiNotFoundResponse({
			description: "Student not found",
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
