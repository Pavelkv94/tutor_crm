import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import { StudentLessonsOutputDto } from "src/modules/lesson/dto/student-lessons.output.dto";

export const GetLessonsForPeriodAndStudentSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all lessons for a period for a student",
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
		ApiParam({
			name: 'student_id',
			description: 'Student ID',
			required: true,
			type: String,
		}),
		ApiOkResponse({
			description: `Lessons have been successfully retrieved`,
			type: StudentLessonsOutputDto,
		}),
		ApiNotFoundResponse({
			description: "Student not found",
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
