import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";

export const DeleteLessonSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all assigned lessons for a date for current teacher",
		}),
		ApiNoContentResponse({
			description: `Lesson has been successfully deleted`,
		}),
		ApiNotFoundResponse({
			description: "Lesson not found",
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
