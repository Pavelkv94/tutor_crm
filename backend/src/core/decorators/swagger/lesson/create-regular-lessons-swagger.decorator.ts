import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";
import { LessonOutputDto } from "src/modules/lesson/dto/lesson.output.dto";

export const CreateRegularLessonsSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Create regular lessons for a student",
		}),
		ApiCreatedResponse({
			description: `Regular lessons created successfully`,
			type: [LessonOutputDto],
		}),
		ApiBadRequestResponse({
			description: "Lesson already booked for this student at this time",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Student not found",
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
