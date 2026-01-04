import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";
import { LessonOutputDto } from "src/modules/lesson/dto/lesson.output.dto";

export const CreateRescheduledLessonSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Create a rescheduled lesson",
		}),
		ApiCreatedResponse({
			description: `Rescheduled lesson created successfully`,
			type: LessonOutputDto,
		}),
		ApiBadRequestResponse({
			description: "You are not allowed to reschedule this lesson",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Lesson not found",
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
